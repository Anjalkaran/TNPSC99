import { GET } from '../src/app/api/admin/accuracy-audit/route';
import { NextRequest } from 'next/server';

async function testSecurity() {
  console.log('=== VERIFYING /api/admin/accuracy-audit SECURITY ===\n');

  // Test 1: Anonymous request
  const reqAnon = new NextRequest('http://localhost:3000/api/admin/accuracy-audit');
  const resAnon = await GET(reqAnon);
  console.log(`[1] Anonymous Request: Status = ${resAnon.status} (Expected 401)`);
  const dataAnon = await resAnon.json();
  console.log(`    Response: ${JSON.stringify(dataAnon)}`);

  // Test 2: Standard Student / Unauthorized Bearer token
  const reqStudent = new NextRequest('http://localhost:3000/api/admin/accuracy-audit', {
    headers: {
      Authorization: 'Bearer invalid_or_student_token_xyz',
    },
  });
  const resStudent = await GET(reqStudent);
  console.log(`\n[2] Invalid / Non-Admin Token: Status = ${resStudent.status} (Expected 401)`);

  // Test 3: Authorized Administrative Request via Server Key
  const reqAdmin = new NextRequest('http://localhost:3000/api/admin/accuracy-audit', {
    headers: {
      'x-admin-audit-key': process.env.ADMIN_AUDIT_INTERNAL_SECRET || 'tnpsc99_admin_audit_secret_internal_p0',
    },
  });
  const resAdmin = await GET(reqAdmin);
  console.log(`\n[3] Authenticated Admin Request: Status = ${resAdmin.status} (Expected 200)`);
  const dataAdmin = await resAdmin.json();
  console.log(`    Total Distinct Questions: ${dataAdmin.platformBreakdown?.totalDistinctQuestions}`);
  console.log(`    Mutually Exclusive Statuses: ${JSON.stringify(dataAdmin.platformBreakdown?.mutuallyExclusiveStatuses)}`);
  console.log(`    Cumulative Milestones: ${JSON.stringify(dataAdmin.platformBreakdown?.cumulativeMilestones)}`);
  console.log(`    Retracted Audit Log: ${JSON.stringify(dataAdmin.retractedQuestionsAudit)}`);

  const passed =
    resAnon.status === 401 &&
    resStudent.status === 401 &&
    resAdmin.status === 200 &&
    dataAdmin.platformBreakdown?.totalDistinctQuestions === 40 &&
    dataAdmin.platformBreakdown?.mutuallyExclusiveStatuses?.published === 38 &&
    dataAdmin.platformBreakdown?.mutuallyExclusiveStatuses?.retracted === 2;

  if (passed) {
    console.log('\n✓ ALL ADMIN ENDPOINT SECURITY & ACCURACY INVARIANTS SATISFIED!');
    process.exit(0);
  } else {
    console.error('\n✗ SECURITY CONTRACT FAILED');
    process.exit(1);
  }
}

testSecurity().catch(e => {
  console.error(e);
  process.exit(1);
});
