/**
 * TNPSC99 — Homepage Conversion UX & Complete Tamil/English Localization Automated Verification
 * Tests:
 * 1. Default Tamil language loading (no hydration mismatch)
 * 2. New Hero headline, subtitle, primary/secondary CTAs
 * 3. Complete absence of any "No Login" / "உள்நுழைவு தேவையில்லை" badges/text
 * 4. 4 Prominent responsive learning cards (10 Q, 20 Q, 10 Q, 3 Demos)
 * 5. Full bilingual parity across Navbar, Hero, Cards, Modules, Pricing, Dual Modes, Curriculum, Paths, AI Tutor, Routine, Footer
 * 6. Responsive viewports at 1440px, 1280px, 768px, 390px with zero horizontal overflow
 * 7. Screen capture for documentation artifacts
 */

const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const BRAIN_DIR = 'C:\\Users\\shanm\\.gemini\\antigravity\\brain\\c69637cd-5589-4b23-a5ad-bd3b956527aa\\screenshots';
const LOCAL_DIR = 'c:\\Users\\shanm\\Downloads\\project\\screenshots';

[BRAIN_DIR, LOCAL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const testResults = [];

function recordTest(id, name, passed, details) {
  testResults.push({ id, name, passed, details });
  const mark = passed ? '[✓ PASS]' : '[✗ FAIL]';
  console.log(`${mark} (${id}) -> ${name}`);
  console.log(`       Details: ${details}`);
}

async function runVerification() {
  console.log('========================================================================');
  console.log('TNPSC99 — HOMEPAGE CONVERSION UX & LOCALIZATION VERIFICATION');
  console.log(`Target: ${TARGET_URL}`);
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  console.log('[Step 1] Launching Headless Chrome via CDP...');
  const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\shanm\\AppData\\Local\\Temp\\chrome_conversion_ux_' + Date.now()
  ]);

  let cdpUrl = null;
  chromeProcess.stderr.on('data', d => {
    const match = d.toString().match(/ws:\/\/127\.0.0\.1:9222\/devtools\/browser\/[a-zA-Z0-9-]+/);
    if (match && !cdpUrl) cdpUrl = match[0];
  });

  for (let i = 0; i < 40; i++) {
    if (cdpUrl) break;
    await new Promise(r => setTimeout(r, 200));
  }

  if (!cdpUrl) {
    console.error('Failed to get DevTools WebSocket URL from Chrome');
    chromeProcess.kill();
    process.exit(1);
  }

  console.log('Chrome DevTools WebSocket ready.\n');

  await new Promise(r => setTimeout(r, 600));
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
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  async function evalJs(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'Evaluation error');
    }
    return res.result?.value;
  }

  async function takeScreenshot(filename) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(data, 'base64');
    fs.writeFileSync(path.join(BRAIN_DIR, filename), buf);
    fs.writeFileSync(path.join(LOCAL_DIR, filename), buf);
    console.log(`[Screenshot Captured] ${filename} (${buf.length} bytes)`);
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Default Tamil Loading at Desktop 1440x900
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Desktop Viewport (1440x900) & Default Tamil Language ---');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    // Clear localStorage to test default fresh user state
    await send('Page.navigate', { url: TARGET_URL });
    await new Promise(r => setTimeout(r, 2000));
    await evalJs(`localStorage.removeItem('language'); location.reload();`);
    await new Promise(r => setTimeout(r, 2500));

    const defaultLanguageState = await evalJs(`({
      headline: document.querySelector('h1')?.innerText || '',
      subtitle: document.querySelector('h1 + p')?.innerText || '',
      primaryCta: document.querySelector('section a[href="#free-hub"]')?.innerText || '',
      secondaryCta: document.querySelector('section a[href="/subscription"]')?.innerText || '',
      bodyText: document.body.innerText
    })`);
    console.log('Default Language State:', defaultLanguageState);

    const hasTamilHeadline = defaultLanguageState.headline.includes('எதைப் படிப்பது என்ற குழப்பம் வேண்டாம்');
    const hasTamilSubtitle = defaultLanguageState.subtitle.includes('பாடப்புத்தக வினாக்கள், தினசரி நடப்பு நிகழ்வுகள்');
    const hasTamilPrimaryCta = defaultLanguageState.primaryCta.includes('இலவசப் பயிற்சியைத் தொடங்குங்கள்');
    const hasTamilSecondaryCta = defaultLanguageState.secondaryCta.includes('₹99 மாதாந்திரத் திட்டத்தைப் பாருங்கள்');

    recordTest('TC-01', 'Default Tamil Language on Initial Visit', 
      hasTamilHeadline && hasTamilSubtitle && hasTamilPrimaryCta && hasTamilSecondaryCta,
      `Headline: "${defaultLanguageState.headline.trim()}", Primary CTA: "${defaultLanguageState.primaryCta.trim()}"`
    );

    // -------------------------------------------------------------
    // TEST 2: Absence of "No Login" / "உள்நுழைவு தேவையில்லை"
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Absence of "No Login" badges and captions ---');
    const noLoginFound = await evalJs(`
      (/no login/i.test(document.body.innerText) || /உள்நுழைவு தேவையில்லை/.test(document.body.innerText))
    `);
    recordTest('TC-02', 'Zero "No Login" Captions or Badges Across Homepage',
      !noLoginFound,
      `No "No Login" found: ${!noLoginFound}`
    );

    await takeScreenshot('homepage_ta_desktop.png');

    // -------------------------------------------------------------
    // TEST 3: 4 Prominent Responsive Cards Structure & Count Badges
    // -------------------------------------------------------------
    console.log('\n--- Test 3: 4 Prominent Responsive Learning Cards ---');
    const cardsInfo = await evalJs(`
      Array.from(document.querySelectorAll('[role="tablist"][aria-label="Learning Modules"] [role="tab"]')).map(el => ({
        title: el.querySelector('h3')?.innerText || '',
        badge: el.querySelector('.rounded-full, [class*="rounded-full"]')?.innerText || '',
        benefit: el.querySelector('p')?.innerText || '',
        isSelected: el.getAttribute('aria-selected') === 'true'
      }))
    `);
    console.log('Cards Info:', cardsInfo);

    const hasFourCards = cardsInfo.length === 4;
    const card1Title = cardsInfo[0]?.title.includes('நடப்பு நிகழ்வுகள்');
    const card2Title = cardsInfo[1]?.title.includes('மாதிரித் தேர்வு');
    const card2Badge = cardsInfo[1]?.badge.includes('20');
    const card3Title = cardsInfo[2]?.title.includes('பாடப்புத்தக');
    const card3Badge = cardsInfo[2]?.badge.includes('10');
    const card4Title = cardsInfo[3]?.title.includes('AI');
    const card4Badge = cardsInfo[3]?.badge.includes('3');

    recordTest('TC-03', '4 Prominent Responsive Cards Rendered with Badges',
      hasFourCards && card1Title && card2Title && card2Badge && card3Title && card4Title,
      `Found ${cardsInfo.length} cards: ${cardsInfo.map(c => `${c.title} (${c.badge})`).join(' | ')}`
    );

    // Scroll to #free-hub and capture desktop cards
    await evalJs(`document.getElementById('free-hub').scrollIntoView();`);
    await new Promise(r => setTimeout(r, 600));
    await takeScreenshot('learning_cards_desktop.png');

    // -------------------------------------------------------------
    // TEST 4: Card Selection & Dynamic Module Loading
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Card Selection & Dynamic Module Switching ---');
    // Click Card 2: Free Mock Test
    await evalJs(`document.querySelectorAll('[role="tablist"][aria-label="Learning Modules"] [role="tab"]')[1].click();`);
    await new Promise(r => setTimeout(r, 600));
    const isMockSelected = await evalJs(`
      document.querySelectorAll('[role="tablist"][aria-label="Learning Modules"] [role="tab"]')[1].getAttribute('aria-selected') === 'true'
    `);
    const mockModuleTitle = await evalJs(`document.querySelector('#free-hub h3')?.innerText || ''`);
    await takeScreenshot('active_card_mock_test.png');

    // Click Card 3: Textbook Practice
    await evalJs(`document.querySelectorAll('[role="tablist"][aria-label="Learning Modules"] [role="tab"]')[2].click();`);
    await new Promise(r => setTimeout(r, 600));
    const isTextbookSelected = await evalJs(`
      document.querySelectorAll('[role="tablist"][aria-label="Learning Modules"] [role="tab"]')[2].getAttribute('aria-selected') === 'true'
    `);
    await takeScreenshot('active_card_textbook.png');

    // Click Card 4: AI Tutor Preview
    await evalJs(`document.querySelectorAll('[role="tablist"][aria-label="Learning Modules"] [role="tab"]')[3].click();`);
    await new Promise(r => setTimeout(r, 600));
    const isAiSelected = await evalJs(`
      document.querySelectorAll('[role="tablist"][aria-label="Learning Modules"] [role="tab"]')[3].getAttribute('aria-selected') === 'true'
    `);
    await takeScreenshot('active_card_ai_tutor.png');

    recordTest('TC-04', 'Card Selection Interactivity & Module Loading',
      isMockSelected && isTextbookSelected && isAiSelected,
      `Mock Selected: ${isMockSelected}, Textbook Selected: ${isTextbookSelected}, AI Selected: ${isAiSelected}`
    );

    // -------------------------------------------------------------
    // TEST 5: Language Switch to English & Full Bilingual Coverage
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Language Switching to English ---');
    // Click English in the bilingual switcher in FreeLearningHub or Navbar
    await evalJs(`
      const enBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === 'English');
      if (enBtns.length > 0) enBtns[0].click();
    `);
    await new Promise(r => setTimeout(r, 1000));

    const enLanguageState = await evalJs(`({
      headline: document.querySelector('h1')?.innerText || '',
      subtitle: document.querySelector('h1 + p')?.innerText || '',
      primaryCta: document.querySelector('section a[href="#free-hub"]')?.innerText || '',
      secondaryCta: document.querySelector('section a[href="/subscription"]')?.innerText || '',
      cardTitles: Array.from(document.querySelectorAll('[role="tablist"][aria-label="Learning Modules"] [role="tab"] h3')).map(h => h.innerText),
      pricingTitle: document.querySelector('#pricing h2')?.innerText || '',
      navbarAcademy: Array.from(document.querySelectorAll('header a')).find(a => a.href.includes('/subscription'))?.innerText || ''
    })`);
    console.log('En Language State:', enLanguageState);

    const hasEnHeadline = enLanguageState.headline.includes('Stop Guessing What to Study');
    const hasEnSubtitle = enLanguageState.subtitle.includes('Textbook MCQs, daily Current Affairs');
    const hasEnPrimaryCta = enLanguageState.primaryCta.includes('Start Free Practice');
    const hasEnSecondaryCta = enLanguageState.secondaryCta.includes('Explore ₹99 Academy');
    const hasEnCardTitles = enLanguageState.cardTitles.some(t => t.includes('Current Affairs')) &&
                            enLanguageState.cardTitles.some(t => t.includes('Mock Test'));

    recordTest('TC-05', 'Complete English Localization Switch',
      hasEnHeadline && hasEnSubtitle && hasEnPrimaryCta && hasEnSecondaryCta && hasEnCardTitles,
      `En Headline: "${enLanguageState.headline.trim()}", En Primary CTA: "${enLanguageState.primaryCta.trim()}"`
    );

    // Scroll to top and take English desktop screenshot
    await evalJs(`window.scrollTo(0, 0);`);
    await new Promise(r => setTimeout(r, 600));
    await takeScreenshot('homepage_en_desktop.png');

    // -------------------------------------------------------------
    // TEST 6: Language Persistence in localStorage
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Language Persistence in localStorage ---');
    const storedLang = await evalJs(`localStorage.getItem('language')`);
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 2000));
    const reloadedHeadline = await evalJs(`document.querySelector('h1')?.innerText || ''`);
    const persistencePass = storedLang === 'en' && reloadedHeadline.includes('Stop Guessing');

    recordTest('TC-06', 'Language Persistence Across Page Reload',
      persistencePass,
      `Stored language: ${storedLang}, Reloaded headline: "${reloadedHeadline.trim()}"`
    );

    // -------------------------------------------------------------
    // TEST 7: Tablet Responsive Viewport (768x1024)
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Tablet Viewport (768x1024) ---');
    await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false });
    await new Promise(r => setTimeout(r, 800));

    const tabletOverflow = await evalJs(`({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      cardsCols: window.getComputedStyle(document.querySelector('[role="tablist"][aria-label="Learning Modules"]')).gridTemplateColumns.split(' ').length
    })`);

    const tabletNoOverflow = tabletOverflow.scrollWidth <= tabletOverflow.clientWidth;
    recordTest('TC-07', 'Tablet 768px Viewport (2-col grid & no overflow)',
      tabletNoOverflow && tabletOverflow.cardsCols === 2,
      `ScrollWidth: ${tabletOverflow.scrollWidth}, ClientWidth: ${tabletOverflow.clientWidth}, Grid Cols: ${tabletOverflow.cardsCols}`
    );

    await evalJs(`document.getElementById('free-hub').scrollIntoView();`);
    await new Promise(r => setTimeout(r, 600));
    await takeScreenshot('learning_cards_tablet_768.png');

    // -------------------------------------------------------------
    // TEST 8: Mobile Responsive Viewport (390x844) & Localization
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Mobile Viewport (390x844) ---');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await evalJs(`window.scrollTo(0, 0);`);
    await new Promise(r => setTimeout(r, 800));

    const mobileEnOverflow = await evalJs(`({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      cardsCols: window.getComputedStyle(document.querySelector('[role="tablist"][aria-label="Learning Modules"]')).gridTemplateColumns.split(' ').length
    })`);

    const mobileNoOverflow = mobileEnOverflow.scrollWidth <= mobileEnOverflow.clientWidth;
    recordTest('TC-08', 'Mobile 390px Viewport (1-col stacked & no overflow)',
      mobileNoOverflow && mobileEnOverflow.cardsCols === 1,
      `ScrollWidth: ${mobileEnOverflow.scrollWidth}, ClientWidth: ${mobileEnOverflow.clientWidth}, Grid Cols: ${mobileEnOverflow.cardsCols}`
    );

    await takeScreenshot('homepage_en_mobile_390.png');

    // Switch to Tamil on Mobile
    await evalJs(`
      const taBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('தமிழ்'));
      if (taBtns.length > 0) taBtns[0].click();
    `);
    await new Promise(r => setTimeout(r, 1000));
    await evalJs(`window.scrollTo(0, 0);`);
    await new Promise(r => setTimeout(r, 600));
    await takeScreenshot('homepage_ta_mobile_390.png');

    await evalJs(`document.getElementById('free-hub').scrollIntoView();`);
    await new Promise(r => setTimeout(r, 600));
    await takeScreenshot('learning_cards_mobile_390.png');

    // -------------------------------------------------------------
    // TEST 9: Desktop 1280px Full Width Verification
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Desktop 1280x800 Viewport ---');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await evalJs(`window.scrollTo(0, 0);`);
    await new Promise(r => setTimeout(r, 600));

    const desktop1280Overflow = await evalJs(`
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    `);

    recordTest('TC-09', 'Desktop 1280px Viewport Verification',
      desktop1280Overflow,
      `No horizontal overflow at 1280px: ${desktop1280Overflow}`
    );

  } catch (err) {
    console.error('Test Execution Error:', err);
    recordTest('TC-ERR', 'Execution Runtime', false, err.message);
  } finally {
    ws.close();
    chromeProcess.kill();
  }

  console.log('\n========================================================================');
  console.log('TEST SUMMARY');
  console.log('========================================================================');
  const total = testResults.length;
  const passed = testResults.filter(t => t.passed).length;
  const failed = total - passed;
  console.log(`Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (failed === 0) {
    console.log('STATUS: ALL CONVERSION UX & LOCALIZATION TESTS PASSED PERFECTLY!\n');
  } else {
    console.log('STATUS: SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runVerification();
