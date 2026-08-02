import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3002/dev-preview-x', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: '/private/tmp/claude-501/-Users-imac-Desktop-APP-visualdesign/2be2573b-6a8e-4beb-b6ab-abeaac90f528/scratchpad/vd-compose-resized.png' });
