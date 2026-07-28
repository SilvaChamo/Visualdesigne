import { NextRequest, NextResponse } from 'next/server'
import * as ImapFlow from 'imapflow'
import { getServerHost, getHestiaUrl } from '@/lib/server-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gmailUser, gmailAppPassword, destinationEmail, destinationPassword } = body

    // Validação dos parâmetros
    if (!gmailUser || !gmailAppPassword || !destinationEmail || !destinationPassword) {
      return NextResponse.json({ 
        error: 'Todos os campos são obrigatórios: gmailUser, gmailAppPassword, destinationEmail, destinationPassword' 
      }, { status: 400 })
    }

    // Configuração IMAP Gmail
    const gmailConfig = {
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      },
      logger: false,
      // Importação copia muitas mensagens, algumas grandes — timeout generoso
      // em vez do costume (12s), para não abortar a meio de um fetch/append legítimo.
      socketTimeout: 60000,
      greetingTimeout: 15000,
    }

    // Configuração IMAP servidor (servidor próprio)
    const destConfig = {
      host: getServerHost(), // IP do servidor servidor
      port: 993,
      secure: true,
      auth: {
        user: destinationEmail,
        pass: destinationPassword
      },
      logger: false,
      socketTimeout: 60000,
      greetingTimeout: 15000,
    }

    // Mapeamento de pastas Gmail → servidor
    const folderMapping: Record<string, string> = {
      'INBOX': 'INBOX',
      '[Gmail]/Sent Mail': 'Sent',
      '[Gmail]/Drafts': 'Drafts',
      '[Gmail]/Spam': 'Junk',
      '[Gmail]/Trash': 'Trash',
      '[Gmail]/All Mail': 'Archive'
    }

    let totalMessages = 0
    let copiedMessages = 0
    let errors = []
    let currentFolder = ''

    try {
      // Conectar ao Gmail
      const gmailClient = new ImapFlow.ImapFlow(gmailConfig as any)
      // Sem isto, um erro tardio no socket (ex.: timeout a meio da cópia de
      // mensagens, que aqui demora — muitas mensagens, algumas grandes) derruba
      // o processo Node inteiro e tira o site do ar para todos os utilizadores.
      gmailClient.on('error', (err: unknown) => console.error('📧 [email-import] erro tardio no socket (Gmail):', err))
      await gmailClient.connect()

      // Conectar ao servidor
      const destClient = new ImapFlow.ImapFlow(destConfig as any)
      destClient.on('error', (err: unknown) => console.error('📧 [email-import] erro tardio no socket (destino):', err))
      await destClient.connect()

      // Listar pastas do Gmail
      const gmailFolders = await gmailClient.list()
      const foldersToImport = Object.keys(folderMapping).filter(folder => 
        gmailFolders.some((f: any) => f.path === folder)
      )

      // Para cada pasta, copiar mensagens
      for (const gmailFolder of foldersToImport) {
        currentFolder = gmailFolder
        const destFolder = folderMapping[gmailFolder]

        try {
          // Seleccionar pasta no Gmail
          await gmailClient.mailboxOpen(gmailFolder)
          const messages = await gmailClient.search({ seen: false })
          
          if (Array.isArray(messages)) {
            totalMessages += messages.length

            // Garantir que pasta existe no destino
            try {
              await destClient.mailboxCreate(destFolder)
            } catch (e) {
              // Pasta pode já existir
            }

            // Seleccionar pasta no servidor
            await destClient.mailboxOpen(destFolder)

            // Copiar cada mensagem
            for (const uid of messages) {
              try {
                const messageData = await gmailClient.fetchOne(uid, { source: true })
                if (messageData && typeof messageData === 'object' && 'source' in messageData) {
                  const source = (messageData as any).source
                  if (source) {
                    await destClient.append(source, destFolder, ['\\Seen'])
                    copiedMessages++
                  }
                }
              } catch (msgError) {
                errors.push(`Erro ao copiar mensagem ${uid} da pasta ${gmailFolder}: ${msgError}`)
              }
            }
          }
        } catch (folderError) {
          errors.push(`Erro ao processar pasta ${gmailFolder}: ${folderError}`)
        }
      }

      // Fechar conexões
      await gmailClient.logout()
      await destClient.logout()

    } catch (connectionError: any) {
      return NextResponse.json({ 
        error: `Erro de conexão: ${connectionError?.message || connectionError}`,
        details: connectionError
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      total: totalMessages,
      copied: copiedMessages,
      errors: errors,
      currentFolder: currentFolder,
      message: `Importação concluída! ${copiedMessages} de ${totalMessages} mensagens copiadas.`
    })

  } catch (error: any) {
    console.error('Email import error:', error)
    return NextResponse.json({ 
      error: error?.message || 'Erro desconhecido durante importação',
      details: error
    }, { status: 500 })
  }
}
