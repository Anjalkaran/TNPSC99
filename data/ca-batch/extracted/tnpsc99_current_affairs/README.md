# TNPSC99 Current Affairs Historical Backfill — Initial Batch

Coverage: 23 April–23 October 2026. **21 sourced bilingual MCQ drafts, 3 for each calendar month April–October.** These are an initial sample, **not** the complete six-month bank of 450–600 questions.

## Contents
- `tnpsc99_current_affairs_2026_draft_21.json`: canonical questions (English/Tamil, four options, answer, explanations, official PIB release URL, dated event, workflow status).
- `tnpsc99_current_affairs_2026_draft_21.csv`: editorial spreadsheet-friendly table.
- `import_drafts.mjs`: safe idempotent Firestore emulator draft import utility.
- `make_seed.py`: local generator/structural validator of the initial batch.

## Accuracy and editorial policy
All 21 questions are `REVIEW_REQUIRED`; `publicationAllowed:false`. Primary source URLs have been discovered via web search, **not exhaustively manually verified** for every option, translation, and historical correction. A human TNPSC editor should re-open each source, verify the exact assertion and all distractors, check Tamil terminology, and approve publication. Do not advertise these as verified/published.

## Safe import — emulator only
From the existing TNPSC99 Node repository where `firebase-admin` is installed:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node import_drafts.mjs --file=tnpsc99_current_affairs_2026_draft_21.json
# Explicit emulator write, only after inspection:
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node import_drafts.mjs --file=tnpsc99_current_affairs_2026_draft_21.json --apply
```

No option in this utility can write to production. Before any STAGING or PRODUCTION import, Antigravity must inspect the actual deployed schema, provision isolated staging, add appropriate security rules, validate question mapping and editorial approval, back up relevant collections, and prepare separate authorized scripts that leave the existing `questions` collection and old data untouched. Avoid Firestore Admin SDK access using shared production credentials in development.

## Next stages
Collect all six months by day from official Tamil Nadu, PIB and institutional releases. Deduplicate events, create syllabus-relevant MCQs, run automatic fact/translation/option validators and mandatory human editorial review. Import drafts into `currentAffairsQuestions` only; release daily/weekly tests from approved question IDs after application integration.
