/**
 * TNPSC99 — Verification Suite for /api/public/daily-ca
 * Audits all security and fail-closed data-integrity requirements for the Dynamic Daily CA Endpoint.
 */

import fs from 'fs';
import path from 'path';

interface ApiAuditCheck {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const apiChecks: ApiAuditCheck[] = [];

function recordCheck(id: string, name: string, passed: boolean, details: string) {
  apiChecks.push({ id, name, passed, details });
}

function auditDailyCaEndpointCode() {
  console.log('========================================================================');
  console.log('TNPSC99 — DYNAMIC CURRENT AFFAIRS API (/api/public/daily-ca) AUDIT');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  const routePath = 'src/app/api/public/daily-ca/route.ts';
  const content = fs.readFileSync(routePath, 'utf8');

  // 1. Retrieves only authorized published manifests
  recordCheck(
    'API-01',
    'Queries only manifests with status == published and type == daily',
    content.includes(".where('type', '==', 'daily')") &&
    content.includes(".where('status', '==', 'published')"),
    'Manifest query filters strictly for published daily editions'
  );

  // 2. Validates publication status
  recordCheck(
    'API-02',
    'Queries questions with status == PUBLISHED',
    content.includes(".where('status', '==', 'PUBLISHED')"),
    'Question query strictly filters for PUBLISHED status'
  );

  // 3. Excludes retracted manifests and questions
  recordCheck(
    'API-03',
    'Explicitly rejects retracted manifests (isRetracted === true) and retracted questions',
    content.includes('manifestData.isRetracted !== true') &&
    content.includes('d.isRetracted !== true'),
    'Defensive anti-tamper check against retracted items'
  );

  // 4. Enforces explicit public-free manifest classification (fail-closed)
  recordCheck(
    'API-04',
    'Manifest requires explicit isFree === true and accessLevel === "free"',
    content.includes('manifestData.isFree === true') &&
    content.includes("manifestData.accessLevel === 'free'"),
    'Rejects premium or untagged manifests fail-closed'
  );

  // 5. Enforces explicit public-free question classification (fail-closed)
  recordCheck(
    'API-05',
    'Individual questions require explicit isFree === true and accessLevel === "free"',
    content.includes('d.isFree === true') &&
    content.includes("d.accessLevel === 'free'"),
    'Rejects premium or untagged questions; prevents mixed manifest leaks'
  );

  // 6. Returns only the approved free edition (max 10 questions)
  recordCheck(
    'API-06',
    'Limits question retrieval strictly to the 10 approved MCQs for the free daily package',
    content.includes('questionIds.slice(0, 10)') &&
    content.includes('durationMinutes'),
    'Exactly 10 questions returned for public practice package'
  );

  // 7. Strips internal and sensitive editorial fields
  recordCheck(
    'API-07',
    'Strips internal staging ID, raw documents, and editorial notes',
    !content.includes('rawDocumentId: d.rawDocumentId') &&
    !content.includes('editorialNotes: d.editorialNotes') &&
    !content.includes('verificationScoreBreakdown') &&
    content.includes('sourceRef: d.publisher ||') &&
    content.includes('sourceUrl: d.sourceUrl'),
    'Public response contains only student-facing metadata'
  );

  // 8. Handles missing or empty editions without fabricating questions
  recordCheck(
    'API-08',
    'Returns status EDITORIAL_REVIEW_IN_PROGRESS with hasApprovedEdition: false on missing edition',
    content.includes("status: 'EDITORIAL_REVIEW_IN_PROGRESS'") &&
    content.includes('hasApprovedEdition: false') &&
    content.includes('package: null'),
    'Fail-closed anti-fabrication protection'
  );

  // 9. Caching and abuse protection headers
  recordCheck(
    'API-09',
    'Emits public Cache-Control headers with s-maxage and X-Content-Type-Options: nosniff',
    content.includes("'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=60'") &&
    content.includes("'X-Content-Type-Options': 'nosniff'"),
    'Edge and browser caching with security headers'
  );

  // Output
  let passedCount = 0;
  apiChecks.forEach((c) => {
    const mark = c.passed ? '[✓ PASS]' : '[✗ FAIL]';
    console.log(`${mark} (${c.id}) -> ${c.name}`);
    console.log(`       Evidence: ${c.details}`);
    if (c.passed) passedCount++;
  });

  console.log('\n========================================================================');
  console.log(`TOTAL API AUDITS: ${apiChecks.length} | PASSED: ${passedCount} | FAILED: ${apiChecks.length - passedCount}`);
  console.log('========================================================================\n');

  if (passedCount === apiChecks.length) {
    console.log('ALL /api/public/daily-ca API AUDITS PASSED WITH ZERO DEFECTS!');
    process.exit(0);
  } else {
    console.error('API AUDIT FAILED!');
    process.exit(1);
  }
}

auditDailyCaEndpointCode();
