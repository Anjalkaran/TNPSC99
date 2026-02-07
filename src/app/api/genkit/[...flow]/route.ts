import { genkitHandler } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
// Import your flows here so they are registered
import '@/ai/flows/performance-analysis-flow';

// We use 'as any' here to bypass a temporary type mismatch
// between Genkit versions in the build environment.
const handlers: any = genkitHandler(ai as any);

export const GET = handlers.GET;
export const POST = handlers.POST;
