import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'SilvaChamo'
const GITHUB_REPO = process.env.GITHUB_REPO || 'Visualdesigne'
const VERCEL_DEPLOY_HOOK = process.env.VERCEL_DEPLOY_HOOK
const IS_LOCAL = process.env.NODE_ENV === 'development'

const ghHeaders = (): Record<string, string> => ({
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'VisualDesign-Admin',
  ...(GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {}),
})

export async function GET() {
  try {
    // When running locally, also get git status
    let localGit: any = null
    if (IS_LOCAL) {
      try {
        const cwd = process.cwd()
        const [statusOut, branchOut, logOut] = await Promise.all([
          execAsync('git status --short', { cwd }).then(r => r.stdout.trim()),
          execAsync('git rev-parse --abbrev-ref HEAD', { cwd }).then(r => r.stdout.trim()),
          execAsync('git log -1 --pretty=format:"%h %s"', { cwd }).then(r => r.stdout.trim()),
        ])
        localGit = {
          branch: branchOut,
          lastCommit: logOut,
          changedFiles: statusOut.split('\n').filter(Boolean),
          hasChanges: statusOut.trim().length > 0,
        }
      } catch { localGit = null }
    }

    const [repoRes, commitsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, { headers: ghHeaders() }),
      fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=6`, { headers: ghHeaders() }),
    ])

    const repo = repoRes.ok ? await repoRes.json() : null
    const commits = commitsRes.ok ? await commitsRes.json() : []

    return NextResponse.json({
      success: true,
      isLocal: IS_LOCAL,
      localGit,
      repo: repo ? {
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        branch: repo.default_branch,
        lastPush: repo.pushed_at,
      } : null,
      commits: Array.isArray(commits) ? commits.map((c: any) => ({
        sha: c.sha?.substring(0, 7),
        message: c.commit?.message?.split('\n')[0],
        author: c.commit?.author?.name,
        date: c.commit?.author?.date,
        url: c.html_url,
      })) : [],
      hasDeployHook: !!VERCEL_DEPLOY_HOOK,
      hasGithubToken: !!GITHUB_TOKEN,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, message } = body

    // ── LOCAL: git add + commit + push ──
    if (action === 'git-push') {
      if (!IS_LOCAL) {
        return NextResponse.json({ success: false, error: 'git push só funciona em desenvolvimento local.' }, { status: 400 })
      }
      if (!message?.trim()) {
        return NextResponse.json({ success: false, error: 'Mensagem de commit é obrigatória.' }, { status: 400 })
      }

      const cwd = process.cwd()
      const steps: string[] = []

      await execAsync('git add .', { cwd })
      steps.push('git add . → OK')

      try {
        const { stdout } = await execAsync(`git commit -m "${message.replace(/"/g, "'")}"`, { cwd })
        steps.push(`git commit → ${stdout.split('\n')[0].trim()}`)
      } catch (e: any) {
        if (e.message?.includes('nothing to commit')) {
          return NextResponse.json({ success: true, steps: ['Nada para commitar — working tree limpo.'], message: 'Sem alterações para enviar.' })
        }
        throw e
      }

      const { stdout: pushOut, stderr: pushErr } = await execAsync('git push', { cwd })
      steps.push(`git push → OK`)

      return NextResponse.json({
        success: true,
        steps,
        message: 'Commit e push realizados! Vercel vai fazer deploy automaticamente em ~1-2 min.',
        output: (pushOut + pushErr).trim(),
      })
    }

    // ── PRODUCTION: Vercel Deploy Hook ──
    if (action === 'deploy-hook') {
      if (!VERCEL_DEPLOY_HOOK) {
        return NextResponse.json({
          success: false,
          error: 'VERCEL_DEPLOY_HOOK não configurado.',
          setup: [
            '1. Vercel Dashboard → Project → Settings → Git → Deploy Hooks',
            '2. "Add Deploy Hook" → nome: admin-panel, branch: main',
            '3. Copia o URL e adiciona como env var VERCEL_DEPLOY_HOOK',
          ],
        }, { status: 400 })
      }

      const hookRes = await fetch(VERCEL_DEPLOY_HOOK, { method: 'POST' })
      if (!hookRes.ok) {
        return NextResponse.json({ success: false, error: `Deploy Hook falhou: ${hookRes.status}` }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Deploy iniciado! Vercel está a fazer deploy em ~1-2 minutos.',
        vercelDashboard: `https://vercel.com/silvachamo/${GITHUB_REPO.toLowerCase()}/deployments`,
      })
    }

    return NextResponse.json({ success: false, error: 'Acção inválida.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Verifica que o Git está configurado e o repositório tem acesso de escrita.',
    }, { status: 500 })
  }
}
