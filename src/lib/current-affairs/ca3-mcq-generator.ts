import fs from 'node:fs';
import path from 'node:path';
import { VerifiedFactsManifest, VerifiedFactExportItem } from './verified-facts-exporter';
import { CADraftQuestion, DEFAULT_PIPELINE_CONFIG } from './types';
import { verifyDraftQuestion } from './verification-engine';

export interface GeneratedBilingualMcqPackage {
  generatedAt: string;
  sourceFactCount: number;
  draftCount: number;
  drafts: CADraftQuestion[];
  typeDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  verificationSummary: {
    passedCount: number;
    reviewRequiredCount: number;
    autoPublishPreventedCount: number;
  };
}

/**
 * Builds high-quality TNPSC-standard bilingual questions from a verified fact.
 */
export function generateBilingualDraftForFact(
  fact: VerifiedFactExportItem,
  index: number
): CADraftQuestion {
  const qId = `ca26_h1h2_${fact.factId.replace('ca_fact_', '')}`;
  const preferredType = fact.eligibleQuestionTypes[index % fact.eligibleQuestionTypes.length];
  const primaryExamGroup = fact.examGroups[0] || 'Group II';

  let question_en = '';
  let question_ta = '';
  let options_en: string[] = [];
  let options_ta: string[] = [];
  let correctOptionIndex = 0;
  let explanation_en = '';
  let explanation_ta = '';

  // Generate question templates based on category and question type
  if (preferredType === 'statement_matching') {
    if (fact.syllabusCategory === 'welfare_schemes' || fact.syllabusCategory === 'tamil_nadu') {
      question_en = `Consider the following statements regarding the initiative announced by the Government of Tamil Nadu:\n1. ${fact.statement_en}\n2. The initiative is restricted exclusively to private non-aided institutions.\nWhich of the statements given above is/are correct?`;
      question_ta = `தமிழ்நாடு அரசால் அறிவிக்கப்பட்ட திட்டம் குறித்து பின்வரும் கூற்றுகளைக் கவனிக்கவும்:\n1. ${fact.statement_ta}\n2. இத்திட்டம் தனியார் சுயநிதி நிறுவனங்களுக்கு மட்டுமே பொருந்தும்.\nமேற்கண்ட கூற்றுகளில் எது/எவை சரியானது?`;
      options_en = ['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2'];
      options_ta = ['1 மட்டும்', '2 மட்டும்', '1 மற்றும் 2 இரண்டும்', 'இரண்டும் அல்ல'];
      correctOptionIndex = 0;
      explanation_en = `Statement 1 is correct: ${fact.evidenceExcerpt}. Statement 2 is incorrect.`;
      explanation_ta = `கூற்று 1 சரியானது: ${fact.evidenceExcerpt}. கூற்று 2 தவறானது.`;
    } else {
      question_en = `With reference to recent government notifications, consider the following:\n1. ${fact.statement_en}\n2. The policy was rescinded with immediate retrospective effect.\nWhich of the statements given above is/are correct?`;
      question_ta = `சமீபத்திய அரசு அறிவிப்புகள் தொடர்பாக பின்வருவனவற்றைக் கவனிக்கவும்:\n1. ${fact.statement_ta}\n2. இக்கொள்கை உடனடியாக முன்தேதியிட்டு ரத்து செய்யப்பட்டது.\nமேற்கண்ட கூற்றுகளில் எது சரியானது?`;
      options_en = ['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2'];
      options_ta = ['1 மட்டும்', '2 மட்டும்', '1 மற்றும் 2 இரண்டும்', 'இரண்டும் அல்ல'];
      correctOptionIndex = 0;
      explanation_en = `Statement 1 is correct as per official release: ${fact.evidenceExcerpt}.`;
      explanation_ta = `அரசு செய்திக்குறிப்பின்படி கூற்று 1 சரியானது: ${fact.evidenceExcerpt}.`;
    }
  } else if (preferredType === 'assertion_reason') {
    question_en = `Assertion (A): ${fact.statement_en}\nReason (R): Official authorities instituted this measure to support policy objectives in ${fact.syllabusCategory.replace('_', ' ')}.`;
    question_ta = `கூற்று (A): ${fact.statement_ta}\nகாரணம் (R): ${fact.syllabusCategory} துறையின் வளர்ச்சி மற்றும் கொள்கை இலக்குகளை அடைய அரசு இந்த நடவடிக்கையை மேற்கொண்டது.`;
    options_en = [
      'Both (A) and (R) are true and (R) is the correct explanation of (A)',
      'Both (A) and (R) are true but (R) is NOT the correct explanation of (A)',
      '(A) is true but (R) is false',
      '(A) is false but (R) is true',
    ];
    options_ta = [
      '(A) மற்றும் (R) இரண்டும் சரி, மேலும் (R) என்பது (A) விற்கான சரியான விளக்கம்',
      '(A) மற்றும் (R) இரண்டும் சரி, ஆனால் (R) என்பது (A) விற்கான சரியான விளக்கம் அல்ல',
      '(A) சரி, ஆனால் (R) தவறு',
      '(A) தவறு, ஆனால் (R) சரி',
    ];
    correctOptionIndex = 0;
    explanation_en = `Both (A) and (R) are correct. As verified by primary source: ${fact.evidenceExcerpt}`;
    explanation_ta = `கூற்று மற்றும் காரணம் இரண்டும் சரியானவை. அதிகாரப்பூர்வ ஆதாரத்தின்படி: ${fact.evidenceExcerpt}`;
  } else {
    // Direct question format
    question_en = `Which of the following statements is accurate according to the official release on ${fact.eventDate}?`;
    question_ta = `${fact.eventDate} தேதியிட்ட அதிகாரப்பூர்வ அரசு அறிவிப்பின்படி பின்வருவனவற்றில் சரியானது எது?`;
    
    // Construct distractors by varying key parameters
    options_en = [
      fact.statement_en,
      `The financial sanction was cancelled due to administrative realignment across districts.`,
      `The scheme applies exclusively to candidates outside Tamil Nadu.`,
      `The initiative was placed under indefinite postponement by judicial injunction.`,
    ];
    options_ta = [
      fact.statement_ta,
      `நிர்வாக காரணங்களால் இத்திட்டத்திற்கான நிதி ஒதுக்கீடு ரத்து செய்யப்பட்டது.`,
      `இத்திட்டம் தமிழ்நாட்டிற்கு வெளியே உள்ள விண்ணப்பதாரர்களுக்கு மட்டுமே பொருந்தும்.`,
      `நீதிமன்ற உத்தரவின் காரணமாக இத்திட்டம் காலவரையின்றி ஒத்திவைக்கப்பட்டது.`,
    ];
    correctOptionIndex = 0;
    explanation_en = `Correct. As verified in official notification: ${fact.evidenceExcerpt}`;
    explanation_ta = `சரியானது. அதிகாரப்பூர்வ அரசு செய்திக்குறிப்பின்படி: ${fact.evidenceExcerpt}`;
  }

  // Verification Gate Call
  const verification = verifyDraftQuestion(
    {
      question_en,
      question_ta,
      options_en,
      options_ta,
      correctOptionIndex,
      explanation_en,
      explanation_ta,
      sourceEvidenceText: `${fact.evidenceExcerpt} ${fact.statement_en}`,
      category: fact.syllabusCategory,
      questionType: preferredType,
    },
    {
      ...DEFAULT_PIPELINE_CONFIG,
      autoPublishEnabled: false, // Strict safety invariant: Zero unreviewed auto-publishing
    }
  );

  return {
    id: qId,
    factIds: [fact.factId],
    eventId: fact.duplicateGroupId.replace('group_', ''),
    rawDocumentId: fact.factId,
    sourceUrl: fact.sourceUrl,
    monthKey: fact.monthKey,
    question_en,
    options_en,
    correctOptionIndex,
    explanation_en,
    question_ta,
    options_ta,
    explanation_ta,
    category: fact.syllabusCategory,
    difficulty: index % 3 === 0 ? 'hard' : (index % 2 === 0 ? 'medium' : 'easy'),
    examType: primaryExamGroup,
    questionType: preferredType,
    verificationReport: verification,
    overallStatus: 'REVIEW_REQUIRED', // Strict human-in-the-loop gate
    editorialApproval: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates the full CA-3 Bilingual Drafts Package from the verified facts manifest.
 */
export function generateCA3BilingualMcqPackage(
  manifestPath?: string
): GeneratedBilingualMcqPackage {
  const filePath = manifestPath || path.resolve(process.cwd(), 'data/ca-facts/verified_facts_2026_h1_h2.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Verified facts manifest not found at: ${filePath}`);
  }

  const rawJson = fs.readFileSync(filePath, 'utf-8');
  const manifest: VerifiedFactsManifest = JSON.parse(rawJson);

  const drafts: CADraftQuestion[] = [];
  const typeDist: Record<string, number> = {};
  const catDist: Record<string, number> = {};

  let passedCount = 0;
  let reviewRequiredCount = 0;
  let autoPublishPreventedCount = 0;

  for (let i = 0; i < manifest.facts.length; i++) {
    const fact = manifest.facts[i];
    const draft = generateBilingualDraftForFact(fact, i);
    drafts.push(draft);

    typeDist[draft.questionType] = (typeDist[draft.questionType] || 0) + 1;
    catDist[draft.category] = (catDist[draft.category] || 0) + 1;

    if (draft.verificationReport.factualConsistency && draft.verificationReport.unambiguousCorrectAnswer) {
      passedCount++;
    }
    if (draft.overallStatus === 'REVIEW_REQUIRED') {
      reviewRequiredCount++;
    }
    if (!draft.verificationReport.canAutoPublish) {
      autoPublishPreventedCount++;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceFactCount: manifest.facts.length,
    draftCount: drafts.length,
    drafts,
    typeDistribution: typeDist,
    categoryDistribution: catDist,
    verificationSummary: {
      passedCount,
      reviewRequiredCount,
      autoPublishPreventedCount,
    },
  };
}
