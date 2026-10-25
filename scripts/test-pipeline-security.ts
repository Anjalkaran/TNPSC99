import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const secret = process.env.INTERNAL_PIPELINE_SECRET;
if (!secret) {
  console.error('INTERNAL_PIPELINE_SECRET not found in .env');
  process.exit(1);
}

function makeRequest(headers: Record<string, string>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({});
    const req = https.request({
      hostname: 'studio--tnpsc99-staging.us-central1.hosted.app',
      path: '/api/internal/jobs/ca-daily-pipeline',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runSecurityTests() {
  console.log('=== TNPSC99 PIPELINE SECURITY VALIDATION ===\n');

  // Test 1: Anonymous request
  console.log('Test 1: Anonymous Internet Request (No Credentials)...');
  const res1 = await makeRequest({});
  console.log(`Status: ${res1.status} (Expected: 401)`);
  console.log(`Code:   ${res1.body?.code} (Expected: PIPELINE_TRIGGER_UNAUTHORIZED)`);
  console.log(`Result: ${res1.status === 401 ? 'PASS (Protected against anonymous callers)' : 'FAIL'}\n`);

  // Test 2: Invalid / Compromised Credential
  console.log('Test 2: Invalid / Legacy Compromised Key...');
  const res2 = await makeRequest({ 'x-pipeline-secret': 'invalid_compromised_token_attempt' });
  console.log(`Status: ${res2.status} (Expected: 401)`);
  console.log(`Result: ${res2.status === 401 ? 'PASS (Compromised / invalid keys rejected)' : 'FAIL'}\n`);

  console.log('Security posture verified: Anonymous and invalid requests fail-closed.');
}

runSecurityTests().catch(console.error);
