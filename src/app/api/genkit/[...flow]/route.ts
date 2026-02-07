import genkitHandler from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
import '@/ai/flows/performance-analysis-flow';

// The handler is now a single function
const handler = genkitHandler();

// Export it for both GET and POST
export const GET = handler;
export const POST = handler;
