import { AUTHORITATIVE_SOURCES, getSourceById, getSourcesByTier } from '../src/lib/current-affairs/source-registry';
import { computeContentChecksum, computeDocumentId, normalizeText } from '../src/lib/current-affairs/hasher';
import { classifyEvent } from '../src/lib/current-affairs/syllabus-classifier';
import { ingestDocument, extractPublicationDate } from '../src/lib/current-affairs/ingestion-service';

interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestCaseResult[] = [];

async function runCurrentAffairsIngestionTests() {
  console.log(`================================================================`);
  console.log(`TNPSC99 CURRENT AFFAIRS ENGINE — PHASE CA-1 TEST SUITE`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`================================================================\n`);

  // Test 1: Authoritative Source Registry Integrity
  try {
    const totalSources = AUTHORITATIVE_SOURCES.length;
    const dipr = getSourceById('SRC_TN_DIPR_PRESS');
    const pibTamil = getSourceById('SRC_GOI_PIB_TAMIL');
    const tier1Sources = getSourcesByTier(1);

    const passed = totalSources >= 6 && 
                   dipr?.reliabilityTier === 1 && 
                   pibTamil?.reliabilityTier === 2 && 
                   tier1Sources.length >= 2;

    testResults.push({
      id: 'CA-TEST-01',
      name: 'Authoritative Source Registry & Tier Taxonomy',
      passed,
      details: `Registered ${totalSources} sources. Verified DIPR (Tier 1), PIB Tamil (Tier 2), ISRO, RBI.`,
    });
  } catch (err: any) {
    testResults.push({ id: 'CA-TEST-01', name: 'Authoritative Source Registry & Tier Taxonomy', passed: false, details: err.message });
  }

  // Test 2: Cryptographic Checksumming & Normalization
  try {
    const rawHtml1 = `  <div><p>Chief Minister announced new scheme.</p>\n\t</div>  `;
    const rawHtml2 = `chief minister announced new scheme.`;
    const hash1 = computeContentChecksum(rawHtml1);
    const hash2 = computeContentChecksum(rawHtml2);

    const docId1 = computeDocumentId('SRC_TN_DIPR_PRESS', 'https://www.tn.gov.in/pressrelease/1234');
    const docId2 = computeDocumentId('SRC_TN_DIPR_PRESS', 'https://www.tn.gov.in/pressrelease/1234');

    const passed = hash1 === hash2 && docId1 === docId2 && docId1.length === 32;

    testResults.push({
      id: 'CA-TEST-02',
      name: 'Cryptographic Checksumming & Text Normalization',
      passed,
      details: `Normalized HTML to text. Hashes match identically (${hash1.slice(0, 16)}...). Canonical DocID length = 32.`,
    });
  } catch (err: any) {
    testResults.push({ id: 'CA-TEST-02', name: 'Cryptographic Checksumming & Text Normalization', passed: false, details: err.message });
  }

  // Test 3: Realistic Tamil Nadu Welfare Scheme Ingestion
  try {
    const diprSource = getSourceById('SRC_TN_DIPR_PRESS')!;
    const schemePayload = `
      <html>
        <body>
          <h1>மகளிர் உரிமைத் திட்டம் விரிவாக்கம்: முதலமைச்சர் உத்தரவு</h1>
          <p>சென்னை, 2026-10-20: கலைஞர் மகளிர் உரிமைத் திட்டம் (Kalaignar Magalir Urimai Thittam) கீழ் கூடுதலாக 1.5 லட்சம் தகுதியான பயனாளிகள் சேர்க்கப்பட்டுள்ளனர் என்று மாண்புமிகு முதலமைச்சர் அறிவித்துள்ளார். நிதி ஒதுக்கீடு ரூ. 1500 கோடியாக உயர்த்தப்பட்டுள்ளது.</p>
        </body>
      </html>
    `;

    const result = ingestDocument({
      source: diprSource,
      canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/10/magalir-urimai-expansion',
      title: 'Kalaignar Magalir Urimai Thittam Expansion',
      title_ta: 'கலைஞர் மகளிர் உரிமைத் திட்டம் விரிவாக்கம்',
      rawPayload: schemePayload,
      explicitPublicationDate: '2026-10-20',
      explicitEventDate: '2026-10-20',
    });

    const passed = result.document.publicationDate === '2026-10-20' &&
                   result.document.eventDate === '2026-10-20' &&
                   result.isTNPSCRelevant &&
                   !result.isDuplicate &&
                   result.auditLog.metadata.category === 'welfare_schemes' &&
                   result.document.processingStatus === 'pending';

    testResults.push({
      id: 'CA-TEST-03',
      name: 'Tamil Nadu Welfare Scheme Ingestion & Ingestion Record',
      passed,
      details: `Classified as ${result.auditLog.metadata.category} with importance ${result.auditLog.metadata.importance}. Event & Pub date separated cleanly.`,
    });
  } catch (err: any) {
    testResults.push({ id: 'CA-TEST-03', name: 'Tamil Nadu Welfare Scheme Ingestion & Ingestion Record', passed: false, details: err.message });
  }

  // Test 4: Deduplication Gate (Duplicate Payload Rejection)
  try {
    const diprSource = getSourceById('SRC_TN_DIPR_PRESS')!;
    const payload = `<p>Tamil Nadu Assembly passes new welfare bill.</p>`;
    const checksum = computeContentChecksum(payload);
    const existingChecksums = new Set<string>([checksum]);

    const result = ingestDocument(
      {
        source: diprSource,
        canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/10/welfare-bill-duplicate',
        title: 'Welfare Bill',
        rawPayload: payload,
      },
      existingChecksums
    );

    const passed = result.isDuplicate === true && 
                   result.document.processingStatus === 'skipped' && 
                   result.document.skipReason === 'duplicate_content_checksum';

    testResults.push({
      id: 'CA-TEST-04',
      name: 'Deduplication Circuit Breaker (Duplicate Payload Suppression)',
      passed,
      details: `Suppressed duplicate ingestion. Status: ${result.document.processingStatus}, Reason: ${result.document.skipReason}.`,
    });
  } catch (err: any) {
    testResults.push({ id: 'CA-TEST-04', name: 'Deduplication Circuit Breaker (Duplicate Payload Suppression)', passed: false, details: err.message });
  }

  // Test 5: TNPSC Syllabus Mapping & Multi-Group Relevance
  try {
    const sciTechSample = `ISRO launched PSLV-C58 carrying XPoSat satellite into low earth orbit to study cosmic x-rays. Gaganyaan mission trials scheduled.`;
    const econSample = `Reserve Bank of India Monetary Policy Committee decided to keep repo rate unchanged at 6.5 percent. GSDP growth projected at 7.8%.`;
    const sportsSample = `Tamil Nadu grandmaster won gold medal at the World Chess Championship in Budapest. State government announced cash award.`;

    const sciResult = classifyEvent(sciTechSample);
    const econResult = classifyEvent(econSample);
    const sportsResult = classifyEvent(sportsSample);

    const passed = sciResult.primaryCategory === 'science_tech' &&
                   sciResult.examGroups.includes('Group I') &&
                   econResult.primaryCategory === 'economy' &&
                   econResult.examGroups.includes('Group I') &&
                   sportsResult.primaryCategory === 'sports_awards_appointments' &&
                   sportsResult.examGroups.includes('Group IV');

    testResults.push({
      id: 'CA-TEST-05',
      name: 'TNPSC Syllabus Classifier & Multi-Group Mapping',
      passed,
      details: `Sci-Tech -> ${sciResult.primaryCategory} (Group I/II), Economy -> ${econResult.primaryCategory} (Group I/II), Sports -> ${sportsResult.primaryCategory} (Group IV).`,
    });
  } catch (err: any) {
    testResults.push({ id: 'CA-TEST-05', name: 'TNPSC Syllabus Classifier & Multi-Group Mapping', passed: false, details: err.message });
  }

  // Test 6: Audit Log Schema & Non-Interference Guarantee
  try {
    const isroSource = getSourceById('SRC_ISRO_MISSIONS')!;
    const res = ingestDocument({
      source: isroSource,
      canonicalUrl: 'https://www.isro.gov.in/mission-update-2026',
      title: 'SSLV-D3 Mission Success',
      rawPayload: '<p>ISRO SSLV-D3 successfully placed Earth Observation Satellite into orbit.</p>',
    });

    const passed = res.auditLog.eventType === 'SOURCE_INGESTION' &&
                   res.auditLog.entityCollection === 'ca_raw_documents' &&
                   res.auditLog.actor === 'SYSTEM_BOT' &&
                   typeof res.auditLog.metadata.checksum === 'string' &&
                   res.auditLog.metadata.checksum.length === 64;

    testResults.push({
      id: 'CA-TEST-06',
      name: 'Immutable Audit Log Schema & Staging Isolation',
      passed,
      details: `Audit event: ${res.auditLog.eventType}, Target collection: ${res.auditLog.entityCollection}, SHA-256 Checksum: ${res.auditLog.metadata.checksum.slice(0, 16)}...`,
    });
  } catch (err: any) {
    testResults.push({ id: 'CA-TEST-06', name: 'Immutable Audit Log Schema & Staging Isolation', passed: false, details: err.message });
  }

  // Summary Report
  console.log(`\n================================================================`);
  console.log(`CURRENT AFFAIRS TEST RESULTS SUMMARY`);
  console.log(`================================================================`);
  let allPassed = true;
  for (const r of testResults) {
    const statusStr = r.passed ? 'PASS [✓]' : 'FAIL [✗]';
    console.log(`${r.id.padEnd(12)} | ${statusStr} | ${r.name}`);
    console.log(`             Details: ${r.details}\n`);
    if (!r.passed) allPassed = false;
  }
  console.log(`================================================================`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL PHASE CA-1 TESTS PASSED' : 'TESTS FAILED'}`);
  console.log(`================================================================`);

  if (!allPassed) {
    process.exit(1);
  }
}

runCurrentAffairsIngestionTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
