import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { ImapFlow } from 'imapflow'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const { decryptStoredPassword } = await import('../src/lib/panel-access-credentials.ts')
const { resolveImapConfig } = await import('../src/lib/imap-panel-shared.ts')

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const targets = process.argv.slice(2)
if (targets.length === 0) {
  console.error('Uso: node scratch/diag-imap-accounts.mjs email1 [email2 ...]')
  process.exit(1)
}

for (const email of targets) {
  console.log(`\n=== ${email} ===`)
  const { data: conta, error } = await supabaseAdmin
    .from('email_contas')
    .select('email, senha_servidor, status, cliente_id, updated_at')
    .eq('email', email)
    .maybeSingle()

  if (error) { console.log('Erro Supabase:', error.message); continue }
  if (!conta) { console.log('Sem registo em email_contas.'); continue }
  console.log('status:', conta.status, '| updated_at:', conta.updated_at, '| cliente_id:', conta.cliente_id)
  if (!conta.senha_servidor) { console.log('senha_servidor está VAZIO na base de dados.'); continue }
  console.log('senha_servidor (raw, primeiros 12 chars):', String(conta.senha_servidor).slice(0, 12) + '...')

  let pass
  try {
    pass = decryptStoredPassword(conta.senha_servidor)
    console.log('descodificação ok, tamanho da password:', pass.length)
  } catch (e) {
    console.log('Falha ao descodificar senha_servidor:', e.message)
    continue
  }

  const cfg = resolveImapConfig(email)
  console.log('host IMAP resolvido:', cfg.host, cfg.port)

  const client = new ImapFlow({
    host: cfg.host,
    port: 993,
    secure: true,
    auth: { user: email, pass },
    tls: { rejectUnauthorized: false },
    logger: false,
    socketTimeout: 12000,
    greetingTimeout: 8000,
  })
  client.on('error', () => {})
  try {
    await client.connect()
    console.log('LIGACAO IMAP OK')
    await client.logout()
  } catch (e) {
    console.log('LIGACAO IMAP FALHOU:', e?.message || e)
    if (e?.response) console.log('   resposta servidor:', e.response)
  }
}
