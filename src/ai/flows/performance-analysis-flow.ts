'use server';
/**
 * @fileOverview An AI flow to analyze a user's test performance.
 *
 * - analyzePerformance - A function that takes subject performance data and returns an analysis.
 * - PerformanceInput - The input type for the analysis.
 * - PerformanceOutput - The return type for the analysis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
import {marked} from 'marked';

export const PerformanceInputSchema = z.object({
  subjects: z.array(
    z.object({
      name: z.string().describe('The name of the subject.'),
      proficiency: z.
        number()
        .describe('The user\'s proficiency score in this subject, as a percentage (0-100).'),
      attempts: z.number().describe('The number of tests the user has attempted in this subject.'),
    })
  ),
});
export type PerformanceInput = z.infer<typeof PerformanceInputSchema>;


export const PerformanceOutputSchema = z.object({
  analysis: z.string().describe('A detailed analysis of the user\'s performance in markdown format. Identify strengths (high proficiency) and weaknesses (low proficiency). Provide actionable advice on which 2-3 subjects to focus on for improvement. Keep it concise and encouraging.'),
});
export type PerformanceOutput = z.infer<typeof PerformanceOutputSchema>;

const analysisPrompt = ai.definePrompt(
  {
    name: 'performanceAnalysisPrompt',
    input: { schema: PerformanceInputSchema },
    output: { schema: PerformanceOutputSchema },
    prompt: `
      You are a helpful and encouraging academic advisor for a user preparing for the TNPSC exams.
      Your task is to analyze the user's performance based on their test scores across various subjects.

      Here is the user's performance data:
      {{#each subjects}}
      - Subject: {{name}}, Proficiency: {{proficiency}}%, Attempts: {{attempts}}
      {{/each}}

      Based on this data, provide a concise and actionable analysis in markdown.
      1.  **Strengths:** Start by positively identifying 1-2 subjects where the user is performing well (high proficiency > 75%).
      2.  **Areas for Improvement:** Gently point out 2-3 subjects where the user has the most room for improvement (lower proficiency < 60%). Prioritize subjects with more attempts but lower scores.
      3.  **Actionable Advice:** Give clear, encouraging advice. Suggest focusing on the identified "Areas for Improvement."
      4.  **Formatting**: Use markdown headings (e.g., '### Strengths') and bullet points for clarity.

      Keep the entire analysis to about 3-4 short paragraphs.
    `,
  }
);


const performanceAnalysisFlow = ai.defineFlow(
  {
    name: 'performanceAnalysisFlow',
    inputSchema: PerformanceInputSchema,
    outputSchema: PerformanceOutputSchema,
  },
  async (input) => {
    const llmResponse = await analysisPrompt(input);
    const { output } = llmResponse;
    if (!output) {
      throw new Error("No output from LLM");
    }

    const htmlAnalysis = await marked.parse(output.analysis);
    
    return {
        analysis: htmlAnalysis
    };
  }
);


export async function analyzePerformance(input: PerformanceInput): Promise<PerformanceOutput> {
  return await performanceAnalysisFlow(input);
}
