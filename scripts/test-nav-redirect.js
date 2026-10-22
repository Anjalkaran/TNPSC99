const http = require('http');
const WebSocket = require('ws');

async function testNavigation() {
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9222/json/list', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  const send = (method, params = {}) => new Promise((resolve) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (msg) => {
      const data = JSON.parse(msg);
      if (data.id === id) {
        ws.removeListener('message', handler);
        resolve(data.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => ws.on('open', r));

  console.log('--- TEST 1: Protected Route /dashboard Redirects to /login ---');
  await send('Page.navigate', { url: 'http://localhost:3000/dashboard' });
  await new Promise(r => setTimeout(r, 2500));
  const res1 = await send('Runtime.evaluate', { expression: 'location.href' });
  console.log('Result for /dashboard:', res1.result.value);

  console.log('--- TEST 2: Public Route /subscription Loads Without Redirect ---');
  await send('Page.navigate', { url: 'http://localhost:3000/subscription' });
  await new Promise(r => setTimeout(r, 2500));
  const res2 = await send('Runtime.evaluate', { expression: 'location.href' });
  console.log('Result for /subscription:', res2.result.value);

  console.log('--- TEST 3: Click Subscribe on /subscription Redirects to /login?redirect=/subscription ---');
  await send('Runtime.evaluate', { expression: `
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Subscribe Now'));
    if (btn) btn.click();
  ` });
  await new Promise(r => setTimeout(r, 1500));
  const res3 = await send('Runtime.evaluate', { expression: 'location.href' });
  console.log('Result after clicking subscribe as guest:', res3.result.value);

  console.log('--- TEST 4: Mobile Viewport 390px Navigation ---');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 2000));
  const res4 = await send('Runtime.evaluate', { expression: 'JSON.stringify({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, hasOverflow: document.documentElement.scrollWidth > window.innerWidth })' });
  console.log('Mobile 390px overflow check:', res4.result.value);

  console.log('--- TEST 5: Tablet Viewport 768px Navigation ---');
  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 2000));
  const res5 = await send('Runtime.evaluate', { expression: 'JSON.stringify({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, hasOverflow: document.documentElement.scrollWidth > window.innerWidth })' });
  console.log('Tablet 768px overflow check:', res5.result.value);

  console.log('--- TEST 6: Desktop Viewport 1280px Navigation ---');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 2000));
  const res6 = await send('Runtime.evaluate', { expression: 'JSON.stringify({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, hasOverflow: document.documentElement.scrollWidth > window.innerWidth })' });
  console.log('Desktop 1280px overflow check:', res6.result.value);

  ws.close();
}

testNavigation().catch(console.error);
