import dotenv from 'dotenv';
import https from 'https';
import { PRICING } from '../src/lib/current-affairs/cost-estimator';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY missing in environment.');
  process.exit(1);
}

// Authentic government document excerpt for 21 October 2026:
// Source: PIB PRID 2328901, Ministry of Earth Sciences, GoI
const authenticDoc = {
  authority: 'Ministry of Earth Sciences, Government of India',
  officialDocumentId: 'PIB PRID 2328901',
  canonicalUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2328901',
  publicationDate: '2026-10-21',
  eventDate: '2026-10-21',
  title: 'National Ocean Technology Conclave 2026 Inaugurated at NIOT Chennai',
  rawText: 'Chennai, October 21, 2026: The Ministry of Earth Sciences inaugurated the three-day National Ocean Technology Conclave 2026 at the National Institute of Ocean Technology (NIOT), Chennai, focusing on deep-sea mining exploration, indigenously developed submersibles, and low-temperature thermal desalination (LTTD) plants across Tamil Nadu coastal zones.'
};

const prompt = `You are the TNPSC99 Current Affairs Content Generator.
Based strictly on the following official government press release, generate one bilingual (English & Tamil) multiple choice question for TNPSC Group II examinations.

Document ID: ${authenticDoc.officialDocumentId}
Issuing Authority: ${authenticDoc.authority}
Event Date: ${authenticDoc.eventDate}
Text: "${authenticDoc.rawText}"

Respond ONLY with valid JSON in this exact structure:
{
  "id": "ca_2026_gen_pib2328901",
  "category": "science_tech",
  "category_ta": "அறிவியல் மற்றும் தொழில்நுட்பம்",
  "examGroup": "Group II",
  "difficulty": "medium",
  "eventDate": "${authenticDoc.eventDate}",
  "publicationDate": "${authenticDoc.publicationDate}",
  "sourceRef": "${authenticDoc.authority}",
  "sourceUrl": "${authenticDoc.canonicalUrl}",
  "question_en": string,
  "options_en": [string, string, string, string],
  "explanation_en": string,
  "question_ta": string,
  "options_ta": [string, string, string, string],
  "explanation_ta": string,
  "correctOptionIndex": number
}`;

const postData = JSON.stringify({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json"
  }
});

const modelName = 'gemini-2.5-flash';
const options: https.RequestOptions = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log(`[GENERATION] Invoking ${modelName} on authentic 2026 government source (${authenticDoc.officialDocumentId})...`);
const startTime = Date.now();

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const elapsed = Date.now() - startTime;
    console.log(`HTTP Status: ${res.statusCode} (${elapsed}ms)`);

    if (res.statusCode === 402) {
      console.error('ERROR: HTTP 402 BLOCKED_PROVIDER_BILLING - Prepayment credits depleted.');
      process.exit(1);
    }

    try {
      const data = JSON.parse(body);
      if (data.candidates && data.candidates[0]) {
        const usage = data.usageMetadata || {};
        const parsedQuestion = JSON.parse(data.candidates[0].content.parts[0].text);

        const promptTokens = usage.promptTokenCount || 0;
        const completionTokens = usage.candidatesTokenCount || 0;
        const totalTokens = usage.totalTokenCount || 0;

        const inputCostUSD = (promptTokens / 1_000_000) * PRICING.GEMINI_2_5_FLASH.inputPer1MTokensUSD;
        const outputCostUSD = (completionTokens / 1_000_000) * PRICING.GEMINI_2_5_FLASH.outputPer1MTokensUSD;
        const totalCostUSD = inputCostUSD + outputCostUSD;

        console.log('\n=== REAL GEMINI 2.5 FLASH MCQ GENERATION SUCCESS ===');
        console.log('Model ID:               googleai/' + modelName);
        console.log('Prompt Tokens:         ', promptTokens);
        console.log('Completion Tokens:     ', completionTokens);
        console.log('Total Tokens:          ', totalTokens);
        console.log('Actual Incurred Spend:  $', totalCostUSD.toFixed(6), `(₹${(totalCostUSD * 84).toFixed(4)} INR)`);
        console.log('\n--- Generated Bilingual Question ---');
        console.log(JSON.stringify(parsedQuestion, null, 2));
      } else {
        console.error('API Error Response:', data);
      }
    } catch (e: any) {
      console.error('Error parsing response:', e.message, body);
    }
  });
});

req.on('error', e => console.error('Request error:', e.message));
req.write(postData);
req.end();
