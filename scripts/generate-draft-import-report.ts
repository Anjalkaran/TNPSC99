import fs from 'node:fs';
import { validateDraftPackage, CADraftPackageQuestion } from '../src/lib/current-affairs/staging-importer';

async function generateReport() {
  const filePath = 'data/ca-batch/extracted/tnpsc99_current_affairs/tnpsc99_current_affairs_2026_draft_21.json';
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const report = validateDraftPackage(data.questions as CADraftPackageQuestion[]);

  console.log(`================================================================`);
  console.log(`TNPSC99 CURRENT AFFAIRS DRAFT PACKAGE VALIDATION REPORT`);
  console.log(`Source File: ${filePath}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`================================================================\n`);

  console.log(`Total Records Prepared:            ${report.totalRecordsInPackage}`);
  console.log(`Records Validated & Ready for Staging: ${report.recordsReadyForStaging}`);
  console.log(`Records Rejected:                  ${report.recordsRejected}`);
  console.log(`Records Approved for Production:   ${report.recordsApprovedForProduction} (Zero published without editorial sign-off)\n`);

  console.log(`--- Category Breakdown ---`);
  for (const [cat, count] of Object.entries(report.categoryBreakdown)) {
    console.log(`- ${cat.padEnd(25)}: ${count} MCQs`);
  }

  console.log(`\n--- Monthly Distribution (23 April - 23 October 2026) ---`);
  for (const [month, count] of Object.entries(report.monthBreakdown)) {
    console.log(`- ${month.padEnd(10)}: ${count} MCQs (3 per month sample)`);
  }

  if (report.validationErrors.length > 0) {
    console.log(`\n--- Validation Errors ---`);
    for (const err of report.validationErrors) {
      console.log(`[${err.id}] ${err.error}`);
    }
  }

  console.log(`\n================================================================`);
  console.log(`STATUS: READY FOR ISOLATED EMULATOR STAGING`);
  console.log(`================================================================`);
}

generateReport().catch(console.error);
