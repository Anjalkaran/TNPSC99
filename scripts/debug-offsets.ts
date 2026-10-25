import { ACTUAL_RETRIEVED_DOCUMENTS } from '../src/data/actual-retrieved-documents';

const doc = ACTUAL_RETRIEVED_DOCUMENTS['PIB PRID 2324120'];
console.log('Doc text length:', doc.fullContentText.length);
const loc = doc.verifiedEvidenceLocations[0];
console.log('Loc:', loc);
const slice = doc.fullContentText.slice(loc.startChar, loc.endChar);
console.log('Slice:', JSON.stringify(slice));
console.log('Expected:', JSON.stringify(loc.excerptText));
console.log('Slice === Expected:', slice === loc.excerptText);
console.log('indexOf expected:', doc.fullContentText.indexOf(loc.excerptText));
console.log('expected length:', loc.excerptText.length);
