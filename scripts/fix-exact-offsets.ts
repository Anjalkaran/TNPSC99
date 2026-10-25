import * as fs from 'fs';
import * as path from 'path';
import { ACTUAL_RETRIEVED_DOCUMENTS } from '../src/data/actual-retrieved-documents';

const filePath = path.resolve(__dirname, '../src/data/actual-retrieved-documents.ts');
let content = fs.readFileSync(filePath, 'utf8');

for (const [docKey, doc] of Object.entries(ACTUAL_RETRIEVED_DOCUMENTS)) {
  for (const loc of doc.verifiedEvidenceLocations) {
    const actualIdx = doc.fullContentText.indexOf(loc.excerptText);
    if (actualIdx === -1) {
      console.error(`Excerpt not found in ${docKey}!`);
      continue;
    }
    const expectedEnd = actualIdx + loc.excerptText.length;
    
    // Replace old offsets with exact
    const oldBlock = `startChar: ${loc.startChar},\n        endChar: ${loc.endChar},`;
    const newBlock = `startChar: ${actualIdx},\n        endChar: ${expectedEnd},`;
    
    if (content.includes(oldBlock)) {
      content = content.replace(oldBlock, newBlock);
      console.log(`Updated ${loc.candidateId} in ${docKey}: [${actualIdx}..${expectedEnd}]`);
    } else {
      console.warn(`Could not find old block for ${loc.candidateId}: startChar: ${loc.startChar}, endChar: ${loc.endChar}`);
    }
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated exact character offsets in actual-retrieved-documents.ts!');
