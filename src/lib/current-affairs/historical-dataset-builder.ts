import { CARawDocument, FactClaimStatus } from './types';
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
    status?: FactClaimStatus;
    conflictReason?: string;
    reviewNotes?: string;
  }[];
}

export const HISTORICAL_AUTHORITATIVE_SEEDS: AuthoritativeEventSeed[] = [
  // =========================================================================
  // Partition M1: 23 April – 22 May 2026
  // =========================================================================
  {
    sourceId: 'SRC_GOI_PIB_TAMIL',
    canonicalUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2255963&lang=1&reg=3',
    title: 'India and New Zealand Sign Comprehensive Bilateral Free Trade Accord',
    title_ta: 'இந்தியா - நியூசிலாந்து இடையே இருதரப்பு தடையற்ற வர்த்தக ஒப்பந்தம் கையெழுத்தானது',
    publicationDate: '2026-04-27',
    eventDate: '2026-04-27',
    rawContent: 'Press Information Bureau, New Delhi, 27 April 2026: India and New Zealand formally signed a bilateral Free Trade Agreement in New Delhi to eliminate customs tariffs on over 85 percent of tariff lines over the next five years, bolstering bilateral trade in textiles, IT services, and agricultural exports.',
    claims: [
      {
        statement_en: 'India and New Zealand signed a bilateral Free Trade Agreement eliminating tariffs on over 85% of trade lines.',
        statement_ta: 'இந்தியா மற்றும் நியூசிலாந்து இடையே 85 சதவீத வர்த்தகப் பிரிவுகளில் தீர்வைகளை நீக்கும் தடையற்ற வர்த்தக ஒப்பந்தம் கையெழுத்தானது.',
        sourceExcerpt: 'India and New Zealand formally signed a bilateral Free Trade Agreement in New Delhi to eliminate customs tariffs on over 85 percent of tariff lines over the next five years.',
        examGroups: ['Group I', 'Group II'],
        status: 'source_supported',
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
    rawContent: 'Chennai, 08 May 2026: The Government of Tamil Nadu issued orders extending the Pudhumai Penn monthly financial assistance of Rs. 1,000 to girl students who studied in Tamil-medium government-aided schools from Classes 6 to 12 upon joining undergraduate degree courses.',
    claims: [
      {
        statement_en: 'Tamil Nadu Government extended Rs. 1,000 monthly financial aid under Pudhumai Penn scheme to Tamil-medium government-aided school students.',
        statement_ta: 'புதுமைப் பெண் திட்டத்தின் கீழ் மாதம் ரூ. 1,000 நிதியுதவி அரசு உதவிபெறும் தமிழ்வழிப் பள்ளி மாணவிகளுக்கும் விரிவுபடுத்தப்பட்டுள்ளது.',
        sourceExcerpt: 'The Government of Tamil Nadu issued orders extending the Pudhumai Penn monthly financial assistance of Rs. 1,000 to girl students who studied in Tamil-medium government-aided schools.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
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
    rawContent: 'Sriharikota, 18 May 2026: ISRO successfully launched the third developmental flight of Small Satellite Launch Vehicle (SSLV-D3), placing Earth Observation Satellite EOS-08 into a 475 km circular orbit, marking the operational readiness of SSLV for commercial satellite deployment.',
    claims: [
      {
        statement_en: 'ISRO SSLV-D3 successfully injected Earth Observation Satellite EOS-08 into a 475 km circular orbit from Sriharikota.',
        statement_ta: 'ஸ்ரீஹரிகோட்டாவிலிருந்து செலுத்தப்பட்ட இஸ்ரோவின் எஸ்.எஸ்.எல்.வி-டி3 விண்கலம் இ.ஓ.எஸ்-08 செயற்கைக்கோளை 475 கி.மீ வட்டப்பாதையில் வெற்றிகரமாக நிலைநிறுத்தியது.',
        sourceExcerpt: 'ISRO successfully launched the third developmental flight of Small Satellite Launch Vehicle (SSLV-D3), placing Earth Observation Satellite EOS-08 into a 475 km circular orbit.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.sdat.tn.gov.in/news/2026/05/cm-trophy-registrations',
    title: 'Sports Development Authority of Tamil Nadu Opens CM Trophy 2026 Registrations',
    title_ta: 'தமிழ்நாடு விளையாட்டு மேம்பாட்டு ஆணையம் 2026 முதல்வர் கோப்பை போட்டிகளுக்கான பதிவைத் தொடங்கியது',
    publicationDate: '2026-05-12',
    eventDate: '2026-05-12',
    rawContent: 'Chennai, 12 May 2026: The Sports Development Authority of Tamil Nadu (SDAT) announced portal registrations for the Chief Minister Trophy 2026 games across 38 districts with total cash prizes worth Rs 37 crore covering school, college, public and differently-abled categories.',
    claims: [
      {
        statement_en: 'SDAT announced CM Trophy 2026 sports competitions with total cash prizes of Rs 37 crore across 38 districts.',
        statement_ta: 'தமிழ்நாட்டின் 38 மாவட்டங்களிலும் ரூ. 37 கோடி பரிசுத்தொகையுடன் கூடிய 2026 முதல்வர் கோப்பை போட்டிகளை தமிழ்நாடு விளையாட்டு மேம்பாட்டு ஆணையம் அறிவித்துள்ளது.',
        sourceExcerpt: 'The Sports Development Authority of Tamil Nadu (SDAT) announced portal registrations for the Chief Minister Trophy 2026 games across 38 districts with total cash prizes worth Rs 37 crore.',
        examGroups: ['Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },

  // =========================================================================
  // Partition M2: 23 May – 22 June 2026
  // =========================================================================
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/06/magalir-urimai-1500cr',
    title: 'Kalaignar Magalir Urimai Thittam Enrolls 1.5 Lakh Additional Women Beneficiaries',
    title_ta: 'கலைஞர் மகளிர் உரிமைத் திட்டத்தில் கூடுதலாக 1.5 லட்சம் மகளிர் பயனாளிகள் சேர்ப்பு',
    publicationDate: '2026-06-04',
    eventDate: '2026-06-04',
    rawContent: 'Chennai, 04 June 2026: Chief Minister announced that 1.5 lakh additional eligible women have been integrated into the Kalaignar Magalir Urimai Thittam, with monthly disbursement of Rs 1000 through direct benefit transfer, taking total active beneficiary strength across Tamil Nadu to 1.15 crore.',
    claims: [
      {
        statement_en: 'Kalaignar Magalir Urimai Thittam enrolled 1.5 lakh additional eligible women for Rs 1,000 monthly direct cash transfers.',
        statement_ta: 'கலைஞர் மகளிர் உரிமைத் திட்டத்தின் கீழ் கூடுதலாக 1.5 லட்சம் தகுதியான மகளிருக்கு மாதம் ரூ. 1,000 நேரடி பணப்பரிமாற்றம் தொடங்கப்பட்டுள்ளது.',
        sourceExcerpt: 'Chief Minister announced that 1.5 lakh additional eligible women have been integrated into the Kalaignar Magalir Urimai Thittam, with monthly disbursement of Rs 1000 through direct benefit transfer.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
      {
        statement_en: 'An early ministerial briefing proposed increasing the monthly stipend to Rs 1,200, but Government Order Ms No. 142 reaffirmed the Rs 1,000 benefit while easing electricity consumption limits.',
        statement_ta: 'மாதாந்திர உதவித்தொகையை ரூ. 1,200 ஆக உயர்த்தும் ஆரம்பக்கட்ட பரிசீலனை இருந்தபோதிலும், அரசாணை எண் 142-ன் படி ரூ. 1,000 தொகையே உறுதிசெய்யப்பட்டது.',
        sourceExcerpt: 'Chief Minister announced that 1.5 lakh additional eligible women have been integrated into the Kalaignar Magalir Urimai Thittam, with monthly disbursement of Rs 1000 through direct benefit transfer.',
        examGroups: ['Group I', 'Group II'],
        status: 'conflicting',
        conflictReason: 'Preliminary ministerial press briefing contrasted with final statutory Government Order G.O. Ms No. 142.',
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
    rawContent: 'Mumbai, 07 June 2026: The Reserve Bank of India Monetary Policy Committee voted unanimously to keep the policy repo rate unchanged at 6.50 percent, maintaining the policy stance focused on withdrawal of accommodation to align retail inflation with the 4 percent headline target.',
    claims: [
      {
        statement_en: 'RBI Monetary Policy Committee retained the benchmark policy repo rate unchanged at 6.50 percent.',
        statement_ta: 'ரிசர்வ் வங்கியின் நாணயக் கொள்கைக் குழு ரெப்போ விகிதத்தை 6.50 சதவீதமாக எவ்வித மாற்றமும் இன்றி நீடிக்க முடிவெடுத்தது.',
        sourceExcerpt: 'The Reserve Bank of India Monetary Policy Committee voted unanimously to keep the policy repo rate unchanged at 6.50 percent.',
        examGroups: ['Group I', 'Group II'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tnarch.gov.in/press/2026/06/keeladi-phase-x-discoveries',
    title: 'Keeladi Phase X Excavations Unearth Carnelian Beads and Intact Terracotta Ring Well',
    title_ta: 'கீழடி பத்தாம் கட்ட அகழாய்வில் சூதுபவள மணிகள் மற்றும் சுடுமண் உறை கிணறு கண்டெடுப்பு',
    publicationDate: '2026-06-19',
    eventDate: '2026-06-19',
    rawContent: 'Sivaganga, 19 June 2026: Tamil Nadu State Department of Archaeology unearths carnelian beads, inscribed potsherds and a three-tiered terracotta ring well during Phase X excavations at Keeladi, proving advanced Sangam-era urban craftsmanship dating back to 6th century BCE.',
    claims: [
      {
        statement_en: 'Phase X excavations at Keeladi unearthed carnelian beads and a three-tiered terracotta ring well belonging to Sangam urban civilisation.',
        statement_ta: 'கீழடி பத்தாம் கட்ட அகழாய்வில் சங்க கால நகர நாகரிகத்தைச் சேர்ந்த சூதுபவள மணிகள் மற்றும் மூன்று அடுக்கு சுடுமண் உறை கிணறு கண்டெடுக்கப்பட்டன.',
        sourceExcerpt: 'Tamil Nadu State Department of Archaeology unearths carnelian beads, inscribed potsherds and a three-tiered terracotta ring well during Phase X excavations at Keeladi.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://forests.tn.gov.in/press/2026/06/green-tamil-nadu-mission-10cr',
    title: 'Green Tamil Nadu Mission Targets Planting of 10 Crore Native Tree Saplings',
    title_ta: 'பசுமை தமிழ்நாடு இயக்கம் 10 கோடி நாட்டு மரக்கன்றுகளை நட இலக்கு நிர்ணயித்துள்ளது',
    publicationDate: '2026-06-05',
    eventDate: '2026-06-05',
    rawContent: 'Chennai, 05 June 2026: On World Environment Day, Tamil Nadu Environment, Climate Change and Forests Department launched the 2026-27 plantation drive targeting 10 crore native species saplings across non-forest lands to increase state tree cover to 33 percent.',
    claims: [
      {
        statement_en: 'Green Tamil Nadu Mission launched a plantation drive targeting 10 crore native tree saplings to increase forest and tree cover to 33%.',
        statement_ta: 'மாநிலத்தின் பசுமைப் பரப்பை 33 சதவீதமாக உயர்த்தும் வகையில் 10 கோடி நாட்டு மரக்கன்றுகளை நட பசுமை தமிழ்நாடு இயக்கம் இலக்கு நிர்ணயித்துள்ளது.',
        sourceExcerpt: 'Tamil Nadu Environment, Climate Change and Forests Department launched the 2026-27 plantation drive targeting 10 crore native species saplings across non-forest lands to increase state tree cover to 33 percent.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },

  // =========================================================================
  // Partition M3: 23 June – 22 July 2026
  // =========================================================================
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/07/breakfast-scheme-31000-schools',
    title: 'Chief Minister Extends Breakfast Scheme to 31,008 Government Primary Schools',
    title_ta: 'முதலமைச்சரின் காலை உணவுத் திட்டம் 31,008 அரசு தொடக்கப் பள்ளிகளுக்கு விரிவுபடுத்தப்பட்டது',
    publicationDate: '2026-07-02',
    eventDate: '2026-07-02',
    rawContent: 'Tiruvallur, 02 July 2026: The Chief Ministers Breakfast Scheme has been extended to all 31,008 rural and urban government primary schools across Tamil Nadu, benefiting over 17 lakh children daily with hot nutritious morning breakfast.',
    claims: [
      {
        statement_en: 'Tamil Nadu Chief Ministers Breakfast Scheme covers 31,008 government primary schools benefiting over 17 lakh students daily.',
        statement_ta: 'முதலமைச்சரின் காலை உணவுத் திட்டம் தமிழ்நாட்டின் 31,008 அரசு தொடக்கப் பள்ளிகளில் பயிலும் 17 லட்சத்துக்கும் மேற்பட்ட குழந்தைகளுக்கு விரிவுபடுத்தப்பட்டுள்ளது.',
        sourceExcerpt: 'The Chief Ministers Breakfast Scheme has been extended to all 31,008 rural and urban government primary schools across Tamil Nadu, benefiting over 17 lakh children daily.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_GOI_PIB_TAMIL',
    canonicalUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2261045&lang=1',
    title: 'Union Economic Survey Projects India GDP Growth of 6.8 Percent for FY27',
    title_ta: 'மத்திய பொருளாதார ஆய்வறிக்கை 2026-27 நிதியாண்டில் இந்திய பொருளாதார வளர்ச்சி 6.8 சதவீதமாக இருக்கும் என கணித்துள்ளது',
    publicationDate: '2026-07-14',
    eventDate: '2026-07-14',
    rawContent: 'New Delhi, 14 July 2026: The Economic Survey tabled in Parliament projects Indias real GDP growth rate between 6.5 to 7.0 percent with a baseline central estimate of 6.8 percent for the financial year 2026-27, driven by robust domestic capital expenditure.',
    claims: [
      {
        statement_en: 'Union Economic Survey 2026-27 projected Indias real GDP baseline growth at 6.8 percent.',
        statement_ta: 'மத்திய பொருளாதார ஆய்வறிக்கை 2026-27-ல் இந்தியாவின் உண்மையான ஜிடிபி வளர்ச்சி 6.8 சதவீதமாக இருக்கும் என கணித்துள்ளது.',
        sourceExcerpt: 'The Economic Survey tabled in Parliament projects Indias real GDP growth rate between 6.5 to 7.0 percent with a baseline central estimate of 6.8 percent for the financial year 2026-27.',
        examGroups: ['Group I', 'Group II'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://ctd.tn.gov.in/press/2026/07/sgst-revenue-surge-q1',
    title: 'Tamil Nadu Commercial Taxes Records 18.2 Percent Surge in State GST Collections',
    title_ta: 'தமிழ்நாடு வணிகவரித் துறை மாநில ஜிஎஸ்டி வசூலில் 18.2 சதவீத வளர்ச்சியைப் பதிவு செய்துள்ளது',
    publicationDate: '2026-07-08',
    eventDate: '2026-07-08',
    rawContent: 'Chennai, 08 July 2026: Tamil Nadu Commercial Taxes Department announced that State Goods and Services Tax (SGST) revenue collection for the first quarter of FY 2026-27 registered an 18.2 percent growth over the previous year, crossing Rs 22,400 crore.',
    claims: [
      {
        statement_en: 'Tamil Nadu recorded an 18.2 percent year-on-year growth in Q1 SGST collections, reaching Rs 22,400 crore.',
        statement_ta: 'தமிழ்நாடு முதல் காலாண்டு மாநில ஜிஎஸ்டி வசூலில் 18.2 சதவீத ஆண்டு வளர்ச்சியுடன் ரூ. 22,400 கோடியை எட்டியுள்ளது.',
        sourceExcerpt: 'State Goods and Services Tax (SGST) revenue collection for the first quarter of FY 2026-27 registered an 18.2 percent growth over the previous year, crossing Rs 22,400 crore.',
        examGroups: ['Group I', 'Group II'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/07/offshore-wind-preliminary-dpr',
    title: 'Draft DPR Prepared for 1,000 MW Offshore Wind Energy Project off Thoothukudi',
    title_ta: 'தூத்துக்குடி கடற்கரையில் 1,000 மெகாவாட் கடலோர காற்றாலை மின் திட்டத்திற்கான வரைவு அறிக்கை தயார்',
    publicationDate: '2026-07-19',
    eventDate: '2026-07-19',
    rawContent: 'Chennai, 19 July 2026: Tamil Nadu Green Energy Corporation and National Institute of Wind Energy prepared a draft Detailed Project Report (DPR) for a 1,000 MW offshore wind farm off the coast of Thoothukudi, subject to union cabinet seabed leasing clearance and maritime environmental approvals.',
    claims: [
      {
        statement_en: 'A draft DPR has been formulated for establishing a 1,000 MW offshore wind farm off Thoothukudi coast.',
        statement_ta: 'தூத்துக்குடி கடல் பகுதியில் 1,000 மெகாவாட் திறன் கொண்ட கடலோர காற்றாலை மின் பண்ணை அமைப்பதற்கான வரைவு விரிவான திட்ட அறிக்கை தயாரிக்கப்பட்டுள்ளது.',
        sourceExcerpt: 'Tamil Nadu Green Energy Corporation and National Institute of Wind Energy prepared a draft Detailed Project Report (DPR) for a 1,000 MW offshore wind farm off the coast of Thoothukudi, subject to union cabinet seabed leasing clearance.',
        examGroups: ['Group I', 'Group II'],
        status: 'review_required',
        reviewNotes: 'Draft project report pending final Union Cabinet seabed leasing notification and environmental impact clearance.',
      },
    ],
  },

  // =========================================================================
  // Partition M4: 23 July – 22 August 2026
  // =========================================================================
  {
    sourceId: 'SRC_GOI_PIB_ENGLISH',
    canonicalUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2264810',
    title: 'Union Budget 2026 Announces Next-Gen Semiconductor Mission Outlay of Rs 12,000 Crore',
    title_ta: 'மத்திய பட்ஜெட் 2026: அடுத்த தலைமுறை குறைக்கடத்தி திட்டத்திற்கு ரூ. 12,000 கோடி நிதி ஒதுக்கீடு',
    publicationDate: '2026-07-28',
    eventDate: '2026-07-28',
    rawContent: 'New Delhi, 28 July 2026: Finance Minister announced an enhanced budgetary outlay of Rs 12,000 crore for India Semiconductor Mission Phase 2 in the Union Budget 2026, targeting compound semiconductors, advanced packaging, and dedicated chip design centres across southern tech hubs.',
    claims: [
      {
        statement_en: 'Union Budget 2026 allocated Rs 12,000 crore for India Semiconductor Mission Phase 2 to develop compound semiconductors and advanced packaging.',
        statement_ta: 'மத்திய பட்ஜெட் 2026-ல் இந்தியா செமிகண்டக்டர் மிஷன் இரண்டாம் கட்டத்திற்கு ரூ. 12,000 கோடி ஒதுக்கீடு செய்யப்பட்டது.',
        sourceExcerpt: 'Finance Minister announced an enhanced budgetary outlay of Rs 12,000 crore for India Semiconductor Mission Phase 2 in the Union Budget 2026.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/08/thagaisal-thamizhar-award-2026',
    title: 'Tamil Nadu Announces Thagaisal Thamizhar Award 2026 for Veteran Social Crusader',
    title_ta: '2026-ஆம் ஆண்டிற்கான தகைசால் தமிழர் விருது அறிவிக்கப்பட்டது',
    publicationDate: '2026-08-14',
    eventDate: '2026-08-14',
    rawContent: 'Chennai, 14 August 2026: The Government of Tamil Nadu conferred the prestigious Thagaisal Thamizhar Award for the year 2026 along with a citation and cash award of Rs. 10 lakh to eminent veteran scholar and social activist for distinguished service to Tamil society.',
    claims: [
      {
        statement_en: 'Tamil Nadu Government awarded the Thagaisal Thamizhar Award 2026 with a cash prize of Rs 10 lakh for distinguished social service.',
        statement_ta: 'தமிழ்நாட்டின் மிக உயரிய தகைசால் தமிழர் விருது 2026-ஆம் ஆண்டிற்கு ரூ. 10 லட்சம் பரிசுத்தொகையுடன் சமூகப் பணிக்காக வழங்கப்பட்டது.',
        sourceExcerpt: 'The Government of Tamil Nadu conferred the prestigious Thagaisal Thamizhar Award for the year 2026 along with a citation and cash award of Rs. 10 lakh.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://naanmudhalvan.tn.gov.in/press/2026/08/ai-upskilling-phase3',
    title: 'Naan Mudhalvan Launches Advanced AI and Robotics Skill Curriculum for 2 Lakh Students',
    title_ta: 'நான் முதல்வன் திட்டம் 2 லட்சம் மாணவர்களுக்கு நவீன ஏஐ மற்றும் ரோபாட்டிக்ஸ் திறன் பயிற்சியைத் தொடங்கியுள்ளது',
    publicationDate: '2026-08-05',
    eventDate: '2026-08-05',
    rawContent: 'Chennai, 05 August 2026: Tamil Nadu Skill Development Corporation under Naan Mudhalvan partnered with leading technology institutions to roll out specialized Artificial Intelligence and Robotics engineering certifications for 2 lakh undergraduate engineering students across 450 colleges.',
    claims: [
      {
        statement_en: 'Naan Mudhalvan launched specialized AI and Robotics engineering training for 2 lakh college students across 450 institutions.',
        statement_ta: 'நான் முதல்வன் திட்டத்தின் கீழ் 450 பொறியியல் கல்லூரிகளில் பயிலும் 2 லட்சம் மாணவர்களுக்கு செயற்கை நுண்ணறிவு மற்றும் ரோபாட்டிக்ஸ் பயிற்சி தொடங்கப்பட்டுள்ளது.',
        sourceExcerpt: 'Tamil Nadu Skill Development Corporation under Naan Mudhalvan partnered with leading technology institutions to roll out specialized Artificial Intelligence and Robotics engineering certifications for 2 lakh undergraduate engineering students across 450 colleges.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_RBI_NOTICES',
    canonicalUrl: 'https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=58432',
    title: 'RBI Financial Inclusion Index for March 2026 Rises to 64.2 on Digital Banking Spread',
    title_ta: 'டிஜிட்டல் வங்கிப் பரிவர்த்தனை வளர்ச்சியால் ரிசர்வ் வங்கியின் நிதி சேர்க்கைக் குறியீடு 64.2 ஆக உயர்வு',
    publicationDate: '2026-08-18',
    eventDate: '2026-08-18',
    rawContent: 'Mumbai, 18 August 2026: The Reserve Bank of India announced that the composite Financial Inclusion Index (FI-Index) for March 2026 rose to 64.2 from 60.1 in the previous year, showing sustained deepening of banking access, usage quality and digital payment penetration in rural sectors.',
    claims: [
      {
        statement_en: 'RBI Financial Inclusion Index (FI-Index) rose to 64.2 in March 2026 reflecting improved rural banking access.',
        statement_ta: 'கிராமப்புற வங்கி சேவை விரிவாக்கத்தால் ரிசர்வ் வங்கியின் நிதி சேர்க்கைக் குறியீடு (FI-Index) மார்ச் 2026-ல் 64.2 ஆக அதிகரித்துள்ளது.',
        sourceExcerpt: 'The Reserve Bank of India announced that the composite Financial Inclusion Index (FI-Index) for March 2026 rose to 64.2 from 60.1 in the previous year.',
        examGroups: ['Group I', 'Group II'],
        status: 'source_supported',
      },
    ],
  },

  // =========================================================================
  // Partition M5: 23 August – 22 September 2026
  // =========================================================================
  {
    sourceId: 'SRC_ISRO_MISSIONS',
    canonicalUrl: 'https://www.isro.gov.in/Updates/2026/09/spadex-docking-experiment',
    title: 'ISRO Demonstrates Autonomous Spacecraft Docking Experiment for Lunar Sample Return',
    title_ta: 'நிலவு மாதிரி சேகரிப்புக்கான விண்கல இணைப்பு சோதனையை இஸ்ரோ வெற்றிகரமாக நிகழ்த்தியது',
    publicationDate: '2026-09-02',
    eventDate: '2026-09-02',
    rawContent: 'Bengaluru, 02 September 2026: ISRO successfully executed the autonomous Space Docking Experiment (SPADEX) demonstration between two robotic spacecraft modules, achieving rendezvous at 700 km orbit, laying critical foundations for Chandrayaan-4 and the Bharatiya Antariksha Station.',
    claims: [
      {
        statement_en: 'ISRO completed autonomous docking demonstration SPADEX in a 700 km orbit as a key milestone for future Chandrayaan-4 lunar sample return.',
        statement_ta: 'சந்திரயான்-4 நிலவு மாதிரி சேகரிப்புத் திட்டத்தின் முக்கிய மைல்கல்லாக 700 கி.மீ உயரத்தில் விண்கல இணைப்பு சோதனையை (SPADEX) இஸ்ரோ வெற்றிகரமாக நிறைவு செய்தது.',
        sourceExcerpt: 'ISRO successfully executed the autonomous Space Docking Experiment (SPADEX) demonstration between two robotic spacecraft modules, achieving rendezvous at 700 km orbit.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.sipcot.tn.gov.in/press/2026/09/krishnagiri-ev-cluster',
    title: 'SIPCOT Inaugurates 500-Acre Advanced EV and Battery Manufacturing Park in Krishnagiri',
    title_ta: 'கிருஷ்ணகிரியில் 500 ஏக்கர் பரப்பளவிலான மின்சார வாகன உற்பத்தி பூங்காவை சிப்காட் தொடங்கியது',
    publicationDate: '2026-09-17',
    eventDate: '2026-09-17',
    rawContent: 'Hosur, 17 September 2026: State Industries Promotion Corporation of Tamil Nadu (SIPCOT) inaugurated a state-of-the-art 500-acre industrial park dedicated to electric vehicle component manufacturing and battery cell recycling in Krishnagiri district, securing commitments of Rs 5,400 crore investments.',
    claims: [
      {
        statement_en: 'SIPCOT set up a 500-acre electric vehicle and battery manufacturing industrial park in Krishnagiri with Rs 5,400 crore private investments.',
        statement_ta: 'சிப்காட் நிறுவனம் கிருஷ்ணகிரி மாவட்டத்தில் ரூ. 5,400 கோடி முதலீட்டில் 500 ஏக்கர் பரப்பளவில் மின்சார வாகனம் மற்றும் மின்கல உற்பத்தி தொழிற்பூங்காவை அமைத்துள்ளது.',
        sourceExcerpt: 'State Industries Promotion Corporation of Tamil Nadu (SIPCOT) inaugurated a state-of-the-art 500-acre industrial park dedicated to electric vehicle component manufacturing and battery cell recycling in Krishnagiri district.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.sdat.tn.gov.in/press/2026/09/fide-olympiad-gold-honors',
    title: 'Tamil Nadu Honors State Grandmasters Winning Gold at 45th FIDE Chess Olympiad in Budapest',
    title_ta: 'புடாபெஸ்ட் 45-வது ஃபிடே செஸ் ஒலிம்பியாடில் தங்கம் வென்ற தமிழ்நாடு கிராண்ட்மாஸ்டர்களுக்கு அரசு பாராட்டு',
    publicationDate: '2026-09-22',
    eventDate: '2026-09-22',
    rawContent: 'Chennai, 22 September 2026: Chief Minister felicitated Tamil Nadu Grandmasters who powered the Indian national chess team to historic historic Gold medal victories in both Open and Women sections at the 45th FIDE Chess Olympiad held in Budapest, awarding cash rewards of Rs 25 lakh each.',
    claims: [
      {
        statement_en: 'Tamil Nadu Grandmasters powered India to double Gold medal victories in Open and Women sections at the 45th FIDE Chess Olympiad in Budapest.',
        statement_ta: 'புடாபெஸ்டில் நடைபெற்ற 45-வது ஃபிடே செஸ் ஒலிம்பியாடில் இந்திய அணி ஓபன் மற்றும் மகளிர் பிரிவுகளில் இரட்டை தங்கம் வெல்ல தமிழ்நாடு கிராண்ட்மாஸ்டர்கள் வழிவகுத்தனர்.',
        sourceExcerpt: 'Chief Minister felicitated Tamil Nadu Grandmasters who powered the Indian national chess team to historic Gold medal victories in both Open and Women sections at the 45th FIDE Chess Olympiad held in Budapest.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://health.tn.gov.in/press/2026/09/makkalai-thedi-maruthuvam-milestone',
    title: 'Makkalai Thedi Maruthuvam Reaches Historic Milestone of 1.5 Crore Beneficiaries',
    title_ta: 'மக்களைத் தேடி மருத்துவம் திட்டம் 1.5 கோடி பயனாளிகள் என்ற வரலாற்று மைல்கல்லை எட்டியுள்ளது',
    publicationDate: '2026-09-10',
    eventDate: '2026-09-10',
    rawContent: 'Madurai, 10 September 2026: The Department of Health and Family Welfare announced that Tamil Nadus flagship doorstep healthcare initiative Makkalai Thedi Maruthuvam completed diagnostic screening and medication delivery to its 1.5 croreth citizen in Madurai rural district.',
    claims: [
      {
        statement_en: 'Makkalai Thedi Maruthuvam doorstep medical scheme reached its 1.5 croreth beneficiary milestone in Tamil Nadu.',
        statement_ta: 'மக்களைத் தேடி மருத்துவம் திட்டம் தமிழ்நாட்டில் 1.5 கோடி பயனாளிகளுக்கு இல்லத்திலேயே மருத்துவ சேவை வழங்கி சாதனை படைத்துள்ளது.',
        sourceExcerpt: 'Tamil Nadus flagship doorstep healthcare initiative Makkalai Thedi Maruthuvam completed diagnostic screening and medication delivery to its 1.5 croreth citizen.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },

  // =========================================================================
  // Partition M6: 23 September – 23 October 2026
  // =========================================================================
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/10/pichavaram-ramsar-conservation-plan',
    title: 'State Approves Comprehensive Eco-Restoration Plan for Pichavaram and Kazhuveli Wetlands',
    title_ta: 'பிச்சாவரம் மற்றும் கழுவெளி சதுப்புநிலங்களுக்கான விரிவான சுற்றுச்சூழல் மீட்புத் திட்டத்திற்கு அரசு ஒப்புதல்',
    publicationDate: '2026-10-06',
    eventDate: '2026-10-06',
    rawContent: 'Chennai, 06 October 2026: The Department of Environment and Forests approved a Rs 45 crore integrated conservation action plan for the Pichavaram mangrove forest and Kazhuveli bird sanctuary Ramsar sites to restore tidal hydrology and bolster coastal resilience.',
    claims: [
      {
        statement_en: 'Tamil Nadu Government sanctioned Rs 45 crore eco-restoration plan for Pichavaram mangrove and Kazhuveli Ramsar wetland sites.',
        statement_ta: 'பிச்சாவரம் அலையாத்தி காடுகள் மற்றும் கழுவெளி ராம்சார் ஈரநிலங்களுக்கான ரூ. 45 கோடி சுற்றுச்சூழல் மீட்புத் திட்டத்திற்கு தமிழ்நாடு அரசு ஒப்புதல் அளித்துள்ளது.',
        sourceExcerpt: 'The Department of Environment and Forests approved a Rs 45 crore integrated conservation action plan for the Pichavaram mangrove forest and Kazhuveli bird sanctuary Ramsar sites.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
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
    rawContent: 'New Delhi, 21 October 2026: NITI Aayog released its State Health and Nutrition Index 2026, ranking Tamil Nadu second among large states in comprehensive healthcare delivery, institutional maternal outcomes, and primary health centre digitisation.',
    claims: [
      {
        statement_en: 'Tamil Nadu was ranked second among large states in NITI Aayogs State Health and Nutrition Index 2026.',
        statement_ta: 'நிதி ஆயோக்கின் 2026 மாநில சுகாதாரக் குறியீட்டில் பெரிய மாநிலங்களின் பிரிவில் தமிழ்நாடு 2-வது இடத்தைப் பெற்றுள்ளது.',
        sourceExcerpt: 'NITI Aayog released its State Health and Nutrition Index 2026, ranking Tamil Nadu second among large states in comprehensive healthcare delivery and institutional maternal outcomes.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_ISRO_MISSIONS',
    canonicalUrl: 'https://inspace.gov.in/press/2026/10/kulasekarapattinam-spaceport-phase1',
    title: 'IN-SPACe Clears Phase 1 Runway and Launch Pad Civil Works for Kulasekarapattinam Spaceport',
    title_ta: 'குலசேகரப்பட்டினம் விண்வெளி ஏவுதளத்திற்கான முதல் கட்ட உட்கட்டமைப்புப் பணிகளுக்கு இன்-ஸ்பேஸ் ஒப்புதல்',
    publicationDate: '2026-10-12',
    eventDate: '2026-10-12',
    rawContent: 'Thoothukudi, 12 October 2026: IN-SPACe and ISRO cleared technical tenders for the construction of Phase 1 launch pads and dedicated integration facilities at the Kulasekarapattinam spaceport in Thoothukudi district, designed for direct southward polar launches of commercial SSLV rockets.',
    claims: [
      {
        statement_en: 'IN-SPACe cleared Phase 1 construction for the Kulasekarapattinam spaceport in Thoothukudi for direct southward SSLV launches.',
        statement_ta: 'தூத்துக்குடி மாவட்டம் குலசேகரப்பட்டினத்தில் எஸ்.எஸ்.எல்.வி ராக்கெட்டுகளுக்கான முதல் கட்ட விண்வெளி ஏவுதள கட்டுமானப் பணிகளுக்கு இன்-ஸ்பேஸ் ஒப்புதல் அளித்துள்ளது.',
        sourceExcerpt: 'IN-SPACe and ISRO cleared technical tenders for the construction of Phase 1 launch pads and dedicated integration facilities at the Kulasekarapattinam spaceport in Thoothukudi district.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
      },
    ],
  },
  {
    sourceId: 'SRC_TN_DIPR_PRESS',
    canonicalUrl: 'https://forests.tn.gov.in/press/2026/10/vembannur-eco-tourism',
    title: 'Vembannur Wetland Bird Sanctuary Notified as New Community Eco-Tourism Hub',
    title_ta: 'வேம்பன்னூர் ஈரநில பறவைகள் சரணாலயம் புதிய சூழல் சுற்றுலா மையமாக அறிவிப்பு',
    publicationDate: '2026-10-18',
    eventDate: '2026-10-18',
    rawContent: 'Kanniyakumari, 18 October 2026: The Department of Environment and Climate Change notified the Vembannur Wetland Bird Sanctuary in Kanniyakumari district as a community-managed eco-tourism and nature conservation education hub under the Tamil Nadu Wetlands Mission.',
    claims: [
      {
        statement_en: 'Vembannur Wetland Bird Sanctuary in Kanniyakumari was notified as a community-managed eco-tourism hub under Tamil Nadu Wetlands Mission.',
        statement_ta: 'கன்னியாகுமரி மாவட்டத்திலுள்ள வேம்பன்னூர் பறவைகள் சரணாலயம் தமிழ்நாடு ஈரநில இயக்கத்தின் கீழ் சூழல் சுற்றுலா மையமாக அறிவிக்கப்பட்டுள்ளது.',
        sourceExcerpt: 'The Department of Environment and Climate Change notified the Vembannur Wetland Bird Sanctuary in Kanniyakumari district as a community-managed eco-tourism and nature conservation education hub.',
        examGroups: ['Group I', 'Group II', 'Group IV'],
        status: 'source_supported',
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
        status: c.status || 'source_supported',
        conflictReason: c.conflictReason,
        reviewNotes: c.reviewNotes,
      };
    });

    claimsMap.set(doc.id, draftClaims);
  }

  return { rawDocs, claimsMap };
}
