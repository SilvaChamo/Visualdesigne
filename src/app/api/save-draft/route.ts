import { NextRequest, NextResponse } from 'next/server'
import { connectImapClient, getCachedFolderList, resolveFolder } from '@/lib/imap-panel-shared'

export async function POST(req: NextRequest) {
  let client: Awaited<ReturnType<typeof connectImapClient>> = null
  try {
    const { email, password, to, cc, bcc, subject, html } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Credenciais em falta' }, { status: 400 })
    }

    client = await connectImapClient(email, password)
    if (!client) {
      return NextResponse.json({ error: 'Falha na ligação IMAP.' }, { status: 502 })
    }

    const folderList = await getCachedFolderList(client, email)
    const draftsFolder = resolveFolder('drafts', folderList) || 'Drafts'

    const mensagem = [
      `From: ${email}`,
      `To: ${to || ''}`,
      cc ? `Cc: ${cc}` : null,
      bcc ? `Bcc: ${bcc}` : null,
      `Subject: ${subject || '(sem assunto)'}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html || '',
    ]
      .filter((line) => line !== null)
      .join('\r\n')

    await client.append(draftsFolder, mensagem, ['\\Draft', '\\Seen'])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    if (client) {
      try {
        await client.logout()
      } catch {
        /* ignore */
      }
    }
  }
}
