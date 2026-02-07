'use server';
import { genkitHandler } from '@genkit-ai/next';
import '@/ai/flows/performance-analysis-flow';
import { ai } from '@/ai/genkit';

export const { GET, POST } = genkitHandler({
  ai,
});
