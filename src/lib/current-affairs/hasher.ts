import { createHash } from 'crypto';

/**
 * Normalizes text content for consistent hash generation.
 * Strips HTML tags, trims whitespace, condenses multiple spaces and newlines.
 */
export function normalizeText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/<[^>]+>/g, ' ') // Strip HTML tags
    .replace(/[\r\n\t]+/g, ' ') // Replace newlines and tabs with space
    .replace(/\s+/g, ' ') // Condense spaces
    .trim()
    .toLowerCase();
}

/**
 * Computes a SHA-256 hash of normalized text.
 */
export function computeContentChecksum(text: string): string {
  const normalized = normalizeText(text);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Computes a canonical document ID to detect duplicates across scrapes.
 */
export function computeDocumentId(sourceId: string, canonicalUrl: string): string {
  const input = `${sourceId.trim()}:${canonicalUrl.trim().toLowerCase()}`;
  return createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 32);
}
