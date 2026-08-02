import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1300, height: 300 } });
await page.goto('http://localhost:3002/dev-preview-x', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => { document.querySelectorAll('header').forEach((el) => { el.style.display = 'none'; }); });
await page.waitForTimeout(500);
await page.screenshot({ path: '/private/tmp/claude-501/-Users-imac-Desktop-APP-visualdesign/38a885fc-3927-4485-9ea6-2d4e221d97ed/scratchpad/inspect-tabs.png' });
await browser.close();
