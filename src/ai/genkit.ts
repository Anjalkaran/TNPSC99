'use server';
import {genkit} from 'genkit';
import {type Plugin} from '@genkit-ai/core/plugin';
import {googleAI} from '@genkit-ai/google-genai';

const config: {
  plugins: Plugin[];
  model?: string;
} = {
  plugins: [],
};

if (process.env.GEMINI_API_KEY) {
  config.plugins.push(googleAI());
  config.model = 'googleai/gemini-1.5-flash';
}

export const ai = genkit(config);
