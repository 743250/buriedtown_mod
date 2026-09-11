const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--ignore-certificate-errors', '--host-resolver-rules=MAP appassets.androidplatform.net 127.0.0.1:18443']
  });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  await page.goto('https://appassets.androidplatform.net/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(15000);
  // 1. 去 Settings 看难度选择
  await page.evaluate(() => { location.hash = '#/settings'; });
  await page.waitForTimeout(1500);
  const settingsText = await page.evaluate(() => (document.body.innerText || ''));
  console.log('Settings 有 AI难度:', settingsText.includes('AI难度'));
  console.log('Settings 有 AI Plays:', settingsText.includes('AI Plays Black') && settingsText.includes('AI Plays White'));
  // 2. 点右上角消息按钮，看消息面板
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(1000);
  const clicked = await page.evaluate(() => {
    const a = document.querySelector('a.needsclick');
    if (a) { a.click(); return true; }
    return false;
  });
  await page.waitForTimeout(1000);
  const drawerText = await page.evaluate(() => (document.body.innerText || ''));
  console.log('消息面板点开:', clicked, '| 标题"引擎状态":', drawerText.includes('引擎状态'));
  console.log('消息面板无技术消息(Engine:/build):', !drawerText.includes('Engine: /build'));
  await browser.close();
})().catch(e => { console.error('失败:', e.message); process.exit(1); });
