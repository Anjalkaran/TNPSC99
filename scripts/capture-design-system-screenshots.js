const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BRAIN_DIR = 'C:\\Users\\shanm\\.gemini\\antigravity\\brain\\c69637cd-5589-4b23-a5ad-bd3b956527aa\\screenshots';
const LOCAL_DIR = 'c:\\Users\\shanm\\Downloads\\project\\screenshots';

[BRAIN_DIR, LOCAL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function main() {
  console.log('Connecting to Chrome CDP on http://127.0.0.1:9222/json/list...');
  
  // Create a new target page if none exists
  let targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json/list', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });

  let page = targets.find(t => t.type === 'page');
  if (!page) {
    page = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9222/json/new', r => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => res(JSON.parse(d)));
      }).on('error', rej);
    });
  }

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
  console.log('Connected to CDP target page successfully.');

  async function saveScreenshot(filename) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(BRAIN_DIR, filename), buf);
    fs.writeFileSync(path.join(LOCAL_DIR, filename), buf);
    console.log(`✓ Saved screenshot: ${filename} (${buf.length} bytes)`);
  }

  // 1. Desktop Public Homepage
  console.log('Capturing Desktop Public Homepage (1280x900)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 2000));
  await saveScreenshot('design_01_desktop_homepage.png');

  // 2. Mobile Public Homepage
  console.log('Capturing Mobile Public Homepage (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot('design_02_mobile_homepage.png');

  // 3. Desktop Free Learning Hub (#free-hub)
  console.log('Capturing Desktop Free Learning Hub (1280x900)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/#free-hub' });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot('design_03_desktop_free_learning_hub.png');

  // 4. Mobile Free Learning Hub
  console.log('Capturing Mobile Free Learning Hub (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:3000/#free-hub' });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot('design_04_mobile_free_learning_hub.png');

  // 5. Desktop Test Preview / Mode Selection
  console.log('Capturing Desktop Test Preview / Mode Selection (1280x900)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/test-preview' });
  await new Promise(r => setTimeout(r, 2000));
  await saveScreenshot('design_05_desktop_test_preview.png');

  // 6. Mobile Test Preview
  console.log('Capturing Mobile Test Preview (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:3000/test-preview' });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot('design_06_mobile_test_preview.png');

  // 7. Desktop Phase 3C Dashboard
  console.log('Capturing Desktop Dashboard (1280x900)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/phase3c-preview' });
  await new Promise(r => setTimeout(r, 2000));
  await saveScreenshot('design_07_desktop_dashboard.png');

  // 8. Mobile Phase 3C Dashboard
  console.log('Capturing Mobile Dashboard (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:3000/phase3c-preview' });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot('design_08_mobile_dashboard.png');

  ws.close();
  console.log('All screenshots captured successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
