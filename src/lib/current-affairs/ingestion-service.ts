import { CARawDocument, CASource, CAAuditLog } from './types';
import { computeDocumentId, computeContentChecksum, normalizeText } from './hasher';
import { classifyEvent } from './syllabus-classifier';

export interface IngestionInput {
  source: CASource;
  canonicalUrl: string;
  title: string;
  title_ta?: string;
  rawPayload: string;
  contentType?: 'text/html' | 'application/xml' | 'application/pdf';
  explicitPublicationDate?: string; // YYYY-MM-DD
  explicitEventDate?: string; // YYYY-MM-DD
}

export interface IngestionResult {
  document: CARawDocument;
  isDuplicate: boolean;
  isTNPSCRelevant: boolean;
  auditLog: CAAuditLog;
}

/**
 * Extracts publication date from common date string formats or uses today's date.
 */
export function extractPublicationDate(rawText: string, fallbackDate?: string): string {
  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
    return fallbackDate;
  }

  // Look for standard date patterns like '23 Oct 2026', '23-10-2026', '2026-10-23'
  const isoMatch = rawText.match(/\b(202\d{1})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const ddmmyyyyMatch = rawText.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](202\d{1})\b/);
  if (ddmmyyyyMatch) {
    return `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2]}-${ddmmyyyyMatch[1]}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Core Ingestion Engine: parses, normalizes, detects duplicates, and formats an immutable raw document.
 */
export function ingestDocument(
  input: IngestionInput,
  existingChecksums: Set<string> = new Set()
): IngestionResult {
  const { source, canonicalUrl, title, title_ta, rawPayload, contentType = 'text/html' } = input;
  
  const contentText = normalizeText(rawPayload);
  const contentChecksum = computeContentChecksum(rawPayload);
  const documentId = computeDocumentId(source.id, canonicalUrl);
  
  const isDuplicate = existingChecksums.has(contentChecksum);
  const pubDate = extractPublicationDate(rawPayload, input.explicitPublicationDate);
  const eventDate = input.explicitEventDate || pubDate;

  // Determine relevance using syllabus classifier
  const classification = classifyEvent(`${title} ${contentText.slice(0, 500)}`);
  const isTNPSCRelevant = classification.importanceScore >= 2;

  const document: CARawDocument = {
    id: documentId,
    sourceId: source.id,
    canonicalUrl,
    title,
    title_ta,
    publicationDate: pubDate,
    eventDate,
    ingestedAt: new Date().toISOString(),
    contentRaw: rawPayload,
    contentText,
    contentChecksum,
    contentType,
    language: source.language,
    processingStatus: isDuplicate ? 'skipped' : (isTNPSCRelevant ? 'pending' : 'skipped'),
    skipReason: isDuplicate ? 'duplicate_content_checksum' : (!isTNPSCRelevant ? 'low_tnpsc_relevance' : undefined),
    retryCount: 0,
  };

  const auditLog: CAAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    eventType: 'SOURCE_INGESTION',
    entityId: document.id,
    entityCollection: 'ca_raw_documents',
    actor: 'SYSTEM_BOT',
    metadata: {
      sourceId: source.id,
      canonicalUrl,
      checksum: contentChecksum,
      isDuplicate,
      isTNPSCRelevant,
      category: classification.primaryCategory,
      importance: classification.importanceScore,
    },
  };

  return {
    document,
    isDuplicate,
    isTNPSCRelevant,
    auditLog,
  };
}
