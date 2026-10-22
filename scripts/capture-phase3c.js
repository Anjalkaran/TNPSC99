const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BRAIN_DIR = 'C:\\Users\\shanm\\.gemini\\antigravity\\brain\\c69637cd-5589-4b23-a5ad-bd3b956527aa\\screenshots';
const LOCAL_DIR = 'c:\\Users\\shanm\\Downloads\\project\\TNPSC99_Phase3C_Review';
const USER_DIR = 'C:\\Users\\shanm\\Downloads\\TNPSC99_Phase3C_Review';

[BRAIN_DIR, LOCAL_DIR, USER_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function main() {
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json/list', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (msg) => {
      const data = JSON.parse(msg);
      if (data.id === id) {
        ws.removeListener('message', handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => ws.on('open', r));

  async function saveScreenshot(filename) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(BRAIN_DIR, filename), buf);
    fs.writeFileSync(path.join(LOCAL_DIR, filename), buf);
    fs.writeFileSync(path.join(USER_DIR, filename), buf);
    console.log(`Saved screenshot: ${filename} (${buf.length} bytes)`);
  }

  // 1. Desktop Student Dashboard (1280x800)
  console.log('1. Capturing Desktop Student Dashboard...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/phase3c-preview' });
  await new Promise(r => setTimeout(r, 2500));
  await saveScreenshot('phase3c_01_dashboard_desktop.png');

  // 2. Mobile Student Dashboard (390x844)
  console.log('2. Capturing Mobile Student Dashboard...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot('phase3c_02_dashboard_mobile.png');

  // 3. Desktop Mistake Vault (1280x800)
  console.log('3. Capturing Desktop Mistake Vault...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Runtime.evaluate', { expression: `
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Mistake Vault'));
    if (btn) btn.click();
  ` });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot('phase3c_03_mistake_vault_desktop.png');

  // 4. Mobile Mistake Vault (390x844)
  console.log('4. Capturing Mobile Mistake Vault...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot('phase3c_04_mistake_vault_mobile.png');

  // 5. Desktop Revision Engine (1280x800)
  console.log('5. Capturing Desktop Revision Engine...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Runtime.evaluate', { expression: `
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Revision Test'));
    if (btn) btn.click();
  ` });
  await new Promise(r => setTimeout(r, 1500));
  // Pick Practice Mode inside the Mode Select modal
  await send('Runtime.evaluate', { expression: `
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Practice Mode'));
    if (btn) btn.click();
  ` });
  await new Promise(r => setTimeout(r, 1200));
  await saveScreenshot('phase3c_05_revision_engine_desktop.png');

  // 6. Mobile Revision Engine (390x844)
  console.log('6. Capturing Mobile Revision Engine...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot('phase3c_06_revision_engine_mobile.png');

  ws.close();
  console.log('ALL PHASE 3C SCREENSHOTS SUCCESSFULLY CAPTURED!');
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
