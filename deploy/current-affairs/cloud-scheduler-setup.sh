#!/usr/bin/env bash
# Cloud Scheduler Automation Setup for TNPSC99 Current Affairs Pipeline
# Timezone: Asia/Kolkata (UTC +05:30)
# Region: us-central1
# Project: studio-5029416251-928dd

PROJECT_ID="studio-5029416251-928dd"
REGION="us-central1"
JOB_NAME="tnpsc99-ca-pipeline-worker"
SERVICE_ACCOUNT="firebase-app-hosting-compute@studio-5029416251-928dd.iam.gserviceaccount.com"

echo "Configuring Google Cloud Scheduler triggers for TNPSC99 Current Affairs Pipeline..."

# 1. 05:00 IST: Source Ingestion (23:30 UTC previous day)
gcloud scheduler jobs create http ca-0500-source-ingest \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="30 23 * * *" \
  --time-zone="Asia/Kolkata" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method=POST \
  --oauth-service-account-email="${SERVICE_ACCOUNT}" \
  --description="05:00 IST: Ingest official sources (TN DIPR, PIB, ISRO, RBI)"

# 2. 06:00 IST: Event & Fact Extraction (00:30 UTC)
gcloud scheduler jobs create http ca-0600-fact-extraction \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="30 0 * * *" \
  --time-zone="Asia/Kolkata" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method=POST \
  --oauth-service-account-email="${SERVICE_ACCOUNT}" \
  --description="06:00 IST: Deduplicate events and extract atomic facts"

# 3. 07:00 IST: MCQ Generation & Independent Verification (01:30 UTC)
gcloud scheduler jobs create http ca-0700-mcq-draft-verify \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="30 1 * * *" \
  --time-zone="Asia/Kolkata" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method=POST \
  --oauth-service-account-email="${SERVICE_ACCOUNT}" \
  --description="07:00 IST: Generate candidate MCQs and run multi-stage independent verification"

# 4. 08:00 IST: Publication Gate & Daily Test Assembly (02:30 UTC)
gcloud scheduler jobs create http ca-0800-publish-assemble \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="30 2 * * *" \
  --time-zone="Asia/Kolkata" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method=POST \
  --oauth-service-account-email="${SERVICE_ACCOUNT}" \
  --description="08:00 IST: Publication gate, manifest assembly, and Daily Current Affairs release"

# 5. Sunday 09:00 IST: Weekly Test Assembler (03:30 UTC Sunday)
gcloud scheduler jobs create http ca-sunday-weekly-assemble \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --schedule="30 3 * * 0" \
  --time-zone="Asia/Kolkata" \
  --uri="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run" \
  --http-method=POST \
  --oauth-service-account-email="${SERVICE_ACCOUNT}" \
  --description="Sunday 09:00 IST: Assemble 50-question Weekly Current Affairs Test from approved IDs"

echo "Cloud Scheduler configuration script ready. (Do not execute without explicit user authorization)."
