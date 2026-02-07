import genkitHandler from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
// Import your flows here so they are registered
import '@/ai/flows/performance-analysis-flow';

// The handler is now a single function
const handler = genkitHandler(ai);

// Export it for both GET and POST
export const GET = handler;
export const POST = handler;
