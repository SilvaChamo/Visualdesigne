// Verifica visualmente a nova etapa de comprovativo embutida no checkout,
// contra o dev server local (porta 3002).
import { chromium } from 'playwright';
import fs from 'node:fs';

const SITE = 'http://localhost:3002';
const stamp = Date.now().toString().slice(-8);
const EMAIL = `teste-verify-${stamp}@example.com`;
const PASSWORD = `TesteVerify!${stamp}`;
const DOMAIN = `teste-verify-${stamp}.com`;

console.log('Email de teste:', EMAIL);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('[page error]', err.message));
page.on('response', (res) => {
  if (res.url().includes('/api/') && res.status() >= 400) {
    console.log('[api error]', res.status(), res.url());
  }
});

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

await page.goto(`${SITE}/checkout`, { waitUntil: 'networkidle', timeout: 30000 });

await page.locator('input[type="text"]').nth(0).fill('Teste');
await page.locator('input[type="text"]').nth(1).fill('Verify');
await page.locator('input[type="email"]').first().fill(EMAIL);
await page.locator('input[type="tel"]').first().fill('841234567');
await page.locator('input[type="password"]').first().fill(PASSWORD);
await page.locator('#checkout-metodo-pagamento').selectOption('transferencia');

await page.getByRole('button', { name: /Pagar/ }).first().click();
await page.waitForSelector('text=Falta anexar o comprovativo', { timeout: 90000 }).catch((e) => console.log('[wait error]', e.message));
console.log('URL apos Pagar:', page.url());
await page.screenshot({ path: '/tmp/verify-1-upload-step.png', fullPage: true });

// Confirmar que NAO caiu no ecrã de carrinho vazio nem foi para /cliente directamente
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('mostra "Falta anexar o comprovativo"?', bodyText.includes('Falta anexar o comprovativo'));
console.log('mostra "carrinho está vazio"?', bodyText.includes('carrinho está vazio'));

// Testar reload a meio (deve recuperar o mesmo passo via ?pendingId=)
await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('text=Falta anexar o comprovativo', { timeout: 30000 }).catch(() => {});
console.log('URL apos reload:', page.url());
const bodyAfterReload = await page.evaluate(() => document.body.innerText);
console.log('apos reload mostra "Falta anexar o comprovativo"?', bodyAfterReload.includes('Falta anexar o comprovativo'));
await page.screenshot({ path: '/tmp/verify-2-apos-reload.png', fullPage: true });

// Anexar o comprovativo (ficheiro de teste)
const testFile = '/tmp/verify-comprovativo-teste.png';
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
fs.writeFileSync(testFile, png1x1);
await page.locator('input[type="file"]').setInputFiles(testFile, { timeout: 45000 });
await page.getByRole('button', { name: 'Enviar comprovativo' }).click();
await page.waitForSelector('text=Comprovativo enviado com sucesso', { timeout: 20000 }).catch(() => {});
const bodyAfterUpload = await page.evaluate(() => document.body.innerText);
console.log('mostra "Comprovativo enviado com sucesso"?', bodyAfterUpload.includes('Comprovativo enviado com sucesso'));
await page.screenshot({ path: '/tmp/verify-3-sucesso.png', fullPage: true });

// Clicar "Aceder ao Painel"
await page.getByRole('button', { name: /Aceder ao Painel/ }).click();
await page.waitForTimeout(4000);
console.log('URL apos Aceder ao Painel:', page.url());
await page.screenshot({ path: '/tmp/verify-4-painel.png', fullPage: true });
const painelText = await page.evaluate(() => document.body.innerText);
console.log('painel mostra "Pedidos Pendentes"?', painelText.includes('Pedidos Pendentes'));
console.log('painel mostra "Comprovativo enviado — a aguardar"?', painelText.includes('a aguardar confirmação'));

await browser.close();
console.log('\nEmail usado:', EMAIL);
