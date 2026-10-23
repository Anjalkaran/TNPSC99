/**
 * TNPSC99 Current Affairs seed importer, deliberately emulator-only.
 * From an existing TNPSC99 Node repository with firebase-admin installed:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node import_drafts.mjs --file=... [--apply]
 * --apply is required to write; otherwise a dry-run prints validation/counts.
 * This tool NEVER writes to production, even with --apply.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const fileArg = args.find(x => x.startsWith('--file='));
if (!fileArg) { console.error('Usage: node import_drafts.mjs --file=seed.json [--apply]'); process.exit(2); }
const file = fileArg.split('=').slice(1).join('=');
const data = JSON.parse(fs.readFileSync(file,'utf8'));
if (!Array.isArray(data.questions)) throw new Error('No questions array');
const seen = new Set();
for (const q of data.questions) {
  if (!/^ca26_[a-f0-9]{12}$/.test(q.id) || seen.has(q.id)) throw new Error(`Invalid/duplicate id: ${q.id}`);
  seen.add(q.id);
  if (!/^2026-(0[4-9]|10)-\d\d$/.test(q.eventDate) || q.eventDate < '2026-04-23' || q.eventDate > '2026-10-23') throw new Error(`Out-of-range date: ${q.id}`);
  if (!['REVIEW_REQUIRED','DRAFT'].includes(q.status) || q.verification?.publicationAllowed !== false || q.editorialApproval !== null) throw new Error(`Unsafe publication state: ${q.id}`);
  if (q.options.length !== 4 || q.correctOptionIndex < 0 || q.correctOptionIndex > 3) throw new Error(`Invalid options: ${q.id}`);
  for (const lang of ['en','ta']) if (!q.question?.[lang] || !q.explanation?.[lang] || q.options.some(o => !o[lang])) throw new Error(`Missing bilingual text: ${q.id}`);
  if (!q.sources?.length || q.sources.some(s => !s.url.startsWith('https://www.pib.gov.in/'))) throw new Error(`Source not allowlisted: ${q.id}`);
}
const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
console.log(JSON.stringify({count: data.questions.length,idsUnique:seen.size,fileSha256:sha,writeEnabled:args.includes('--apply'),collection:'currentAffairsQuestions',status:'REVIEW_REQUIRED'},null,2));
if (!args.includes('--apply')) { console.log('DRY RUN ONLY — no DB write.'); process.exit(0); }
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Refusing writes: FIRESTORE_EMULATOR_HOST required');
if (!/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw new Error('Refusing writes: emulator must be localhost');
const { initializeApp, getApps } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
if (!getApps().length) initializeApp({projectId:'tnpsc99-current-affairs-emulator'});
const db = getFirestore();
let created = 0,skipped = 0;
for (const q of data.questions) {
 const ref = db.collection('currentAffairsQuestions').doc(q.id);
 try { await ref.create({...q,importedAt:new Date().toISOString(),sourceBatchSha256:sha}); created++; }
 catch(e) { if (e.code === 6 || e.code === 'already-exists') skipped++; else throw e; }
}
console.log(JSON.stringify({created,skipped,emulator:process.env.FIRESTORE_EMULATOR_HOST}));
