# TNPSC99 — Current Affairs Authoritative Source Registry
**Document Version:** 1.0.0  
**Phase:** CA-1 Architecture and Source Ingestion  
**Status:** Approved Source Specification  
**Branch:** `feature/current-affairs-engine`

---

## 1. Registry Taxonomy & Reliability Classification

Every source monitored by the Current Affairs Intelligence Engine is classified into a 4-tier hierarchy:

- **Tier 1 (Authoritative Primary - State):** Official Tamil Nadu Government gazettes, Departmental press releases, DIPR bulletins, Budget documents, Policy notes.
- **Tier 2 (Authoritative Primary - Union & Constitutional):** Press Information Bureau (PIB), Gazette of India, RBI bulletins, ISRO mission releases, Supreme Court & High Court judgments, UPSC/TNPSC notifications.
- **Tier 3 (Permitted Official Secondary):** Economic Survey of India & Tamil Nadu, NITI Aayog reports, Census/NFHS data releases, Tamil Nadu Statistical Handbooks.
- **Tier 4 (Permitted Editorial Corroboration):** The Hindu (Tamil & English editions), Dinamani, Times of India Chennai edition (used solely for event discovery and cross-referencing; never as sole citation authority).

---

## 2. Authoritative Source Registry Directory

| Source ID | Organization / Publisher | Portal / Feed URL | Language | Content Type | Collection Frequency | Licensing / Usage Rights | Reliability Tier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `SRC_TN_DIPR_PRESS` | TN Information & Public Relations (DIPR) | `https://www.tn.gov.in/pressrelease` | Tamil & English | HTML / PDF Press Releases | Every 2 hours (06:00 - 22:00 IST) | Public Domain / Govt Open Access | **Tier 1** |
| `SRC_TN_GOV_ORDERS` | Government of Tamil Nadu (GoTN) | `https://www.tn.gov.in/go_view` | Tamil & English | Government Orders (GOs) | Daily (20:00 IST) | Public Domain | **Tier 1** |
| `SRC_TN_BUDGET` | TN Finance Department | `https://www.tn.gov.in/budget/` | Tamil & English | Annual/Interim Budgets, Policy Notes | Seasonal / Weekly checks | Public Domain | **Tier 1** |
| `SRC_GOI_PIB_TAMIL` | Press Information Bureau (Chennai / Tamil) | `https://pib.gov.in/allRel.aspx?lId=2` | Tamil | Union Cabinet & Dept Releases | Every 3 hours | Public Domain / Fair Use Education | **Tier 2** |
| `SRC_GOI_PIB_ENGLISH`| Press Information Bureau (National) | `https://pib.gov.in/RssMain.aspx?ModId=6` | English | RSS Feeds / National Ministries | Every 1 hour | Public Domain / Fair Use Education | **Tier 2** |
| `SRC_ISRO_MISSIONS` | Indian Space Research Organisation | `https://www.isro.gov.in/Updates.html` | English | Missions, Launches, Sci-Tech Updates | Daily (12:00, 20:00 IST) | Public Domain / Educational Citation | **Tier 2** |
| `SRC_RBI_NOTICES` | Reserve Bank of India | `https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx` | English | Monetary Policy, Regulations, Reports | Twice daily | Fair Use Educational Citation | **Tier 2** |
| `SRC_NITI_AAYOG` | NITI Aayog | `https://www.niti.gov.in/reports-indices` | English | State Performance Indices (SDG, Innovation) | Weekly | CC-BY 4.0 / Public Domain | **Tier 3** |
| `SRC_TNHC_JUDGMENTS`| Madras High Court | `https://hcmadras.tn.gov.in/` | English | Significant Constitutional & TN Ruling summaries | Daily | Public Judicial Records | **Tier 2** |

---

## 3. Ingestion Methods & Extraction Constraints

1. **RSS / Atom Feeds (Preferred for PIB & National agencies):**
   - Direct XML parsing using standard atom/rss syndication parsers.
   - Low bandwidth, high frequency polling with `ETag` and `If-Modified-Since` headers to prevent redundant network consumption.

2. **Web Scraping (TN DIPR, TN GO View, RBI):**
   - Respects `robots.txt` directives and rate-limits to maximum 1 request per 3 seconds per domain.
   - User-Agent explicitly identifies the engine: `TNPSC99-CA-IngestBot/1.0 (+https://tnpsc99.com/bot)`.
   - Headless scraping utilized only where JavaScript rendering is required; raw HTML preferred.

3. **PDF Document Extraction (TN Government Orders & Budget Speeches):**
   - Downloaded to staging cloud storage `gs://studio-5029416251-928dd.firebasestorage.app/ca-raw-docs/`.
   - Text extracted using high-fidelity multilingual PDF parser (extracting embedded Tamil Unicode and bilingual columns).
   - Page references preserved down to the specific paragraph for direct student examination auditability.

---

## 4. Source Checksumming, Deduplication & Audit Integrity

- **Cryptographic Hashing:** For every downloaded payload, a canonical `SHA-256` checksum is calculated over normalized text:
  $$\text{checksum} = \text{SHA-256}(\text{trim}(\text{normalizeWhitespace}(\text{lowercase}(\text{content}))))$$
- **Deduplication Key:**
  `documentHash = SHA-256(sourceId + canonicalUrl + normalizedTitle)`
- **Temporal Integrity:**
  The system strictly records two distinct timestamps for every document:
  - `publicationDate`: The official date/time printed on the government document.
  - `ingestedAt`: The exact ISO-8601 UTC timestamp when our ingestion worker collected the payload.
  - `eventDate`: The date on which the historical/current event actually took place (e.g., launch date, award presentation date, scheme announcement date).
