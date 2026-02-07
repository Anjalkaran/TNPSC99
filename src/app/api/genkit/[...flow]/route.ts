import genkitHandler from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
import '@/ai/flows/performance-analysis-flow';

// We wrap the handler in explicit async functions 
// to prevent the "found object" error.
const handler: any = genkitHandler(ai as any);

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
