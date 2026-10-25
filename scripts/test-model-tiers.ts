import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) process.exit(1);

const models = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite'
];

async function testModel(modelName: string) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: "Hello, reply with OK." }] }]
    });

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
        try {
          const json = JSON.parse(body);
          resolve({ model: modelName, status: res.statusCode, error: json.error?.message?.slice(0, 80) || null, candidate: json.candidates?.[0]?.content?.parts?.[0]?.text });
        } catch (e) {
          resolve({ model: modelName, status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', err => resolve({ model: modelName, error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  for (const m of models) {
    const res = await testModel(m);
    console.log(res);
  }
}

run();
