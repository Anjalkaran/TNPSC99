import { TNPSCCategory, TNPSCExamGroup } from './types';

interface KeywordRule {
  category: TNPSCCategory;
  keywords: string[];
  keywords_ta: string[];
  weight: number;
}

const SYLLABUS_RULES: KeywordRule[] = [
  {
    category: 'welfare_schemes',
    keywords: [
      'scheme', 'yojna', 'thittam', 'fund', 'subsidy', 'welfare', 'beneficiary', 
      'magalir', 'pudhumai penn', 'naan mudhalvan', 'makkalai thedi', 'breakfast scheme'
    ],
    keywords_ta: [
      'திட்டம்', 'நிதி', 'மானியம்', 'நலத்திட்டம்', 'பயனாளி', 'மகளிர்', 
      'புதுமைப் பெண்', 'நான் முதல்வன்', 'மக்களைத் தேடி', 'காலை உணவு'
    ],
    weight: 2.5,
  },
  {
    category: 'tamil_nadu',
    keywords: [
      'tamil nadu', 'chennai', 'madurai', 'coimbatore', 'governor', 'chief minister',
      'assembly', 'tnhc', 'madras high court', 'sipcot', 'tidco', 'tidel', 'keeladi',
      'porunai', 'sangam', 'thiruvalluvar'
    ],
    keywords_ta: [
      'தமிழ்நாடு', 'சென்னை', 'மதுரை', 'கோயம்புத்தூர்', 'ஆளுநர்', 'முதலமைச்சர்',
      'சட்டமன்றம்', 'சென்னை உயர் நீதிமன்றம்', 'சிப்காட்', 'கீழடி', 'பொருநை', 'சங்கம்'
    ],
    weight: 2.0,
  },
  {
    category: 'science_tech',
    keywords: [
      'isro', 'satellite', 'launch', 'pslv', 'gslv', 'chandrayaan', 'gaganyaan',
      'drdo', 'missile', 'ai', 'semiconductor', 'supercomputer', 'quantum', 'biotech'
    ],
    keywords_ta: [
      'இஸ்ரோ', 'செயற்கைக்கோள்', 'விண்கலம்', 'ராக்கெட்', 'சந்திரயான்', 'ககன்யான்',
      'டிஆர்டிஓ', 'ஏவுகணை', 'செயற்கை நுண்ணறிவு', 'குவாண்டம்'
    ],
    weight: 2.0,
  },
  {
    category: 'economy',
    keywords: [
      'gdp', 'gsdp', 'rbi', 'repo rate', 'inflation', 'budget', 'fiscal deficit',
      'gst', 'revenue', 'export', 'import', 'fdi', 'foreign exchange', 'tax'
    ],
    keywords_ta: [
      'மொத்த உள்நாட்டு உற்பத்தி', 'ரிசர்வ் வங்கி', 'ரெப்போ விகிதம்', 'பணவீக்கம்',
      'பட்ஜெட்', 'நிதிப் பற்றாக்குறை', 'ஜிஎஸ்டி', 'வருவாய்', 'ஏற்றுமதி', 'வரி'
    ],
    weight: 1.8,
  },
  {
    category: 'environment_geography',
    keywords: [
      'wildlife sanctuary', 'national park', 'tiger reserve', 'ramsar', 'wetland',
      'cyclone', 'monsoon', 'cop28', 'cop29', 'climate change', 'biodiversity', 'forest'
    ],
    keywords_ta: [
      'வனவிலங்கு சரணாலயம்', 'தேசிய பூங்கா', 'புலிகள் காப்பகம்', 'ராம்சார்', 'ஈரநிலம்',
      'புயல்', 'பருவமழை', 'பருவநிலை மாற்றம்', 'பல்லுயிர்', 'காடு'
    ],
    weight: 1.8,
  },
  {
    category: 'polity_governance',
    keywords: [
      'constitution', 'article', 'amendment', 'supreme court', 'high court', 'bill',
      'act', 'ordinance', 'election commission', 'delimit', 'panchayat', 'lok sabha'
    ],
    keywords_ta: [
      'அரசியலமைப்பு', 'சரத்து', 'பிரிவு', 'திருத்தம்', 'உச்ச நீதிமன்றம்', 'சட்ட மசோதா',
      'தேர்தல் ஆணையம்', 'ஊராட்சி', 'மக்களவை'
    ],
    weight: 1.8,
  },
  {
    category: 'sports_awards_appointments',
    keywords: [
      'award', 'padma', 'sahitya akademi', 'thiruvalluvar award', 'olympic', 'asian games',
      'medal', 'cricket', 'chess', 'grandmaster', 'appointed', 'chief justice', 'chairman'
    ],
    keywords_ta: [
      'விருது', 'பத்ம', 'சாகித்திய அகாதெமி', 'திருவள்ளுவர் விருது', 'ஒலிம்பிக்', 'பதக்கம்',
      'சதுரங்கம்', 'நியமனம்', 'தலைமை நீதிபதி', 'தலைவர்'
    ],
    weight: 1.5,
  },
  {
    category: 'international',
    keywords: [
      'summit', 'g20', 'brics', 'un', 'united nations', 'treaty', 'bilateral',
      'ambassador', 'who', 'imf', 'world bank'
    ],
    keywords_ta: [
      'உச்சி மாநாடு', 'ஜி20', 'பிரிக்ஸ்', 'ஐக்கிய நாடுகள்', 'ஒப்பந்தம்', 'இருதரப்பு'
    ],
    weight: 1.2,
  },
];

/**
 * Classifies text into standard TNPSC category and evaluates exam relevance.
 */
export function classifyEvent(
  text: string
): {
  primaryCategory: TNPSCCategory;
  secondaryCategory?: TNPSCCategory;
  relevanceScores: Record<TNPSCCategory, number>;
  examGroups: TNPSCExamGroup[];
  importanceScore: number; // 1 - 5
} {
  const lowerText = text.toLowerCase();
  const scores: Record<TNPSCCategory, number> = {
    tamil_nadu: 0,
    welfare_schemes: 0,
    polity_governance: 0,
    economy: 0,
    science_tech: 0,
    environment_geography: 0,
    national: 0,
    international: 0,
    sports_awards_appointments: 0,
  };

  for (const rule of SYLLABUS_RULES) {
    let matchCount = 0;
    for (const kw of rule.keywords) {
      if (lowerText.includes(kw)) matchCount++;
    }
    for (const kw of rule.keywords_ta) {
      if (lowerText.includes(kw)) matchCount += 1.5; // Weight regional terms higher
    }
    scores[rule.category] = matchCount * rule.weight;
  }

  // Sort categories by score
  const sorted = (Object.keys(scores) as TNPSCCategory[]).sort(
    (a, b) => scores[b] - scores[a]
  );

  const primaryCategory = scores[sorted[0]] > 0 ? sorted[0] : 'tamil_nadu';
  const secondaryCategory = scores[sorted[1]] > 0 ? sorted[1] : undefined;

  // Evaluate TNPSC Exam Group Relevance
  const examGroups: TNPSCExamGroup[] = [];
  
  // Group IV is heavily fact/date/award/scheme oriented
  if (
    primaryCategory === 'tamil_nadu' || 
    primaryCategory === 'welfare_schemes' || 
    primaryCategory === 'sports_awards_appointments'
  ) {
    examGroups.push('Group IV');
  }

  // Group II/IIA covers comprehensive polity, schemes, state administration
  examGroups.push('Group II');

  // Group I covers all plus high-depth analytical topics (economy, polity, sci-tech, environment)
  if (
    primaryCategory === 'economy' || 
    primaryCategory === 'polity_governance' || 
    primaryCategory === 'science_tech' || 
    primaryCategory === 'environment_geography' ||
    primaryCategory === 'welfare_schemes'
  ) {
    examGroups.push('Group I');
  }

  // Importance Score (1 to 5)
  let importance = 2;
  const maxScore = scores[primaryCategory];
  if (primaryCategory === 'welfare_schemes' || primaryCategory === 'tamil_nadu') {
    importance = 4;
  }
  if (maxScore > 10) importance = Math.min(5, importance + 1);

  return {
    primaryCategory,
    secondaryCategory,
    relevanceScores: scores,
    examGroups,
    importanceScore: importance,
  };
}
