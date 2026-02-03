import { nextHandler } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
import '@/ai/flows/performance-analysis-flow';

export const POST = nextHandler(ai);
