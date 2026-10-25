import * as crypto from 'crypto';
import { ACTUAL_RETRIEVED_DOCUMENTS } from '../src/data/actual-retrieved-documents';

async function testFetch() {
  console.log('Testing live fetch for PIB PRID 2098813...');
  try {
    const res = await fetch('https://pib.gov.in/PressReleasePage.aspx?PRID=2098813', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('Fetched length:', html.length);
    
    // Check for Ayodhya and 2025
    const hasAyodhya = html.includes('Ayodhya');
    const has2025 = html.includes('2025');
    console.log('Contains Ayodhya:', hasAyodhya);
    console.log('Contains 2025:', has2025);
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

testFetch();
