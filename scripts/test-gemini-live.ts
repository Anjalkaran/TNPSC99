import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY not configured.');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      if (data.models) {
        console.log('SUCCESS: Retrieved live models from Google AI Studio:');
        const flashModels = data.models
          .filter((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => ({
            name: m.name.replace('models/', ''),
            displayName: m.displayName,
            description: m.description?.substring(0, 80) + '...',
          }));
        console.log(JSON.stringify(flashModels, null, 2));
      } else {
        console.log('API Response:', data);
      }
    } catch (e: any) {
      console.error('Failed to parse response:', e.message);
      console.log('Raw body:', body);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err.message);
});
