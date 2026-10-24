const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://studio--tnpsc99-staging.us-central1.hosted.app/admin/current-affairs';
const BRAIN_DIR = 'C:\\Users\\shanm\\.gemini\\antigravity\\brain\\c69637cd-5589-4b23-a5ad-bd3b956527aa\\screenshots';
const LOCAL_DIR = 'c:\\Users\\shanm\\Downloads\\project\\screenshots';

async function main() {
  if (!fs.existsSync(BRAIN_DIR)) fs.mkdirSync(BRAIN_DIR, { recursive: true });
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

  console.log('Launching headless Chrome to capture:', TARGET_URL);
  const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    '--window-size=1440,1200',
    '--user-data-dir=C:\\Users\\shanm\\AppData\\Local\\Temp\\chrome_admin_ca_' + Date.now(),
    TARGET_URL
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let targets = [];
  for (let i = 0; i < 20; i++) {
    try {
      targets = await new Promise((res, rej) => {
        http.get('http://127.0.0.1:9223/json/list', r => {
          let d = '';
          r.on('data', c => d += c);
          r.on('end', () => {
            try { res(JSON.parse(d)); } catch(e) { res([]); }
          });
        }).on('error', rej);
      });
      if (targets.some(t => t.type === 'page')) break;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }

  const page = targets.find(t => t.type === 'page');
  if (!page) {
    console.error('No page target found');
    chromeProcess.kill();
    return;
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = msg => {
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
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });

  // Wait for React hydration and DOM render
  await new Promise(r => setTimeout(r, 6000));

  const textRes = await send('Runtime.evaluate', { expression: 'document.body.innerText' });
  console.log('Page Text Excerpt:\n', textRes.result?.value?.substring(0, 300));

  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(data, 'base64');
  const brainPath = path.join(BRAIN_DIR, 'admin_current_affairs_automation.png');
  const localPath = path.join(LOCAL_DIR, 'admin_current_affairs_automation.png');
  fs.writeFileSync(brainPath, buf);
  fs.writeFileSync(localPath, buf);
  console.log(`[Captured] admin_current_affairs_automation.png (${buf.length} bytes)`);

  ws.close();
  chromeProcess.kill();
}

main().catch(console.error);
