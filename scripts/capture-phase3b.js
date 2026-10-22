const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BRAIN_DIR = 'C:\\Users\\shanm\\.gemini\\antigravity\\brain\\c69637cd-5589-4b23-a5ad-bd3b956527aa\\screenshots';
const LOCAL_DIR = 'c:\\Users\\shanm\\Downloads\\project\\TNPSC99_Phase3B_Review';
const USER_DIR = 'C:\\Users\\shanm\\Downloads\\TNPSC99_Phase3B_Review';

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

  async function saveScreenshot(filename, clip = null) {
    const params = { format: 'png' };
    if (clip) params.clip = clip;
    const { data } = await send('Page.captureScreenshot', params);
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(BRAIN_DIR, filename), buf);
    fs.writeFileSync(path.join(LOCAL_DIR, filename), buf);
    fs.writeFileSync(path.join(USER_DIR, filename), buf);
    console.log(`Saved screenshot: ${filename} (${buf.length} bytes)`);
  }

  // 1. Desktop Mode Selection Dialog
  console.log('1. Capturing Desktop Mode Selection Dialog (1280x800)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/test-preview' });
  await new Promise(r => setTimeout(r, 2000));
  await saveScreenshot('phase3b_01_mode_selection_desktop.png');

  // 2. Mobile Mode Selection Dialog
  console.log('2. Capturing Mobile Mode Selection Dialog (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot('phase3b_02_mode_selection_mobile.png');

  // 3. Desktop Practice Mode: Launch & Answer
  console.log('3. Capturing Desktop Practice Mode with Immediate Feedback & Explanation...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  // Click Practice Mode
  await send('Runtime.evaluate', { expression: `
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Start Practice Mode'));
    if (btn) btn.click();
  ` });
  await new Promise(r => setTimeout(r, 1500));

  // Select Option B (பெயர்ச்சொல்) on Question 1
  await send('Runtime.evaluate', { expression: `
    const btns = Array.from(document.querySelectorAll('button'));
    const opt = btns.find(b => b.innerText.includes('பெயர்ச்சொல்'));
    if (opt) opt.click();
  ` });
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot('phase3b_03_practice_feedback_desktop.png');

  // 4. Mobile Practice Mode Answered
  console.log('4. Capturing Mobile Practice Mode (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot('phase3b_04_practice_feedback_mobile.png');

  // 5. Desktop Inline Textbook Reference Drawer
  console.log('5. Capturing Textbook Reference Drawer (Desktop 1280x800)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Runtime.evaluate', { expression: `
    const refBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('View Textbook Reference'));
    if (refBtn) refBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 2000));
  await saveScreenshot('phase3b_05_textbook_reference_drawer_desktop.png');

  // Close Reference Drawer
  await send('Runtime.evaluate', { expression: `
    const closeBtn = document.querySelector('button[aria-label="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Close') || b.querySelector('svg.lucide-x'));
    if (closeBtn) closeBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 1000));

  // 6. Exam Mode: Reload to Start Clean Exam
  console.log('6. Capturing Desktop Exam Mode with Countdown Timer & Question Palette...');
  await send('Page.navigate', { url: 'http://localhost:3000/test-preview' });
  await new Promise(r => setTimeout(r, 2000));
  // Click Start Exam Mode
  await send('Runtime.evaluate', { expression: `
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Start Exam Mode'));
    if (btn) btn.click();
  ` });
  await new Promise(r => setTimeout(r, 1500));

  // Mark Question 1 for Review and answer it
  await send('Runtime.evaluate', { expression: `
    const btns = Array.from(document.querySelectorAll('button'));
    const markBtn = btns.find(b => b.innerText.includes('Mark for Review'));
    if (markBtn) markBtn.click();
    const opt = btns.find(b => b.innerText.includes('பெயர்ச்சொல்'));
    if (opt) opt.click();
  ` });
  await new Promise(r => setTimeout(r, 1000));
  // Navigate to Question 2 and select an answer
  await send('Runtime.evaluate', { expression: `
    const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Next'));
    if (nextBtn) nextBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 800));
  await send('Runtime.evaluate', { expression: `
    const btns = Array.from(document.querySelectorAll('button'));
    const opt = btns.find(b => b.innerText.includes('இடைச்சொல்') || b.innerText.includes('A.'));
    if (opt) opt.click();
  ` });
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot('phase3b_06_exam_palette_desktop.png');

  // 7. Mobile Exam Mode with Question Palette Drawer
  console.log('7. Capturing Mobile Exam Mode & Palette Drawer (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 800));
  // Open Palette Drawer
  await send('Runtime.evaluate', { expression: `
    const paletteBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Palette'));
    if (paletteBtn) paletteBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 1500));
  await saveScreenshot('phase3b_07_exam_palette_mobile.png');

  // Close Palette Drawer
  await send('Runtime.evaluate', { expression: `
    const closeBtn = document.querySelector('button[aria-label="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Close') || b.querySelector('svg.lucide-x'));
    if (closeBtn) closeBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 800));

  // 8. Submit Confirmation Dialog
  console.log('8. Capturing Submit Confirmation Dialog...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Runtime.evaluate', { expression: `
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Submit Test'));
    if (submitBtn) submitBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 1200));
  await saveScreenshot('phase3b_08_submit_dialog_desktop.png');

  // 9. Confirm Submission & Capture Results Dashboard
  console.log('9. Confirming Submission & Capturing Results Dashboard (Desktop 1280x800)...');
  await send('Runtime.evaluate', { expression: `
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Yes, Submit'));
    if (confirmBtn) confirmBtn.click();
  ` });
  await new Promise(r => setTimeout(r, 2000));
  await saveScreenshot('phase3b_09_results_dashboard_desktop.png');

  // 10. Mobile Results Dashboard
  console.log('10. Capturing Mobile Results Dashboard (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await new Promise(r => setTimeout(r, 1000));
  await saveScreenshot('phase3b_10_results_dashboard_mobile.png');

  ws.close();
  console.log('ALL PHASE 3B SCREENSHOTS SUCCESSFULLY CAPTURED!');
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
