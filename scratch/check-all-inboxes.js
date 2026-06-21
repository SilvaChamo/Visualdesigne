const { ImapFlow } = require('imapflow');

const accounts = [
  { email: 'geral@aamihe.com', pass: '***REMOVIDO***' },
  { email: 'noreply@aamihe.com', pass: '***REMOVIDO***' },
  { email: 'affiliead@visualdesignmoz.com', pass: '***REMOVIDO***' },
  { email: 'geral@visualdesignmoz.com', pass: '***REMOVIDO***' },
  { email: 'info@visualdesignmoz.com', pass: '***REMOVIDO***' },
  { email: 'invite@visualdesignmoz.com', pass: '***REMOVIDO***' },
  { email: 'noreply@visualdesignmoz.com', pass: '***REMOVIDO***' },
  { email: 'servidor@visualdesignmoz.com', pass: '***REMOVIDO***' },
  { email: 'silva.chamo@visualdesignmoz.com', pass: '***REMOVIDO***' },
  { email: 'suporte@visualdesignmoz.com', pass: '***REMOVIDO***' }
];

async function check(acc) {
  const client = new ImapFlow({
    host: '37.27.17.25',
    port: 993,
    secure: true,
    auth: { user: acc.email, pass: acc.pass },
    tls: { rejectUnauthorized: false },
    logger: false
  });
  try {
    await client.connect();
    const status = await client.status('INBOX', { messages: true, unseen: true });
    console.log(`[${acc.email}] INBOX Messages: ${status.messages} | Unseen: ${status.unseen}`);
    await client.logout();
  } catch(e) {
    console.error(`[${acc.email}] Connection failed:`, e.message);
  }
}

async function run() {
  for (const acc of accounts) {
    await check(acc);
  }
}
run();
