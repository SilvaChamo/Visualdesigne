import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1300, height: 300 } });
await page.goto('http://localhost:3002/dev-preview-x', { waitUntil: 'load', timeout: 45000 });
await page.evaluate(() => { document.querySelectorAll('header').forEach((el) => { el.style.display = 'none'; }); });
await page.waitForTimeout(300);

const result = await page.evaluate(() => {
  const bar = document.querySelector('button')?.closest('div')?.parentElement; // outer bar div
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Todas');
  const nav = document.querySelector('nav');
  const navFirstBtn = nav?.querySelector('button');
  const rect = (el) => el ? el.getBoundingClientRect() : null;
  return {
    outerBarRect: rect(document.querySelector('.overflow-x-auto')),
    tabButtonRect: rect(btn),
    navRect: rect(nav),
    navFirstBtnRect: rect(navFirstBtn),
  };
});
console.log(JSON.stringify(result, null, 2));
await browser.close();
