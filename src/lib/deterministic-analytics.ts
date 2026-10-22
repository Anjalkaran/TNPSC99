/**
 * Deterministic Performance Analytics Engine for TNPSC99
 * 
 * Provides instant, zero-cost, mathematical performance insights for students.
 * Guaranteed 100% free of external paid AI / LLM API calls ($0.00 / ₹0.00 cost).
 */

export interface SubjectStat {
  name: string;
  proficiency: number;
  attempts: number;
}

export interface CategoryStat {
  name: string;
  subjectName: string;
  proficiency: number;
  attempts: number;
}

export interface UnitStat {
  name: string;
  className: string;
  subjectName: string;
  term?: string;
  unitNumber?: number;
  proficiency: number;
  attempts: number;
}

export interface DeterministicAnalysisInput {
  subjects: SubjectStat[];
  categories: CategoryStat[];
  units: UnitStat[];
  language: 'en' | 'ta';
}

export interface DeterministicAnalysisOutput {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overallSummary: string;
}

/**
 * Computes deterministic strengths, weaknesses, and revision priorities
 * from a student's attempt performance data without calling any external AI APIs.
 */
export function computeDeterministicPerformance(input: DeterministicAnalysisInput): DeterministicAnalysisOutput {
  const { subjects, categories, units, language } = input;

  const allItems = [
    ...subjects.map(s => ({ ...s, type: 'Subject' })),
    ...categories.map(c => ({ ...c, type: 'Category' })),
    ...units.map(u => ({ ...u, type: 'Unit' })),
  ];

  if (allItems.length === 0) {
    const summary = language === 'ta'
      ? 'முழுமையான பகுப்பாய்வைக் காண கூடுதல் பயிற்சித் தேர்வுகளை எழுதுங்கள்.'
      : 'Complete more practice tests to view comprehensive performance insights.';
    return {
      strengths: [],
      weaknesses: [],
      recommendations: [
        language === 'ta'
          ? 'பாட வாரியாக உங்கள் பயிற்சியைத் தொடங்கி உங்கள் தேர்ச்சி நிலையை அறியுங்கள்.'
          : 'Start practicing chapter-wise tests to measure your baseline proficiency.'
      ],
      overallSummary: summary,
    };
  }

  // 1. Strengths: High proficiency (>= 75%)
  const strengths = allItems
    .filter(item => item.proficiency >= 75 && item.attempts > 0)
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 3)
    .map(s => language === 'ta'
      ? `${s.name} பாடத்தில் நீங்கள் வலுவாக உள்ளீர்கள் (${s.proficiency.toFixed(0)}%)`
      : `You are strong in ${s.name} (${s.proficiency.toFixed(0)}%)`);

  // 2. Weaknesses: Low proficiency (< 65%)
  const weaknesses = allItems
    .filter(item => item.proficiency < 65 && item.attempts > 0)
    .sort((a, b) => a.proficiency - b.proficiency)
    .slice(0, 3);

  const formattedWeaknesses = weaknesses.map(w => language === 'ta'
    ? `${w.name} பகுதியில் அதிக கவனம் தேவை (${w.proficiency.toFixed(0)}%)`
    : `Focus more on ${w.name} (${w.proficiency.toFixed(0)}%)`);

  // 3. Actionable Recommendations
  const recommendations: string[] = [];

  if (weaknesses.length > 0) {
    for (const w of weaknesses) {
      recommendations.push(
        language === 'ta'
          ? `'${w.name}' பாடப் புத்தகக் குறிப்புகளை மீண்டும் படித்து அதிக பயிற்சித் தேர்வுகளை எழுதுங்கள்.`
          : `Review textbook notes and take more practice tests for '${w.name}'.`
      );
    }
    recommendations.push(
      language === 'ta'
        ? 'உங்கள் பலவீனமான பகுதிகளில் தினமும் 15 வினாக்களுக்கு பயிற்சி செய்யுங்கள்.'
        : 'Practice 15 targeted MCQs daily in your weakest areas.'
    );
  } else {
    recommendations.push(
      language === 'ta'
        ? 'உங்கள் உயர் தேர்ச்சி நிலையைத் தக்கவைக்க அனைத்து பாடங்களிலும் தொடர்ந்து மாதிரித் தேர்வுகளை எழுதுங்கள்.'
        : 'Continue taking full-length mock tests to maintain your high proficiency level across all topics.'
    );
  }

  // 4. Overall Summary
  let overallSummary = '';
  if (weaknesses.length > 0) {
    overallSummary = language === 'ta'
      ? 'சில பகுதிகளில் உங்களுக்கு நல்ல தேர்ச்சி உள்ளது; பலவீனமான தலைப்புகளில் கூடுதல் பயிற்சி செய்வதன் மூலம் உங்கள் மதிப்பெண்களை மேலும் உயர்த்தலாம்.'
      : 'You have a good grasp of several subjects. Targeted revision in your weaker areas will significantly boost your final rank.';
  } else {
    overallSummary = language === 'ta'
      ? 'நீங்கள் அனைத்துப் பாடங்களிலும் மிகச் சிறப்பாகச் செயல்படுகிறீர்கள்! தொடர்ந்து விடாமுயற்சியுடன் பயிலுங்கள்.'
      : 'You are performing consistently well across all evaluated subjects. Keep up the disciplined preparation!';
  }

  return {
    strengths,
    weaknesses: formattedWeaknesses,
    recommendations: recommendations.slice(0, 4),
    overallSummary,
  };
}
