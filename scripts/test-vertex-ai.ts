import { execSync } from 'child_process';
import https from 'https';

try {
  const token = execSync('gcloud auth print-access-token --account=shanmugasundaram.tsm@gmail.com', { timeout: 10000 })
    .toString()
    .trim();
  const projectId = 'tnpsc99-staging';
  const model = 'gemini-2.5-flash';
  const path = `/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:generateContent`;

  console.log(`Testing Vertex AI: https://us-central1-aiplatform.googleapis.com${path}`);

  const postData = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Respond with: "TNPSC99_INFERENCE_ONLINE"' }] }]
  });

  const req = https.request({
    hostname: 'us-central1-aiplatform.googleapis.com',
    path: path,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try {
        const json = JSON.parse(body);
        console.log('Response:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Body:', body);
      }
    });
  });

  req.on('error', e => console.error('Request error:', e.message));
  req.write(postData);
  req.end();
} catch (e: any) {
  console.error('Fatal:', e.message);
}
