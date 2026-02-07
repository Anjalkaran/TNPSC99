import genkitHandler from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
import '@/ai/flows/performance-analysis-flow';

const handler = genkitHandler(ai);

export const GET = handler;
export const POST = handler;
