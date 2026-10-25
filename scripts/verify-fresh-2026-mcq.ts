import dotenv from 'dotenv';
import https from 'https';
import { PRICING } from '../src/lib/current-affairs/cost-estimator';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) process.exit(1);

const questionData = {
  question: "The National Ocean Technology Conclave 2026, inaugurated by the Ministry of Earth Sciences at the National Institute of Ocean Technology (NIOT), Chennai, primarily focused on which of the following areas?",
  options: [
    "Space exploration and satellite technology",
    "Deep-sea mining exploration, indigenously developed submersibles, and low-temperature thermal desalination (LTTD) plants",
    "Renewable energy sources and climate change mitigation",
    "Agricultural innovation and food security"
  ],
  context: "Chennai, October 21, 2026: The Ministry of Earth Sciences inaugurated the three-day National Ocean Technology Conclave 2026 at the National Institute of Ocean Technology (NIOT), Chennai, focusing on deep-sea mining exploration, indigenously developed submersibles, and low-temperature thermal desalination (LTTD) plants across Tamil Nadu coastal zones."
};

const prompt = `You are an independent factual validator and subject-matter expert for TNPSC exams.
Read the following primary context and answer the question:

Context: "${questionData.context}"
Question: "${questionData.question}"
Options:
0: "${questionData.options[0]}"
1: "${questionData.options[1]}"
2: "${questionData.options[2]}"
3: "${questionData.options[3]}"

Evaluate:
1. Which option index is definitively supported by the context?
2. Are any distractors ambiguous or disputable?
3. What is your confidence level (0.0 to 1.0)?

Respond ONLY with valid JSON:
{
  "predictedOptionIndex": number,
  "isUnambiguous": boolean,
  "confidence": number,
  "factualEvidence": string,
  "distractorAudit": string
}`;

const postData = JSON.stringify({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: {
    temperature: 0.0,
    responseMimeType: "application/json"
  }
});

const modelName = 'gemini-2.5-flash';
const req = https.request({
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    const usage = data.usageMetadata || {};

    const promptTokens = usage.promptTokenCount || 0;
    const completionTokens = usage.candidatesTokenCount || 0;
    const totalTokens = usage.totalTokenCount || 0;

    const costUSD = (promptTokens / 1_000_000) * PRICING.GEMINI_2_5_FLASH.inputPer1MTokensUSD +
                    (completionTokens / 1_000_000) * PRICING.GEMINI_2_5_FLASH.outputPer1MTokensUSD;

    console.log('=== INDEPENDENT BLIND VERIFICATION RESULT ===');
    console.log('Predicted Index:        ', result.predictedOptionIndex);
    console.log('Is Unambiguous:         ', result.isUnambiguous);
    console.log('Confidence Score:       ', result.confidence);
    console.log('Evidence:               ', result.factualEvidence);
    console.log('Distractor Audit:       ', result.distractorAudit);
    console.log('Verification Spend:     $', costUSD.toFixed(6), `(₹${(costUSD * 84).toFixed(4)} INR)`);
  });
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();
