'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import '@/ai/flows/performance-analysis-flow';

export async function POST(req: NextRequest, {params}: {params: {flow: string[]}}) {
  const flowId = params.flow?.[0];
  if (!flowId) {
      return NextResponse.json({error: 'Flow ID not provided in URL.'}, {status: 400});
  }

  const body = await req.json();
  const input = body.data;
  if (input === undefined) {
      return NextResponse.json({error: 'Request body must have a "data" property.'}, {status: 400});
  }

  try {
    // ai.run is the method to execute a flow/action in Genkit 1.x
    const result = await (ai as any).run({
      flowId: flowId,
      input: input,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(`Error running flow '${flowId}':`, e);
    
    // If it's the performanceAnalysisFlow, we have a robust fallback in the flow file itself
    if (flowId === 'performanceAnalysisFlow') {
      try {
        const { analyzePerformance } = await import('@/ai/flows/performance-analysis-flow');
        const fallbackResult = await analyzePerformance(input);
        return NextResponse.json(fallbackResult);
      } catch (fallbackError) {
        console.error('Error in manual fallback for performanceAnalysisFlow:', fallbackError);
      }
    }
    
    // Provide a more specific error if the flow is not found
    if (e.message && e.message.includes('not find flow')) {
        return NextResponse.json({ error: `Flow '${flowId}' not found.` }, { status: 404 });
    }
    
    return NextResponse.json({error: e.message || 'An unexpected error occurred while running the flow.'}, {status: 500});
  }
}
