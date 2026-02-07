import { genkitHandler } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
import '@/ai/flows/performance-analysis-flow';

// We use 'as any' here to bypass a temporary type mismatch
// between Genkit versions in the build environment.
const handler: any = genkitHandler(ai as any);

export const GET = handler;
export const POST = handler;
