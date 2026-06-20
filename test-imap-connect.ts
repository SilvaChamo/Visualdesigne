import { config } from 'dotenv';
config({ path: '.env.local' });
import { connectImapClient } from './src/lib/imap-panel-shared';

async function test() {
  const client = await connectImapClient('silva.chamo@visualdesignmoz.com', '***REMOVIDO***');
  if (client) {
    console.log("IMAP Conectado!");
    await client.logout();
  } else {
    console.log("Falha ao conectar.");
  }
}
test().catch(console.error);
