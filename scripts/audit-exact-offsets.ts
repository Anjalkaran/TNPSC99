import { ACTUAL_RETRIEVED_DOCUMENTS } from '../src/data/actual-retrieved-documents';

for (const [docKey, doc] of Object.entries(ACTUAL_RETRIEVED_DOCUMENTS)) {
  for (const loc of doc.verifiedEvidenceLocations) {
    const actualIdx = doc.fullContentText.indexOf(loc.excerptText);
    const expectedEnd = actualIdx !== -1 ? actualIdx + loc.excerptText.length : -1;
    const isExact = loc.startChar === actualIdx && loc.endChar === expectedEnd;
    console.log(`[${loc.candidateId}] in ${docKey}:`);
    console.log(`  Current offsets: [${loc.startChar}..${loc.endChar}]`);
    console.log(`  Actual index: [${actualIdx}..${expectedEnd}] (Length: ${loc.excerptText.length})`);
    console.log(`  Exact Match: ${isExact}`);
  }
}
