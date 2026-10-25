import { CA_2026_DRAFT_MCQ_BANK } from '../src/data/ca-2026-draft-bank';
import { QUESTION_IDENTITY_REGISTRY } from '../src/data/ca-question-identity-registry';

console.log('Comparing CA_2026_DRAFT_MCQ_BANK with QUESTION_IDENTITY_REGISTRY:');
const v2Records = QUESTION_IDENTITY_REGISTRY.filter(q => q.series === 'v2_verified_source_first');

for (const v2 of v2Records) {
  const legacyId = v2.legacyAliases[0];
  const mcq = CA_2026_DRAFT_MCQ_BANK.find(m => m.id === legacyId);
  console.log(`\nRegistry: ${v2.canonicalId} (${legacyId}) - ${v2.subjectTitle}`);
  console.log(`  Reg docId: ${v2.officialDocumentId}`);
  if (mcq) {
    console.log(`  MCQ question: ${mcq.question_en.slice(0, 60)}...`);
    console.log(`  MCQ correct: ${mcq.options_en[mcq.correctOptionIndex]}`);
  } else {
    console.log(`  MCQ NOT FOUND`);
  }
}
