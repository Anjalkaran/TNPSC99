import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const config: {
  plugins: any[];
  model?: string;
} = {
  plugins: [],
};

if (process.env.GEMINI_API_KEY) {
  config.plugins.push(googleAI());
  config.model = 'googleai/gemini-1.5-flash';
}

export const ai = genkit(config);
