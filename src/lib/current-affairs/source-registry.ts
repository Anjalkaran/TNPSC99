import { CASource } from './types';

export const AUTHORITATIVE_SOURCES: CASource[] = [
  {
    id: 'SRC_TN_DIPR_PRESS',
    name: 'Tamil Nadu DIPR Press Releases',
    name_ta: 'தமிழ்நாடு செய்தி மக்கள் தொடர்புத் துறை',
    baseUrl: 'https://www.tn.gov.in',
    feedUrl: 'https://www.tn.gov.in/pressrelease',
    reliabilityTier: 1,
    language: 'bilingual',
    collectionMethod: 'scrape_html',
    pollIntervalMinutes: 120,
    status: 'active',
    licensingNotice: 'Government of Tamil Nadu Public Domain / Open Educational Access',
  },
  {
    id: 'SRC_TN_GOV_ORDERS',
    name: 'Government of Tamil Nadu - Government Orders',
    name_ta: 'தமிழ்நாடு அரசு அரசாணைகள்',
    baseUrl: 'https://www.tn.gov.in',
    feedUrl: 'https://www.tn.gov.in/go_view',
    reliabilityTier: 1,
    language: 'bilingual',
    collectionMethod: 'scrape_html',
    pollIntervalMinutes: 720,
    status: 'active',
    licensingNotice: 'Official Tamil Nadu Government Gazettes & Public Orders',
  },
  {
    id: 'SRC_GOI_PIB_TAMIL',
    name: 'Press Information Bureau - Chennai (Tamil)',
    name_ta: 'மத்திய பத்திரிகை தகவல் அலுவலகம் - சென்னை',
    baseUrl: 'https://pib.gov.in',
    feedUrl: 'https://pib.gov.in/allRel.aspx?lId=2',
    reliabilityTier: 2,
    language: 'ta',
    collectionMethod: 'scrape_html',
    pollIntervalMinutes: 180,
    status: 'active',
    licensingNotice: 'Press Information Bureau, Ministry of Information & Broadcasting, GoI',
  },
  {
    id: 'SRC_GOI_PIB_ENGLISH',
    name: 'Press Information Bureau - National (English)',
    name_ta: 'மத்திய பத்திரிகை தகவல் அலுவலகம் - தேசிய வெளியீடுகள்',
    baseUrl: 'https://pib.gov.in',
    feedUrl: 'https://pib.gov.in/RssMain.aspx?ModId=6',
    reliabilityTier: 2,
    language: 'en',
    collectionMethod: 'rss',
    pollIntervalMinutes: 60,
    status: 'active',
    licensingNotice: 'Press Information Bureau, Ministry of Information & Broadcasting, GoI',
  },
  {
    id: 'SRC_ISRO_MISSIONS',
    name: 'ISRO Official Mission Updates',
    name_ta: 'இந்திய விண்வெளி ஆராய்ச்சி நிறுவனம் (இஸ்ரோ)',
    baseUrl: 'https://www.isro.gov.in',
    feedUrl: 'https://www.isro.gov.in/Updates.html',
    reliabilityTier: 2,
    language: 'en',
    collectionMethod: 'scrape_html',
    pollIntervalMinutes: 720,
    status: 'active',
    licensingNotice: 'Indian Space Research Organisation Official Updates',
  },
  {
    id: 'SRC_RBI_NOTICES',
    name: 'Reserve Bank of India Press Releases',
    name_ta: 'இந்திய ரிசர்வ் வங்கி செய்திக் குறிப்புகள்',
    baseUrl: 'https://rbi.org.in',
    feedUrl: 'https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx',
    reliabilityTier: 2,
    language: 'en',
    collectionMethod: 'scrape_html',
    pollIntervalMinutes: 360,
    status: 'active',
    licensingNotice: 'Reserve Bank of India Official Communications',
  },
];

export function getSourceById(id: string): CASource | undefined {
  return AUTHORITATIVE_SOURCES.find((s) => s.id === id);
}

export function getSourcesByTier(tier: 1 | 2 | 3 | 4): CASource[] {
  return AUTHORITATIVE_SOURCES.filter((s) => s.reliabilityTier === tier);
}
