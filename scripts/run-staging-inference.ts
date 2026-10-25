import dotenv from 'dotenv';
import https from 'https';
import { PRICING } from '../src/lib/current-affairs/cost-estimator';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY missing.');
  process.exit(1);
}

// Request Payload: Real TNPSC Current Affairs Factual Verification
const prompt = `You are the TNPSC99 Current Affairs Evaluation Engine.
Verify the following factual claim extracted from an official government press release:
"According to MoEFCC press release PIB PRID 2324120 (15 October 2026), the declaration of Sukhna Wetland (Chandigarh) and Sauj Jheel (Uttar Pradesh) brought India’s Ramsar site tally to 103."

Provide your evaluation in JSON format:
{
  "isFactuallyAccurate": boolean,
  "eventName": string,
  "eventDate": string,
  "tamilNaduRelevance": boolean,
  "confidenceScore": number,
  "verificationVerdict": string
}`;

const postData = JSON.stringify({
  contents: [
    {
      parts: [
        { text: prompt }
      ]
    }
  ],
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

console.log(`[INFERENCE] Dispatching live inference request to ${modelName}...`);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    try {
      const responseData = JSON.parse(body);
      if (responseData.candidates && responseData.candidates[0]) {
        const candidate = responseData.candidates[0];
        const usage = responseData.usageMetadata || {};
        const contentText = candidate.content?.parts?.[0]?.text;

        const promptTokens = usage.promptTokenCount || 0;
        const completionTokens = usage.candidatesTokenCount || 0;
        const totalTokens = usage.totalTokenCount || (promptTokens + completionTokens);

        // Real Gemini 2.5 Flash Pricing Calculation ($0.30/1M input, $2.50/1M output)
        const inputCostUSD = (promptTokens / 1_000_000) * PRICING.GEMINI_2_5_FLASH.inputPer1MTokensUSD;
        const outputCostUSD = (completionTokens / 1_000_000) * PRICING.GEMINI_2_5_FLASH.outputPer1MTokensUSD;
        const totalCostUSD = inputCostUSD + outputCostUSD;
        const totalCostINR = totalCostUSD * PRICING.USD_TO_INR;

        console.log('=== REAL LIVE INFERENCE RESULT ===');
        console.log('Model Name:             ', modelName);
        console.log('Model ID (Genkit):      ', 'googleai/' + modelName);
        console.log('HTTP Status:            ', res.statusCode);
        console.log('Finish Reason:          ', candidate.finishReason);
        console.log('Prompt Tokens:          ', promptTokens);
        console.log('Completion Tokens:      ', completionTokens);
        console.log('Total Tokens:           ', totalTokens);
        console.log('Input Cost (USD):       $', inputCostUSD.toFixed(6));
        console.log('Output Cost (USD):      $', outputCostUSD.toFixed(6));
        console.log('Actual Incurred USD:    $', totalCostUSD.toFixed(6));
        console.log('Actual Incurred INR:    ₹', totalCostINR.toFixed(4));
        console.log('\n--- VERIFIED MODEL OUTPUT ---');
        console.log(contentText);
        console.log('==================================');
      } else {
        console.error('API Error Response:', responseData);
      }
    } catch (e: any) {
      console.error('JSON parse error:', e.message, body);
    }
  });
});

req.on('error', (e) => {
  console.error('HTTPS request error:', e.message);
});

req.write(postData);
req.end();
