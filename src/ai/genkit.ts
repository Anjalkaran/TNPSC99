import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const plugins: Plugin[] = [];

if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
}

export const ai = genkit({
  plugins,
  model: 'googleai/gemini-2.5-flash',
});
