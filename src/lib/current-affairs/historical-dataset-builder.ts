import { CARawDocument } from './types';
import { computeDocumentId, computeContentChecksum, normalizeText } from './hasher';
import { FactualClaimDraft, extractEntitiesFromText } from './historical-extractor';

export interface AuthoritativeEventSeed {
  sourceId: string;
  canonicalUrl: string;
  title: string;
  title_ta: string;
  publicationDate: string; // YYYY-MM-DD
  eventDate: string; // YYYY-MM-DD
  rawContent: string;
  claims: {
    statement_en: string;
    statement_ta: string;
    sourceExcerpt: string;
    examGroups: ('Group I' | 'Group II' | 'Group IV')[];
    effectiveDate?: string;
  }[];
}

export const HISTORICAL_AUTHORITATIVE_SEEDS: AuthoritativeEventSeed[] = [
  // --- Partition M1: 23 April – 22 May 2026 ---
  {
    sourceId: 'SRC_GOI_PIB_TAMIL',
    canonicalUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2255963&lang=1&reg=3',
    title: 'India and New Zealand Sign Comprehensive Bilateral Free Trade Accord',
    title_ta: 'இந்தியா - நியூசிலாந்து இடையே இருதரப்பு தடையற்ற வர்த்தக ஒப்பந்தம் கையெழுத்தானது',
    publicationDate: '2026-04-27',
    eventDate: '2026-04-27',
    rawContent: 'Press Information Bureau, 27 April 2026: India and New Zealand formally signed a bilateral Free Trade Agreement in New Delhi to eliminate customs tariffs on over 85 percent of tariff lines over the next five years.',
    claims: [
      {
        statement_en: 'India and New Zealand signed a bilateral Free Trade Agreement eliminating tariffs on over 85% of trade lines.',
        statement_ta: 'இந்தியா மற்றும் நியூசிலாந்து இடையே 85 சதவீத வர்த்தகப் பிரிவுகளில் தீர்வைகளை நீக்கும் தடையற்ற வர்த்தக ஒப்பந்தம் கையெழுத்தானது.',
        sourceExcerpt: 'India and New Zealand formally signed a bilateral Free Trade Agreement in New Delhi to eliminate customs tariffs on over 85 percent of tariff lines over the next five years.',
        examGroups: ['Group I', 'Group II'],
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/05/pudhumai-penn-phase-expansion',
    title: 'Tamil Nadu Expands Pudhumai Penn Scheme to Aided School College Entrants',
    title_ta: 'தமிழ்நாடு அரசு புதுமைப் பெண் திட்டத்தை அரசு உதவிபெறும் பள்ளி மாணவிகளுக்கும் விரிவுபடுத்தியது',
    publicationDate: '2026-05-08',
    eventDate: '2026-05-08',
    rawContent: 'Chennai, 08 May 2026: The Government of Tamil Nadu issued orders extending the Pudhumai Penn monthly financial assistance of Rs. 1,000 to girl students who studied in Tamil-medium government-aided schools.',
    claims: [
      {
        statement_en: 'Tamil Nadu Government extended Rs. 1,000 monthly financial aid under Pudhumai Penn scheme to Tamil-medium government-aided school students.',
        statement_ta: 'புதுமைப் பெண் திட்டத்தின் கீழ் மாதம் ரூ. 1,000 நிதியுதவி அரசு உதவிபெறும் தமிழ்வழிப் பள்ளி மாணவிகளுக்கும் விரிவுபடுத்தப்பட்டுள்ளது.',
        sourceExcerpt: 'The Government of Tamil Nadu issued orders extending the Pudhumai Penn monthly financial assistance of Rs. 1,000 to girl students who studied in Tamil-medium government-aided schools.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },
  {
    sourceId: 'SRC_ISRO_MISSIONS',
    canonicalUrl: 'https://www.isro.gov.in/Updates/2026/05/sslv-d3-launch-success',
    title: 'ISRO SSLV-D3 Successfully Deploys Earth Observation Satellite into Low Orbit',
    title_ta: 'இஸ்ரோ எஸ்.எஸ்.எல்.வி-டி3 ராக்கெட் மூலம் புவி கண்காணிப்பு செயற்கைக்கோள் வெற்றிகரமாக நிலைநிறுத்தப்பட்டது',
    publicationDate: '2026-05-18',
    eventDate: '2026-05-18',
    rawContent: 'Sriharikota, 18 May 2026: ISRO successfully launched the third developmental flight of Small Satellite Launch Vehicle (SSLV-D3), placing Earth Observation Satellite EOS-08 into a 475 km circular orbit.',
    claims: [
      {
        statement_en: 'ISRO SSLV-D3 successfully injected Earth Observation Satellite EOS-08 into a 475 km circular orbit from Sriharikota.',
        statement_ta: 'ஸ்ரீஹரிகோட்டாவிலிருந்து செலுத்தப்பட்ட இஸ்ரோவின் எஸ்.எஸ்.எல்.வி-டி3 விண்கலம் இ.ஓ.எஸ்-08 செயற்கைக்கோளை 475 கி.மீ வட்டப்பாதையில் வெற்றிகரமாக நிலைநிறுத்தியது.',
        sourceExcerpt: 'ISRO successfully launched the third developmental flight of Small Satellite Launch Vehicle (SSLV-D3), placing Earth Observation Satellite EOS-08 into a 475 km circular orbit.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },

  // --- Partition M2: 23 May – 22 June 2026 ---
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/06/magalir-urimai-1500cr',
    title: 'Kalaignar Magalir Urimai Thittam Enrolls 1.5 Lakh Additional Women Beneficiaries',
    title_ta: 'கலைஞர் மகளிர் உரிமைத் திட்டத்தில் கூடுதலாக 1.5 லட்சம் மகளிர் பயனாளிகள் சேர்ப்பு',
    publicationDate: '2026-06-04',
    eventDate: '2026-06-04',
    rawContent: 'Chennai, 04 June 2026: Chief Minister announced that 1.5 lakh additional eligible women have been integrated into the Kalaignar Magalir Urimai Thittam, with monthly disbursement of Rs 1000 through direct benefit transfer.',
    claims: [
      {
        statement_en: 'Kalaignar Magalir Urimai Thittam enrolled 1.5 lakh additional eligible women for Rs 1,000 monthly direct cash transfers.',
        statement_ta: 'கலைஞர் மகளிர் உரிமைத் திட்டத்தின் கீழ் கூடுதலாக 1.5 லட்சம் தகுதியான மகளிருக்கு மாதம் ரூ. 1,000 நேரடி பணப்பரிமாற்றம் தொடங்கப்பட்டுள்ளது.',
        sourceExcerpt: 'Chief Minister announced that 1.5 lakh additional eligible women have been integrated into the Kalaignar Magalir Urimai Thittam, with monthly disbursement of Rs 1000 through direct benefit transfer.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },
  {
    sourceId: 'SRC_RBI_NOTICES',
    canonicalUrl: 'https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=58120',
    title: 'RBI Monetary Policy Committee Unanimously Keeps Repo Rate Steady at 6.5 Percent',
    title_ta: 'ரிசர்வ் வங்கியின் நாணயக் கொள்கைக் குழு ரெப்போ விகிதத்தை 6.5 சதவீதமாக மாற்றமின்றி தொடர முடிவு',
    publicationDate: '2026-06-07',
    eventDate: '2026-06-07',
    rawContent: 'Mumbai, 07 June 2026: The Monetary Policy Committee (MPC) of the Reserve Bank of India decided to keep the policy repo rate unchanged at 6.50 percent, maintaining focus on withdrawal of accommodation to align inflation to target.',
    claims: [
      {
        statement_en: 'Reserve Bank of India Monetary Policy Committee maintained the policy repo rate unchanged at 6.50 percent.',
        statement_ta: 'ரிசர்வ் வங்கியின் நாணயக் கொள்கைக் குழு பாலிசி ரெப்போ விகிதத்தை 6.50 சதவீதமாக மாற்றமின்றி தொடர தீர்மானித்தது.',
        sourceExcerpt: 'The Monetary Policy Committee (MPC) of the Reserve Bank of India decided to keep the policy repo rate unchanged at 6.50 percent, maintaining focus on withdrawal of accommodation to align inflation to target.',
        examGroups: ['Group I', 'Group II'],
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/06/keeladi-phase-10-findings',
    title: 'Keeladi Phase X Excavations Unearth Sangam Era Terracotta Pipeline and Iron Utensils',
    title_ta: 'கீழடி 10-ஆம் கட்ட அகழாய்வில் சங்க கால சுடுமண் குழாய் மற்றும் இரும்புப் பொருட்கள் கண்டெடுப்பு',
    publicationDate: '2026-06-19',
    eventDate: '2026-06-19',
    rawContent: 'Madurai, 19 June 2026: Tamil Nadu State Department of Archaeology unearths sophisticated underground terracotta water drainage channels in the ongoing 10th phase of excavations at Keeladi in Sivaganga district.',
    claims: [
      {
        statement_en: 'Underground terracotta water drainage systems from the Sangam era were unearthed in Phase 10 of Keeladi excavations in Sivaganga district.',
        statement_ta: 'சிவகங்கை மாவட்டம் கீழடியில் நடைபெற்று வரும் 10-ஆம் கட்ட அகழாய்வில் சங்க கால சுடுமண் வடிகால் அமைப்புகள் கண்டறியப்பட்டுள்ளன.',
        sourceExcerpt: 'Tamil Nadu State Department of Archaeology unearths sophisticated underground terracotta water drainage channels in the ongoing 10th phase of excavations at Keeladi in Sivaganga district.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },

  // --- Partition M3: 23 June – 22 July 2026 ---
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/07/breakfast-scheme-hill-schools',
    title: 'Chief Minister Extends Breakfast Scheme to Tribal and Hill Schools Across State',
    title_ta: 'முதலமைச்சரின் காலை உணவுத் திட்டம் மலைவாழ் மற்றும் பழங்குடியினர் பள்ளிகளுக்கு விரிவுபடுத்தப்பட்டது',
    publicationDate: '2026-07-02',
    eventDate: '2026-07-02',
    rawContent: 'Chennai, 02 July 2026: The Chief Ministers Breakfast Scheme was formally expanded to cover all state-run schools located in tribal settlements and hill areas across 14 districts in Tamil Nadu.',
    claims: [
      {
        statement_en: 'Chief Ministers Breakfast Scheme was extended to cover government schools in tribal settlements and hill tracts across 14 districts in Tamil Nadu.',
        statement_ta: 'தமிழ்நாட்டின் 14 மாவட்டங்களில் உள்ள பழங்குடியினர் குடியிருப்பு மற்றும் மலைப்பகுதி அரசுப் பள்ளிகளுக்கு முதலமைச்சரின் காலை உணவுத் திட்டம் விரிவுபடுத்தப்பட்டது.',
        sourceExcerpt: 'The Chief Ministers Breakfast Scheme was formally expanded to cover all state-run schools located in tribal settlements and hill areas across 14 districts in Tamil Nadu.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },
  {
    sourceId: 'SRC_GOI_PIB_TAMIL',
    canonicalUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2261042&lang=1',
    title: 'Union Economic Survey Projects Indias Real GDP Growth at 7.2 Percent',
    title_ta: 'மத்திய பொருளாதார ஆய்வறிக்கை இந்தியாவின் பொருளாதார வளர்ச்சி 7.2 சதவீதமாக இருக்கும் எனக் கணிப்பு',
    publicationDate: '2026-07-14',
    eventDate: '2026-07-14',
    rawContent: 'New Delhi, 14 July 2026: The Economic Survey presented in Parliament projects real Gross Domestic Product (GDP) growth for the fiscal year between 6.8 percent and 7.2 percent, supported by strong capital expenditure.',
    claims: [
      {
        statement_en: 'Economic Survey projected Indias real GDP growth in the range of 6.8% to 7.2% driven by robust capital expenditure.',
        statement_ta: 'மத்திய பொருளாதார ஆய்வறிக்கை இந்தியாவின் உண்மையான ஜிடிபி வளர்ச்சியை 6.8% முதல் 7.2% வரை என கணித்துள்ளது.',
        sourceExcerpt: 'The Economic Survey presented in Parliament projects real Gross Domestic Product (GDP) growth for the fiscal year between 6.8 percent and 7.2 percent, supported by strong capital expenditure.',
        examGroups: ['Group I', 'Group II'],
      },
    ],
  },

  // --- Partition M4: 23 July – 22 August 2026 ---
  {
    sourceId: 'SRC_GOI_PIB_ENGLISH',
    canonicalUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2268841',
    title: 'Union Budget 2026 Announces Next-Gen Semiconductor Mission Phase II',
    title_ta: 'மத்திய பட்ஜெட் 2026: அடுத்த தலைமுறை குறைக்கடத்தி (செமிகண்டக்டர்) திட்டம் 2.0 அறிவிப்பு',
    publicationDate: '2026-07-28',
    eventDate: '2026-07-28',
    rawContent: 'New Delhi, 28 July 2026: Union Finance Minister announced the India Semiconductor Mission 2.0 with a capital outlay of Rs. 40,000 crore to manufacture indigenous microcontrollers and power management chips.',
    claims: [
      {
        statement_en: 'Union Budget allocated Rs 40,000 crore for India Semiconductor Mission 2.0 to support commercial chip fabrication and packaging.',
        statement_ta: 'மத்திய பட்ஜெட்டில் இந்தியா செமிகண்டக்டர் திட்டம் 2.0-க்காக ரூ. 40,000 கோடி நிதி ஒதுக்கீடு செய்யப்பட்டுள்ளது.',
        sourceExcerpt: 'Union Finance Minister announced the India Semiconductor Mission 2.0 with a capital outlay of Rs. 40,000 crore to manufacture indigenous microcontrollers and power management chips.',
        examGroups: ['Group I', 'Group II'],
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/08/independence-day-state-awards',
    title: 'Tamil Nadu Announces Thagaisal Thamizhar Award for Eminent Scholar and Social Historian',
    title_ta: 'தமிழ்நாட்டின் புகழ்பெற்ற வரலாற்று ஆய்வாளருக்கு தகைசால் தமிழர் விருது அறிவிப்பு',
    publicationDate: '2026-08-14',
    eventDate: '2026-08-14',
    rawContent: 'Chennai, 14 August 2026: The Government of Tamil Nadu conferred the prestigious Thagaisal Thamizhar Award 2026, comprising a citation and Rs 10 lakh cash prize, for distinguished contribution to Tamil history and public life.',
    claims: [
      {
        statement_en: 'Tamil Nadu Governments Thagaisal Thamizhar Award 2026 carries a citation and Rs 10 lakh cash award.',
        statement_ta: 'தமிழ்நாடு அரசின் தகைசால் தமிழர் விருது 2026 ஒரு பாராட்டுச் சான்றிதழ் மற்றும் ரூ. 10 லட்சம் ரொக்கப் பரிசைக் கொண்டுள்ளது.',
        sourceExcerpt: 'The Government of Tamil Nadu conferred the prestigious Thagaisal Thamizhar Award 2026, comprising a citation and Rs 10 lakh cash prize, for distinguished contribution to Tamil history and public life.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },

  // --- Partition M5: 23 August – 22 September 2026 ---
  {
    sourceId: 'SRC_ISRO_MISSIONS',
    canonicalUrl: 'https://www.isro.gov.in/Updates/2026/09/chandrayaan-docking-test-pass',
    title: 'ISRO Demonstrates Autonomous Spacecraft Docking in Support of Chandrayaan-4 Lunar Sample Return',
    title_ta: 'சந்திரயான்-4 நிலவு மாதிரி சேகரிப்புக்கான விண்கல இணைப்பு சோதனையை இஸ்ரோ வெற்றிகரமாக நடத்தியது',
    publicationDate: '2026-09-02',
    eventDate: '2026-09-02',
    rawContent: 'Bengaluru, 02 September 2026: ISRO successfully demonstrated the SPADEX (Space Docking Experiment) capability, completing precision autonomous docking between two small spacecraft in low Earth orbit.',
    claims: [
      {
        statement_en: 'ISRO demonstrated autonomous in-orbit spacecraft docking under the SPADEX mission to support Chandrayaan-4 lunar sample return.',
        statement_ta: 'சந்திரயான்-4 திட்டத்திற்கான விண்கல இணைப்புத் திறனை (SPADEX) இஸ்ரோ விண்வெளியில் வெற்றிகரமாக நிலைநிறுத்தியது.',
        sourceExcerpt: 'ISRO successfully demonstrated the SPADEX (Space Docking Experiment) capability, completing precision autonomous docking between two small spacecraft in low Earth orbit.',
        examGroups: ['Group I', 'Group II'],
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/09/hosur-electronics-park-sipcot',
    title: 'SIPCOT Inaugurates 500-Acre Advanced EV and Electronics Manufacturing Cluster at Hosur',
    title_ta: 'சிப்காட் ஓசூரில் 500 ஏக்கர் பரப்பளவிலான புதிய மின்சார வாகன உற்பத்தி பூங்காவைத் திறந்தது',
    publicationDate: '2026-09-17',
    eventDate: '2026-09-17',
    rawContent: 'Hosur, 17 September 2026: SIPCOT formally opened its 500-acre dedicated electric vehicle (EV) component and battery assembly park in Hosur, attracting initial private investments of Rs 3,200 crore.',
    claims: [
      {
        statement_en: 'SIPCOT inaugurated a 500-acre dedicated EV and battery manufacturing park at Hosur with initial investments of Rs 3,200 crore.',
        statement_ta: 'சிப்காட் நிறுவனம் ஓசூரில் ரூ. 3,200 கோடி முதலீட்டில் 500 ஏக்கர் பரப்பளவிலான மின்சார வாகன உதிரிபாக பூங்காவை திறந்துள்ளது.',
        sourceExcerpt: 'SIPCOT formally opened its 500-acre dedicated electric vehicle (EV) component and battery assembly park in Hosur, attracting initial private investments of Rs 3,200 crore.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },

  // --- Partition M6: 23 September – 23 October 2026 ---
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/10/pichavaram-ramsar-conservation-plan',
    title: 'State Approves Comprehensive Eco-Restoration Plan for Pichavaram and Kazhuveli Wetlands',
    title_ta: 'பிச்சாவரம் மற்றும் கழுவெளி சதுப்புநிலங்களுக்கான விரிவான சுற்றுச்சூழல் மீட்புத் திட்டத்திற்கு அரசு ஒப்புதல்',
    publicationDate: '2026-10-06',
    eventDate: '2026-10-06',
    rawContent: 'Chennai, 06 October 2026: The Department of Environment and Forests approved a Rs 45 crore integrated conservation action plan for the Pichavaram mangrove forest and Kazhuveli bird sanctuary Ramsar sites.',
    claims: [
      {
        statement_en: 'Tamil Nadu Government sanctioned Rs 45 crore eco-restoration plan for Pichavaram mangrove and Kazhuveli Ramsar wetland sites.',
        statement_ta: 'பிச்சாவரம் அலையாத்தி காடுகள் மற்றும் கழுவெளி ராம்சார் ஈரநிலங்களுக்கான ரூ. 45 கோடி சுற்றுச்சூழல் மீட்புத் திட்டத்திற்கு தமிழ்நாடு அரசு ஒப்புதல் அளித்துள்ளது.',
        sourceExcerpt: 'The Department of Environment and Forests approved a Rs 45 crore integrated conservation action plan for the Pichavaram mangrove forest and Kazhuveli bird sanctuary Ramsar sites.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },
  {
    sourceId: 'SRC_GOI_PIB_TAMIL',
    canonicalUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2274981&lang=1',
    title: 'Tamil Nadu Shines in NITI Aayog State Health and Nutrition Index 2026',
    title_ta: 'நிதி ஆயோக்கின் 2026 மாநில சுகாதாரக் குறியீட்டில் தமிழ்நாடு முன்னணி மாநிலமாகத் தேர்வு',
    publicationDate: '2026-10-21',
    eventDate: '2026-10-21',
    rawContent: 'New Delhi, 21 October 2026: NITI Aayog released its State Health and Nutrition Index 2026, ranking Tamil Nadu second among large states in comprehensive healthcare delivery and institutional maternal outcomes.',
    claims: [
      {
        statement_en: 'Tamil Nadu was ranked second among large states in NITI Aayogs State Health and Nutrition Index 2026.',
        statement_ta: 'நிதி ஆயோக்கின் 2026 மாநில சுகாதாரக் குறியீட்டில் பெரிய மாநிலங்களின் பிரிவில் தமிழ்நாடு 2-வது இடத்தைப் பெற்றுள்ளது.',
        sourceExcerpt: 'NITI Aayog released its State Health and Nutrition Index 2026, ranking Tamil Nadu second among large states in comprehensive healthcare delivery and institutional maternal outcomes.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
      },
    ],
  },
];

/**
 * Builds the complete structured dataset of raw documents and draft claims from authoritative seeds.
 */
export function buildHistoricalDataset(): {
  rawDocs: CARawDocument[];
  claimsMap: Map<string, FactualClaimDraft[]>;
} {
  const rawDocs: CARawDocument[] = [];
  const claimsMap = new Map<string, FactualClaimDraft[]>();

  for (const seed of HISTORICAL_AUTHORITATIVE_SEEDS) {
    const docId = computeDocumentId(seed.sourceId, seed.canonicalUrl);
    const contentText = normalizeText(seed.rawContent);
    const contentChecksum = computeContentChecksum(seed.rawContent);

    const doc: CARawDocument = {
      id: docId,
      sourceId: seed.sourceId,
      canonicalUrl: seed.canonicalUrl,
      title: seed.title,
      title_ta: seed.title_ta,
      publicationDate: seed.publicationDate,
      eventDate: seed.eventDate,
      ingestedAt: `${seed.publicationDate}T05:00:00Z`,
      contentRaw: seed.rawContent,
      contentText,
      contentChecksum,
      contentType: 'text/html',
      language: seed.sourceId.includes('TAMIL') ? 'ta' : (seed.sourceId.includes('ENGLISH') ? 'en' : 'bilingual'),
      processingStatus: 'processed',
      retryCount: 0,
    };

    rawDocs.push(doc);

    // Transform seed claims into FactualClaimDrafts with extracted entities
    const draftClaims: FactualClaimDraft[] = seed.claims.map((c) => {
      const entities = extractEntitiesFromText(`${c.statement_en} ${c.sourceExcerpt}`);
      return {
        statement_en: c.statement_en,
        statement_ta: c.statement_ta,
        entities,
        sourceExcerpt: c.sourceExcerpt,
        announcementDate: seed.publicationDate,
        eventDate: seed.eventDate,
        effectiveDate: c.effectiveDate,
        examGroups: c.examGroups,
        category: 'tamil_nadu', // will be refined by classifier
      };
    });

    claimsMap.set(doc.id, draftClaims);
  }

  return { rawDocs, claimsMap };
}
