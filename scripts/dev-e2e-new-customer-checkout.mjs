// Testa o cenário exacto que o utilizador descreveu: cliente NUNCA visto
// antes, preenche o checkout (dados da conta + hospedagem) sem estar
// logado, e deve conseguir concluir sem nenhuma paragem a pedir login.
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import fs from 'node:fs';

const SITE = 'https://teste.visualdesignmoz.com';
const env = fs.readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || '';
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'));

const stamp = Date.now().toString().slice(-8);
const EMAIL = `cliente-novo-teste-${stamp}@visualdesignmoz.com`;
const PASSWORD = `ClienteNovo!${stamp}`;
const DOMAIN = `teste-cliente-novo-${stamp}.com`;

console.log('Email de teste (nunca existiu):', EMAIL);

// Confirmar mesmo que não existe, antes de começar
const { data: usersList } = await admin.auth.admin.listUsers();
const already = usersList.users.find((u) => (u.email || '').toLowerCase() === EMAIL.toLowerCase());
console.log('confirmação: email já existe?', already ? 'SIM (nao deveria!)' : 'não, é genuinamente novo');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') console.log('[console error]', msg.text()); });

const cartItem = {
  id: 'hosting-basico',
  type: 'hosting',
  name: 'Hospedagem Básico',
  price: 680,
  period: 1,
  hostingDomain: DOMAIN,
};

await page.addInitScript((item) => {
  window.localStorage.setItem('vd_cart', JSON.stringify([item]));
}, cartItem);

await page.goto(`${SITE}/checkout`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
console.log('URL apos ir a /checkout:', page.url());
await page.screenshot({ path: '/tmp/novo-cliente-1-checkout.png', fullPage: true });

await page.waitForTimeout(3000);
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('texto visivel na pagina:', JSON.stringify(bodyText.slice(0, 800)));
await page.screenshot({ path: '/tmp/novo-cliente-1b-checkout-wait.png', fullPage: true });

await browser.close();
console.log('\nEmail usado (para limpar depois se necessario):', EMAIL);
