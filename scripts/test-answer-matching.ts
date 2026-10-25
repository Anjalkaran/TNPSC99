import { ACTUAL_RETRIEVED_DOCUMENTS } from '../src/data/actual-retrieved-documents';
import { QUESTION_IDENTITY_REGISTRY } from '../src/data/ca-question-identity-registry';
import { CA_2026_DRAFT_MCQ_BANK } from '../src/data/ca-2026-draft-bank';

const v2Active = QUESTION_IDENTITY_REGISTRY.filter(q => q.series === 'v2_verified_source_first' && q.lifecycleStatus === 'VERIFIED_ACTIVE');

for (const v2 of v2Active) {
  const legacyId = v2.legacyAliases[0];
  const mcq = CA_2026_DRAFT_MCQ_BANK.find(m => m.id === legacyId)!;
  const doc = ACTUAL_RETRIEVED_DOCUMENTS[v2.officialDocumentId];
  const correct = mcq.options_en[mcq.correctOptionIndex];
  
  // Extract key terms (numbers or words > 3 letters)
  const terms = correct.split(/[\s,()]+/).filter(w => w.length > 2 || /\d/.test(w));
  const docText = doc.fullContentText;
  const matchingTerms = terms.filter(t => docText.toLowerCase().includes(t.toLowerCase()));
  const allTermsMatch = matchingTerms.length === terms.length;
  
  console.log(`[${v2.canonicalId}] Answer: "${correct}"`);
  console.log(`  Terms: ${JSON.stringify(terms)}`);
  console.log(`  Matched: ${JSON.stringify(matchingTerms)} (${matchingTerms.length}/${terms.length})`);
}
