// Rede de segurança global: um erro tardio não apanhado num socket (SMTP, IMAP,
// DirectAdmin, etc.) chega como 'uncaughtException'/'unhandledRejection' ao
// processo Node e, sem isto, derruba o servidor inteiro — o site fica em baixo
// para todos os utilizadores a meio de outros pedidos, até o pm2 reiniciar.
// Isto não substitui corrigir a causa (ver smtp-mail.ts e imap-panel-shared.ts
// para exemplos já corrigidos) — é só a última linha de defesa contra o mesmo
// tipo de bug em código que ainda não tenhamos apanhado.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  process.on('uncaughtException', (err) => {
    console.error('[instrumentation] uncaughtException — processo mantido vivo:', err)
  })

  process.on('unhandledRejection', (reason) => {
    console.error('[instrumentation] unhandledRejection — processo mantido vivo:', reason)
  })
}
