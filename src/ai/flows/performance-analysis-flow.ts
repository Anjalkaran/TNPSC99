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

const SubjectPerformanceSchema = z.object({
  name: z.string().describe('The name of the subject.'),
  proficiency: z.number().describe("The user's proficiency score in this subject, as a percentage (0-100)."),
  attempts: z.number().describe('The number of tests the user has attempted in this subject.'),
});

const CategoryPerformanceSchema = z.object({
    name: z.string().describe('The name of the category.'),
    subjectName: z.string().describe('The name of the parent subject.'),
    proficiency: z.number().describe("The user's proficiency score in this category, as a percentage (0-100)."),
    attempts: z.number().describe('The number of tests attempted in this category.'),
});

const UnitPerformanceSchema = z.object({
    name: z.string().describe('The name of the unit (e.g., Unit Name).'),
    className: z.string().describe('The class name (e.g., 10th Std).'),
    subjectName: z.string().describe('The subject name.'),
    term: z.string().describe('The academic term.'),
    unitNumber: z.number().describe('The unit number.'),
    proficiency: z.number().describe("The user's proficiency score in this unit, as a percentage (0-100)."),
    attempts: z.number().describe('The number of tests attempted in this unit.'),
});

const PerformanceInputSchema = z.object({
  subjects: z.array(SubjectPerformanceSchema),
  categories: z.array(CategoryPerformanceSchema),
  units: z.array(UnitPerformanceSchema),
  language: z.enum(['en', 'ta']).describe('The language for the analysis output.'),
});
export type PerformanceInput = z.infer<typeof PerformanceInputSchema>;


const PerformanceOutputSchema = z.object({
  strengths: z.array(z.string()).describe('A list of 1-2 subjects where the user is performing well (proficiency > 75%).'),
  weaknesses: z.array(z.string()).describe('A list of 2-3 granular topics (categories or units) where proficiency is lowest (< 60%), which the user should focus on.'),
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
      Your task is to analyze the user's performance based on their test scores and provide a structured analysis with specific, actionable advice.

      **IMPORTANT**: Generate the entire output (strengths, weaknesses, recommendations, and overallSummary) in the language code provided: '{{language}}'.

      Here is the user's performance data:

      **Subject Performance:**
      {{#if subjects}}
      {{#each subjects}}
      - Subject: {{name}}, Proficiency: {{proficiency}}%, Attempts: {{attempts}}
      {{/each}}
      {{else}}
      No subject data available.
      {{/if}}

      **Category Performance:**
      {{#if categories}}
      {{#each categories}}
      - Category: '{{name}}' in Subject '{{subjectName}}', Proficiency: {{proficiency}}%, Attempts: {{attempts}}
      {{/each}}
      {{else}}
      No category data available.
      {{/if}}

      **Unit Performance:**
      {{#if units}}
      {{#each units}}
      - Unit: '{{name}}' (Class: {{className}}, Subject: {{subjectName}}, Term: {{term}}, Unit: {{unitNumber}}), Proficiency: {{proficiency}}%, Attempts: {{attempts}}
      {{/each}}
      {{else}}
      No unit data available.
      {{/if}}

      Based on this granular data, provide the following structured output:

      1.  **strengths**: Identify 1-2 subjects where the user's proficiency is high (e.g., > 75%). If none, return an empty array.
      2.  **weaknesses**: Identify the top 2-3 most specific topics (from categories or units) where proficiency is lowest (e.g., < 60%). Prioritize units if available for a weak area.
      3.  **recommendations**: Generate 3-4 concise, actionable pieces of advice for improvement based on the weaknesses. For each weakness, create a specific recommendation. For example, if a user is weak in the unit "Age of Empires" for "Class 6 History", a recommendation could be "Your proficiency in 'Age of Empires' is low. Review the material in the 'Class 6 History' book for that unit.".
      4.  **overallSummary**: Write a single, encouraging sentence that summarizes their current situation. Example: "You have a good grasp of some subjects, and with targeted practice on your weaker areas, you can see significant improvement."
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
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Skipping AI performance analysis.");
    const summary = input.language === 'ta' 
        ? "AI பகுப்பாய்வு கிடைக்கவில்லை. உங்கள் ஜெமினி API விசையை உள்ளமைக்கவும்." 
        : "AI analysis is unavailable. Please configure your Gemini API key.";
    return {
        strengths: [],
        weaknesses: [],
        recommendations: [],
        overallSummary: summary,
    };
  }
  return await performanceAnalysisFlow(input);
}
