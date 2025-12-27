'use server';
/**
 * @fileOverview An AI flow to analyze a user's test performance.
 *
 * - analyzePerformance - A function that takes subject performance data and returns an analysis.
 * - PerformanceInput - The input type for the analysis.
 * - PerformanceOutput - The return type for the analysis.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {marked} from 'marked';

const PerformanceInputSchema = z.object({
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


const PerformanceOutputSchema = z.object({
  strengths: z.array(z.string()).describe('A list of 1-2 subjects where the user is performing well (proficiency > 75%).'),
  weaknesses: z.array(z.string()).describe('A list of 2-3 subjects where proficiency is lowest (< 60%), which the user should focus on.'),
  recommendations: z.array(z.string()).describe('A list of 3-4 concise, actionable pieces of advice for improvement.'),
  overallSummary: z.string().describe('A single, encouraging sentence summarizing the user\'s current standing.'),
});
export type PerformanceOutput = z.infer<typeof PerformanceOutputSchema>;

const analysisPrompt = ai.definePrompt(
  {
    name: 'performanceAnalysisPrompt',
    input: { schema: PerformanceInputSchema },
    output: { schema: PerformanceOutputSchema },
    prompt: `
      You are a helpful and encouraging academic advisor for a user preparing for the TNPSC exams.
      Your task is to analyze the user's performance based on their test scores across various subjects and provide a structured analysis.

      Here is the user's performance data:
      {{#each subjects}}
      - Subject: {{name}}, Proficiency: {{proficiency}}%, Attempts: {{attempts}}
      {{/each}}

      Based on this data, provide the following structured output:
      1.  **strengths**: Identify 1-2 subjects where the user's proficiency is high (e.g., > 75%). If none, return an empty array.
      2.  **weaknesses**: Identify the top 2-3 subjects where proficiency is lowest (e.g., < 60%). Prioritize subjects with more attempts if scores are similar. These are the most critical areas for improvement.
      3.  **recommendations**: Generate 3-4 short, clear, and actionable recommendations to help the user improve, especially in their weak areas. Examples: "Focus on 'History' by reviewing chapter notes.", "Take more practice tests in 'Aptitude' to improve speed."
      4.  **overallSummary**: Write a single, encouraging sentence that summarizes their current situation. Example: "You're building a good foundation, with clear areas to focus on for major improvement."
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
    const { output } = await analysisPrompt(input);
    if (!output) {
      throw new Error("No output from LLM");
    }
    
    // The output is now structured, so no need for marked
    return output;
  }
);


export async function analyzePerformance(input: PerformanceInput): Promise<PerformanceOutput> {
  return await performanceAnalysisFlow(input);
}
