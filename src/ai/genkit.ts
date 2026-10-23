import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const config: {
  plugins: any[];
  model?: string;
} = {
  plugins: [],
};

if (process.env.GEMINI_API_KEY) {
  config.plugins.push(googleAI());
  config.model = 'googleai/gemini-2.5-flash';
}

export const ai = genkit(config);
