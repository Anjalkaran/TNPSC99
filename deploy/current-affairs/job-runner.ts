/**
 * Cloud Run Job Worker Entry Point for TNPSC99 Current Affairs Pipeline
 * Triggered by Cloud Scheduler via HTTP or Cloud Run Job execution.
 */
import { executeDailyPipeline } from '../../src/lib/current-affairs/daily-pipeline';
import { DEFAULT_PIPELINE_CONFIG } from '../../src/lib/current-affairs/types';

async function main() {
  const stage = process.env.STAGE || process.argv.slice(2).find((a) => a.startsWith('--stage='))?.split('=')[1] || 'all';
  const today = new Date().toISOString().split('T')[0];
  const isSunday = new Date().getDay() === 0;

  console.log(`[CA-Worker] Starting Current Affairs Pipeline Execution...`);
  console.log(`[CA-Worker] Target Date: ${today}`);
  console.log(`[CA-Worker] Scheduled Stage: ${stage}`);
  console.log(`[CA-Worker] Timezone: Asia/Kolkata`);
  console.log(`[CA-Worker] Auto-Publish: ${DEFAULT_PIPELINE_CONFIG.autoPublishEnabled ? 'ENABLED' : 'DISABLED (REVIEW_REQUIRED default)'}`);

  const mockPayload = [
    {
      sourceId: 'SRC_TN_DIPR_PRESS',
      canonicalUrl: `https://www.tn.gov.in/pressrelease/${today}/daily-bulletin`,
      title: 'Tamil Nadu Cabinet Decisions on Infrastructure and Welfare',
      title_ta: 'தமிழ்நாடு அமைச்சரவை கூட்டத்தில் புதிய உள்கட்டமைப்பு மற்றும் நலத்திட்ட முடிவுகள்',
      rawPayload: `
        <html><body>
          <h1>தமிழ்நாடு அரசு செய்திக்குறிப்பு</h1>
          <p>நாள்: ${today}. மாண்புமிகு முதலமைச்சர் தலைமையில் நடைபெற்ற அமைச்சரவை கூட்டத்தில் மாநிலத்தின் உள்கட்டமைப்பு மற்றும் கல்வித் திட்டங்களுக்கு ரூ. 2,500 கோடி நிதி ஒதுக்கீடு செய்யப்பட்டுள்ளது.</p>
        </body></html>
      `,
      publicationDate: today,
      eventDate: today,
    },
    {
      sourceId: 'SRC_ISRO_MISSIONS',
      canonicalUrl: `https://www.isro.gov.in/updates/${today}/mission-brief`,
      title: 'ISRO Completes Key Flight Qualification Test for Heavy Launch Vehicle',
      title_ta: 'இஸ்ரோவின் கனரக ராக்கெட் விண்கலத்தின் முக்கிய தகுதி சோதனை வெற்றி',
      rawPayload: `
        <html><body>
          <p>Indian Space Research Organisation successfully completed CE-20 cryogenic engine flight qualification test for the upcoming Gaganyaan mission.</p>
        </body></html>
      `,
      publicationDate: today,
      eventDate: today,
    },
  ];

  const result = await executeDailyPipeline(today, mockPayload, new Set(), DEFAULT_PIPELINE_CONFIG, isSunday);

  console.log(`\n[CA-Worker] Execution Finished. Status: ${result.runRecord.status}`);
  console.log(`[CA-Worker] Raw Docs Ingested: ${result.runRecord.metrics.rawDocumentsIngested}`);
  console.log(`[CA-Worker] Events Extracted: ${result.runRecord.metrics.eventsExtracted}`);
  console.log(`[CA-Worker] Drafts Generated: ${result.runRecord.metrics.draftsGenerated}`);
  console.log(`[CA-Worker] Verified Count: ${result.runRecord.metrics.verifiedCount}`);
  console.log(`[CA-Worker] Routed to Review: ${result.runRecord.metrics.routedToReviewCount}`);
  console.log(`[CA-Worker] Auto-Published: ${result.runRecord.metrics.autoPublishedCount}`);
  console.log(`[CA-Worker] Estimated Cost: $${result.runRecord.metrics.estimatedCostUSD.toFixed(4)} (₹${result.runRecord.metrics.estimatedCostINR})`);

  if (result.dailyManifest) {
    console.log(`[CA-Worker] Daily Test Manifest Assembled: ${result.dailyManifest.id} (${result.dailyManifest.questionCount} Questions)`);
  }
}

main().catch((err) => {
  console.error('[CA-Worker] FATAL PIPELINE ERROR:', err);
  process.exit(1);
});
