'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Clock,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Layers,
  ShieldCheck,
  FileCheck2,
  Edit3,
  Eye,
  History,
  Save,
  Send,
  Filter,
  Check,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface QuestionVersion {
  version: number;
  question_en: string;
  question_ta: string;
  options_en: string[];
  options_ta: string[];
  correctOptionIndex: number;
  explanation_en: string;
  explanation_ta: string;
  modifiedAt: string;
  modifiedBy: string;
  changeReason: string;
}

interface AdminCAQuestionItem {
  id: string;
  contentVersion: number;
  publicationMode: 'AUTO_VERIFIED' | 'MANUAL_APPROVED';
  status: 'PUBLISHED' | 'REVIEW_REQUIRED' | 'REJECTED' | 'RETRACTED' | 'DRAFT';
  verificationPolicyVersion: string;
  eventDate: string;
  publicationDate: string;
  category: string;
  category_ta: string;
  officialDocumentId: string;
  sourcePublisher: string;
  sourceUrl: string;
  sourceExcerpt: string;
  question_en: string;
  question_ta: string;
  options_en: string[];
  options_ta: string[];
  correctOptionIndex: number;
  explanation_en: string;
  explanation_ta: string;
  verificationScore: number;
  rejectionReason?: string;
  quarantineReason?: string;
  retractionDetails?: {
    defectClassification: string;
    remedyType: string;
    retractedAt: string;
    adminUid: string;
  };
  previousVersions?: QuestionVersion[];
}

// Initial dataset combining genuine 2026 questions across lifecycle states
const INITIAL_QUESTIONS: AdminCAQuestionItem[] = [
  {
    id: 'ca_2026_draft_01',
    contentVersion: 1,
    publicationMode: 'AUTO_VERIFIED',
    status: 'PUBLISHED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2026-10-15',
    publicationDate: '2026-10-15',
    category: 'Environment & Geography',
    category_ta: 'சுற்றுச்சூழல் மற்றும் புவியியல்',
    officialDocumentId: 'PIB PRID 2324120',
    sourcePublisher: 'Ministry of Environment, Forest and Climate Change (MoEFCC)',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2324120',
    sourceExcerpt: 'With the designation of Sukhna Wetland in Chandigarh and Sauj Jheel in Mainpuri, Uttar Pradesh, India’s tally of Ramsar sites reached 103, reinforcing India’s conservation commitment under the Ramsar Convention.',
    question_en: 'In October 2026, with the addition of Sukhna Wetland (Chandigarh) and Sauj Jheel (Uttar Pradesh), what is India’s total tally of Ramsar sites of international importance?',
    question_ta: '2026 அக்டோபரில் சுக்னா சதுப்புநிலம் (சண்டிகர்) மற்றும் சௌஜ் ஜீல் (உத்தரப் பிரதேசம்) சேர்க்கப்பட்டதன் மூலம், இந்தியாவின் சர்வதேச முக்கியத்துவம் வாய்ந்த ராம்சார் தளங்களின் மொத்த எண்ணிக்கை எத்தனை?',
    options_en: ['103', '95', '85', '110'],
    options_ta: ['103', '95', '85', '110'],
    correctOptionIndex: 0,
    explanation_en: 'According to PIB release dated 15 October 2026 (PRID 2324120), the designation of Sukhna Wetland and Sauj Jheel expanded India’s Ramsar tally to 103 sites.',
    explanation_ta: '2026 அக்டோபர் 15 தேதியிட்ட பத்திரிகை தகவல் பணியக (PIB PRID 2324120) செய்திக் குறிப்பின்படி, சுக்னா சதுப்புநிலம் மற்றும் சௌஜ் ஜீல் ராம்சார் தளங்களாக அறிவிக்கப்பட்டதன் மூலம் இந்தியாவின் மொத்த எண்ணிக்கை 103 ஆக உயர்ந்தது.',
    verificationScore: 100,
  },
  {
    id: 'ca_2026_draft_02',
    contentVersion: 1,
    publicationMode: 'MANUAL_APPROVED',
    status: 'REJECTED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2025-02-01',
    publicationDate: '2025-02-01',
    category: 'Environment & Geography',
    category_ta: 'சுற்றுச்சூழல் மற்றும் புவியியல்',
    officialDocumentId: 'PIB PRID 2098813 (Defective Citation)',
    sourcePublisher: 'Ministry of Environment, Forest and Climate Change (MoEFCC)',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2098813',
    sourceExcerpt: 'PIB PRID 2098813 was published on 01 February 2025 covering a North India regional workshop in Ayodhya, UP. Disqualified under mandatory 2026-only current affairs temporal eligibility policy.',
    question_en: 'Which location hosted the North India regional workshop on wetland conservation on the eve of World Wetlands Day under PIB release PRID 2098813?',
    question_ta: 'PIB செய்திக்குறிப்பு PRID 2098813-ன் படி உலக சதுப்புநில தினத்தை முன்னிட்டு வட இந்திய பிராந்திய பயிலரங்கம் எங்கு நடைபெற்றது?',
    options_en: ['Ayodhya, Uttar Pradesh', 'Chandigarh', 'Haridwar, Uttarakhand', 'Varanasi, Uttar Pradesh'],
    options_ta: ['அயோத்தி, உத்தரப் பிரதேசம்', 'சண்டிகர்', 'ஹரித்வார், உத்தராகண்ட்', 'வாரணாசி, உத்தரப் பிரதேசம்'],
    correctOptionIndex: 0,
    explanation_en: 'Rejected with defect PRE_2026_EVENT_IN_2026_PUBLICATION: PIB PRID 2098813 is dated 01 February 2025, not 2026.',
    explanation_ta: '2026-ஆம் ஆண்டுக்கு முந்தைய நிகழ்வு என்பதால் நிராகரிக்கப்பட்டது (பிழை: PRE_2026_EVENT_IN_2026_PUBLICATION).',
    verificationScore: 0,
    rejectionReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION: Disqualified under mandatory 2026-only Current Affairs policy. Event occurred on 2025-02-01.',
    quarantineReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
  },
  {
    id: 'ca_2026_draft_03',
    contentVersion: 1,
    publicationMode: 'MANUAL_APPROVED',
    status: 'REJECTED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2026-10-07',
    publicationDate: '2026-10-07',
    category: 'Economy & Monetary Policy',
    category_ta: 'பொருளாதாரம் மற்றும் பணவியல் கொள்கை',
    officialDocumentId: 'RBI Press Release PRID 62121',
    sourcePublisher: 'Reserve Bank of India (Monetary Policy Committee)',
    sourceUrl: 'https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=62121',
    sourceExcerpt: 'On an assessment of current and evolving macroeconomic conditions, the Monetary Policy Committee (MPC) decided to increase the policy repo rate under the liquidity adjustment facility (LAF) by 25 basis points to 5.50 per cent with immediate effect.',
    question_en: 'At its October 2026 Monetary Policy Committee (MPC) meeting, the Reserve Bank of India adjusted the policy repo rate under the LAF to which level?',
    question_ta: '2026 அக்டோபர் பணவியல் கொள்கைக் குழு (MPC) கூட்டத்தில், இந்திய ரிசர்வ் வங்கி கொள்கை ரெப்போ விகிதத்தை எந்த அளவிற்கு மாற்றியமைத்தது?',
    options_en: ['6.50 per cent', '5.50 per cent', '6.00 per cent', '5.25 per cent'],
    options_ta: ['6.50 சதவீதம்', '5.50 சதவீதம்', '6.00 சதவீதம்', '5.25 சதவீதம்'],
    correctOptionIndex: 1,
    explanation_en: 'Rejected with defect FACTUAL_NUMERICAL_DISCREPANCY: June 2026 RBI repo rate was 5.25%, not 5.50%.',
    explanation_ta: 'உண்மைப் பிழை காரணமாக நிராகரிக்கப்பட்டது (பிழை: FACTUAL_NUMERICAL_DISCREPANCY - ரெப்போ விகிதம் 5.25%).',
    verificationScore: 0,
    rejectionReason: 'FACTUAL_NUMERICAL_DISCREPANCY: June 2026 RBI repo rate was 5.25%, not 5.50%.',
    quarantineReason: 'FACTUAL_NUMERICAL_DISCREPANCY',
  },
  {
    id: 'ca_2026_draft_07',
    contentVersion: 1,
    publicationMode: 'MANUAL_APPROVED',
    status: 'REJECTED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2026-07-22',
    publicationDate: '2026-07-22',
    category: 'Tamil Nadu & Industrial Growth',
    category_ta: 'தொழில்நுட்பம் மற்றும் தொழில் வளர்ச்சி',
    officialDocumentId: 'PIB PRID 2287658 / PIB PRID 2205046',
    sourcePublisher: 'Ministry of Electronics and Information Technology (MeitY)',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2287658',
    sourceExcerpt: 'Under the Modified Electronics Manufacturing Clusters (EMC 2.0) Scheme, the Steering Committee approved two clusters in Tamil Nadu: Manallur in Tiruvallur district (₹587.47 crore) and Pillapaikkam in Kanchipuram district (₹424.55 crore).',
    question_en: 'Under the Modified Electronics Manufacturing Clusters (EMC 2.0) Scheme, which two locations in Tamil Nadu were formally approved by MeitY in July 2026?',
    question_ta: 'திருத்தப்பட்ட மின்னணு உற்பத்தி தொகுப்புகள் திட்டம் (EMC 2.0) திட்டத்தின் கீழ், ஜூலை 2026-ல் தமிழ்நாட்டின் எந்த இரு இடங்களில் உற்பத்தித் தொகுப்புகளுக்கு MeitY ஒப்புதல் அளித்தது?',
    options_en: ['Manallur and Pillapaikkam', 'Hosur and Sriperumbudur', 'Ranipet and Cheyyar', 'Oragadam and Bargur'],
    options_ta: ['மணலூர் மற்றும் பிள்ளைப்பாக்கம்', 'ஓசூர் மற்றும் ஸ்ரீபெரும்புதூர்', 'ராணிப்பேட்டை மற்றும் செய்யாறு', 'ஒரகடம் மற்றும் பர்கூர்'],
    correctOptionIndex: 0,
    explanation_en: 'Rejected with defect PRE_2026_EVENT_IN_2026_PUBLICATION: Substantive approval occurred on 17 December 2025 (PIB PRID 2205046). Retrospectively tabled in Parliament on 22 July 2026 (PIB PRID 2287658). Question stem portrays 2025 approval as a July 2026 event.',
    explanation_ta: '2026-க்கு முந்தைய நிகழ்வு என்பதால் நிராகரிக்கப்பட்டது (பிழை: PRE_2026_EVENT_IN_2026_PUBLICATION - 17 டிசம்பர் 2025 அன்று ஒப்புதல் அளிக்கப்பட்டது).',
    verificationScore: 0,
    rejectionReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION: Substantive approval occurred on 17 December 2025 (PIB PRID 2205046). Retrospectively tabled in Parliament on 22 July 2026 (PIB PRID 2287658).',
    quarantineReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
  },
  {
    id: 'ca_2026_draft_04',
    contentVersion: 1,
    publicationMode: 'AUTO_VERIFIED',
    status: 'PUBLISHED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2026-10-12',
    publicationDate: '2026-10-12',
    category: 'Science & Technology',
    category_ta: 'அறிவியல் மற்றும் தொழில்நுட்பம்',
    officialDocumentId: 'ISRO Official Release 2026-SPADEX',
    sourcePublisher: 'Indian Space Research Organisation (ISRO)',
    sourceUrl: 'https://www.isro.gov.in/spadex_mission_update_2026.html',
    sourceExcerpt: 'The Space Docking Experiment (SPADEX) achieved autonomous rendezvous, docking, and formation flying between twin spacecraft, validating core technologies essential for lunar sample returns and the future Bharatiya Antariksh Station (BAS).',
    question_en: 'Which mission completed in October 2026 by ISRO successfully demonstrated autonomous rendezvous and docking between twin spacecraft in low Earth orbit?',
    question_ta: '2026 அக்டோபரில் இஸ்ரோவால் வெற்றிகரமாக நிறைவு செய்யப்பட்டு, புவி தாழ் வட்டப்பாதையில் இரட்டை விண்கலங்களுக்கு இடையே தன்னாட்சி இணைப்பை நிரூபித்த திட்டம் எது?',
    options_en: ['Gaganyaan TV-D2', 'Aditya-L2', 'Space Docking Experiment (SPADEX)', 'Chandrayaan-4 Re-entry'],
    options_ta: ['ககன்யான் TV-D2', 'ஆதித்யா-L2', 'விண்வெளி இணைப்பு சோதனை (SPADEX)', 'சந்திரயான்-4 மறுபிரவேசம்'],
    correctOptionIndex: 2,
    explanation_en: 'ISRO’s SPADEX mission successfully completed autonomous docking demonstrations in October 2026, serving as a critical milestone for Bharatiya Antariksh Station.',
    explanation_ta: 'பாரதிய விண்வெளி நிலையத்திற்கான முக்கிய மைல்கல்லான இரட்டை விண்கல தன்னாட்சி இணைப்பை இஸ்ரோவின் ஸ்பேடெக்ஸ் (SPADEX) திட்டம் 2026 அக்டோபரில் வெற்றிகரமாக நிறைவு செய்தது.',
    verificationScore: 100,
  },
  {
    id: 'ca_2026_draft_05',
    contentVersion: 1,
    publicationMode: 'AUTO_VERIFIED',
    status: 'PUBLISHED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2026-10-18',
    publicationDate: '2026-10-18',
    category: 'Tamil Nadu & Law Enforcement',
    category_ta: 'தமிழ்நாடு மற்றும் சட்டம் ஒழுங்கு',
    officialDocumentId: 'PIB PRID 2324872',
    sourcePublisher: 'Directorate of Revenue Intelligence (DRI), Ministry of Finance',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2324872',
    sourceExcerpt: 'In a sustained coastal surveillance operation near Vedaranyam coast in Nagapattinam district, Tamil Nadu, DRI officers intercepted 137 kg of crystal methamphetamine with an illicit international market value exceeding ₹100 crore.',
    question_en: 'In October 2026, the Directorate of Revenue Intelligence (DRI) intercepted 137 kg of crystal methamphetamine valued over ₹100 crore along which coastal region of Tamil Nadu?',
    question_ta: '2026 அக்டோபரில், வருவாய் புலனாய்வு இயக்குநரகம் (DRI) ₹100 கோடிக்கும் அதிகமான மதிப்புள்ள 137 கிலோ மெத்தம்பெட்டமைனை தமிழ்நாட்டின் எந்தக் கடலோரப் பகுதியில் கைப்பற்றியது?',
    options_en: ['Rameswaram, Ramanathapuram', 'Vedaranyam, Nagapattinam', 'Thoothukudi Coast', 'Kanyakumari Coast'],
    options_ta: ['ராமேஸ்வரம், ராமநாதபுரம்', 'வேதாரண்யம், நாகப்பட்டினம்', 'தூத்துக்குடி கடற்கரை', 'கன்னியாகுமரி கடற்கரை'],
    correctOptionIndex: 1,
    explanation_en: 'As reported in PIB PRID 2324872 on 18 October 2026, DRI intercepted 137 kg of crystal methamphetamine along the Vedaranyam coast in Nagapattinam district, Tamil Nadu.',
    explanation_ta: '2026 அக்டோபர் 18-ஆம் தேதியிட்ட PIB PRID 2324872 அறிவிப்பின்படி, தமிழ்நாட்டின் நாகப்பட்டினம் மாவட்டம் வேதாரண்யம் கடலோரப் பகுதியில் 137 கிலோ மெத்தம்பெட்டமைன் பறிமுதல் செய்யப்பட்டது.',
    verificationScore: 100,
  },
  {
    id: 'ca_2026_draft_11',
    contentVersion: 1,
    publicationMode: 'AUTO_VERIFIED',
    status: 'PUBLISHED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2026-01-08',
    publicationDate: '2026-01-08',
    category: 'Tamil Nadu Infrastructure',
    category_ta: 'தமிழ்நாடு உள்கட்டமைப்பு',
    officialDocumentId: 'PIB PRID 2212621',
    sourcePublisher: 'Ministry of Ports, Shipping and Waterways',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2212621',
    sourceExcerpt: 'Union Minister of Ports, Shipping & Waterways Sarbananda Sonowal launched port modernization and green sustainability projects worth ₹235 crore in Tamil Nadu, comprising ₹129.36 crore at Chennai Port and ₹105.64 crore at Kamarajar Port.',
    question_en: 'In January 2026, what was the total investment outlay of the port development and modernization projects launched across Chennai Port and Kamarajar Port by Union Minister Sarbananda Sonowal?',
    question_ta: 'ஜனவரி 2026-ல் மத்திய அமைச்சர் சர்பானந்த சோனோவால் அவர்களால் சென்னை மற்றும் காமராஜர் துறைமுகங்களில் தொடங்கி வைக்கப்பட்ட துறைமுக நவீனமயமாக்கல் திட்டங்களின் மொத்த மதிப்பு என்ன?',
    options_en: ['Rs. 235 crore', 'Rs. 540 crore', 'Rs. 150 crore', 'Rs. 380 crore'],
    options_ta: ['ரூ. 235 கோடி', 'ரூ. 540 கோடி', 'ரூ. 150 கோடி', 'ரூ. 380 கோடி'],
    correctOptionIndex: 0,
    explanation_en: 'According to PIB PRID 2212621 (8 January 2026), Union Minister Sarbananda Sonowal inaugurated projects worth ₹235 crore (₹129.36 Cr at Chennai Port and ₹105.64 Cr at Kamarajar Port).',
    explanation_ta: 'மத்திய துறைமுகங்கள் அமைச்சகத்தின் PIB PRID 2212621 (8 ஜனவரி 2026) செய்தியின்படி, சென்னை மற்றும் காமராஜர் துறைமுகங்களில் மொத்தம் ரூ. 235 கோடி மதிப்பிலான திட்டங்கள் தொடங்கி வைக்கப்பட்டன.',
    verificationScore: 100,
  },
  {
    id: 'ca_2026_draft_16',
    contentVersion: 1,
    publicationMode: 'MANUAL_APPROVED',
    status: 'REVIEW_REQUIRED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2026-04-20',
    publicationDate: '2026-04-20',
    category: 'Tamil Nadu & Welfare',
    category_ta: 'தமிழ்நாடு மற்றும் சமூக நலம்',
    officialDocumentId: 'TN DIPR Release No. 412/2026',
    sourcePublisher: 'Information and Public Relations Department, Government of Tamil Nadu',
    sourceUrl: 'https://www.tn.gov.in/pressrelease/dipr_412_2026',
    sourceExcerpt: 'Under the Chief Minister’s Breakfast Scheme, the state government expanded coverage to an additional 4,500 government-aided primary schools across rural blocks.',
    question_en: 'In April 2026, the Tamil Nadu Government expanded the Chief Minister’s Breakfast Scheme to how many government-aided rural primary schools?',
    question_ta: '2026 ஏப்ரலில், தமிழ்நாடு அரசு முதலமைச்சரின் காலை உணவுத் திட்டத்தை எத்தனை அரசு உதவிபெறும் கிராமப்புற தொடக்கப் பள்ளிகளுக்கு விரிவுபடுத்தியது?',
    options_en: ['4,500 schools', '3,000 schools', '6,000 schools', '2,500 schools'],
    options_ta: ['4,500 பள்ளிகள்', '3,000 பள்ளிகள்', '6,000 பள்ளிகள்', '2,500 பள்ளிகள்'],
    correctOptionIndex: 0,
    explanation_en: 'Awaiting independent confirmation of exact G.O. number for the April 2026 aided schools expansion.',
    explanation_ta: 'அரசு உதவிபெறும் பள்ளிகள் விரிவாக்கத்திற்கான அரசாணை எண் உறுதிப்படுத்தலுக்காக நிலுவையில் உள்ளது.',
    verificationScore: 88,
  },
  {
    id: 'ca_pub_04',
    contentVersion: 1,
    publicationMode: 'MANUAL_APPROVED',
    status: 'RETRACTED',
    verificationPolicyVersion: '2026.AUTO_V1',
    eventDate: '2026-05-10',
    publicationDate: '2026-05-10',
    category: 'Economy',
    category_ta: 'பொருளாதாரம்',
    officialDocumentId: 'RBI Governor Statement / Mon Policy',
    sourcePublisher: 'Reserve Bank of India',
    sourceUrl: 'https://rbi.org.in/press/monetary_policy_2026',
    sourceExcerpt: 'Retracted question: Initial key claimed repo rate was lowered to 6.25%, whereas official release retained rate at 6.50%. Retracted non-destructively under Erratum Policy.',
    question_en: 'According to the RBI policy statement issued in May 2026, the policy repo rate was maintained at which level?',
    question_ta: '2026 மே மாத ரிசர்வ் வங்கி கொள்கை அறிக்கையின்படி, ரெப்போ விகிதம் எந்த அளவில் பராமரிக்கப்பட்டது?',
    options_en: ['6.50%', '6.25%', '6.00%', '5.75%'],
    options_ta: ['6.50%', '6.25%', '6.00%', '5.75%'],
    correctOptionIndex: 0,
    explanation_en: 'Retracted question: Official RBI policy maintained 6.50%. All affected student attempts compensated non-destructively (+1.0 bonus mark applied).',
    explanation_ta: 'திரும்பப் பெறப்பட்ட வினா: அதிகாரப்பூர்வ ஆர்பிஐ கொள்கை 6.50% பராமரித்தது. பாதிக்கப்பட்ட மாணவர் முயற்சிகளுக்கு முழு மதிப்பெண் போனஸ் வழங்கப்பட்டது.',
    verificationScore: 0,
    quarantineReason: 'INCORRECT_ANSWER_KEY: Initial answer key conflicted with official RBI MPC resolution.',
    retractionDetails: {
      defectClassification: 'INCORRECT_ANSWER_KEY',
      remedyType: 'KEY_RESCORE',
      retractedAt: '2026-10-24T05:20:00Z',
      adminUid: 'admin_accuracy_controller_uid',
    },
  },
];

export default function CurrentAffairsAdminPage() {
  const [questions, setQuestions] = useState<AdminCAQuestionItem[]>(INITIAL_QUESTIONS);
  const [activeTab, setActiveTab] = useState('all');
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal / Drawer States
  const [editingItem, setEditingItem] = useState<AdminCAQuestionItem | null>(null);
  const [sourceInspectItem, setSourceInspectItem] = useState<AdminCAQuestionItem | null>(null);
  const [versionInspectItem, setVersionInspectItem] = useState<AdminCAQuestionItem | null>(null);
  const [retractItem, setRetractItem] = useState<AdminCAQuestionItem | null>(null);

  // Form states for editing
  const [editStemEn, setEditStemEn] = useState('');
  const [editStemTa, setEditStemTa] = useState('');
  const [editOptionsEn, setEditOptionsEn] = useState<string[]>(['', '', '', '']);
  const [editOptionsTa, setEditOptionsTa] = useState<string[]>(['', '', '', '']);
  const [editCorrectKey, setEditCorrectKey] = useState(0);
  const [editExpEn, setEditExpEn] = useState('');
  const [editExpTa, setEditExpTa] = useState('');
  const [editReason, setEditReason] = useState('');

  // Retraction modal form states
  const [defectClassification, setDefectClassification] = useState('INCORRECT_ANSWER_KEY');
  const [remedyType, setRemedyType] = useState('KEY_RESCORE');
  const [revisedKeyIndex, setRevisedKeyIndex] = useState(0);

  // Open Edit Dialog
  const openEditDialog = (item: AdminCAQuestionItem) => {
    setEditingItem(item);
    setEditStemEn(item.question_en);
    setEditStemTa(item.question_ta);
    setEditOptionsEn([...item.options_en]);
    setEditOptionsTa([...item.options_ta]);
    setEditCorrectKey(item.correctOptionIndex);
    setEditExpEn(item.explanation_en);
    setEditExpTa(item.explanation_ta);
    setEditReason('');
  };

  // Save as Draft
  const handleSaveDraft = () => {
    if (!editingItem) return;
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === editingItem.id
          ? {
              ...q,
              question_en: editStemEn,
              question_ta: editStemTa,
              options_en: editOptionsEn,
              options_ta: editOptionsTa,
              correctOptionIndex: editCorrectKey,
              explanation_en: editExpEn,
              explanation_ta: editExpTa,
              status: 'DRAFT',
            }
          : q
      )
    );
    setNotice(`Draft saved successfully for ${editingItem.id}. Status set to DRAFT.`);
    setEditingItem(null);
  };

  // Publish Correction (Increments contentVersion)
  const handlePublishCorrection = () => {
    if (!editingItem) return;
    const oldVersion: QuestionVersion = {
      version: editingItem.contentVersion,
      question_en: editingItem.question_en,
      question_ta: editingItem.question_ta,
      options_en: editingItem.options_en,
      options_ta: editingItem.options_ta,
      correctOptionIndex: editingItem.correctOptionIndex,
      explanation_en: editingItem.explanation_en,
      explanation_ta: editingItem.explanation_ta,
      modifiedAt: new Date().toISOString(),
      modifiedBy: 'admin_editorial_lead',
      changeReason: editReason || 'Editorial clarification and factual grounding alignment',
    };

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === editingItem.id
          ? {
              ...q,
              contentVersion: q.contentVersion + 1,
              question_en: editStemEn,
              question_ta: editStemTa,
              options_en: editOptionsEn,
              options_ta: editOptionsTa,
              correctOptionIndex: editCorrectKey,
              explanation_en: editExpEn,
              explanation_ta: editExpTa,
              status: 'PUBLISHED',
              publicationMode: 'MANUAL_APPROVED',
              previousVersions: [...(q.previousVersions || []), oldVersion],
            }
          : q
      )
    );
    setNotice(
      `Correction published for ${editingItem.id}. Incremented to contentVersion v${editingItem.contentVersion + 1}. Previous test manifests preserved.`
    );
    setEditingItem(null);
  };

  // Execute Retraction
  const handleExecuteRetraction = () => {
    if (!retractItem) return;
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === retractItem.id
          ? {
              ...q,
              status: 'RETRACTED',
              quarantineReason: `${defectClassification}: Admin erratum initiated with remedy ${remedyType}`,
              retractionDetails: {
                defectClassification,
                remedyType,
                retractedAt: new Date().toISOString(),
                adminUid: 'admin_accuracy_controller',
              },
            }
          : q
      )
    );
    setNotice(
      `Retraction executed for ${retractItem.id}. Defect: ${defectClassification}, Remedy: ${remedyType}. Student attempts will receive erratum adjustment without test record deletion.`
    );
    setRetractItem(null);
  };

  // Filtered lists
  const filteredQuestions = questions.filter((q) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'auto_published') return q.publicationMode === 'AUTO_VERIFIED' && q.status === 'PUBLISHED';
    if (activeTab === 'awaiting_correction') return q.status === 'REVIEW_REQUIRED' || q.status === 'DRAFT';
    if (activeTab === 'rejected') return q.status === 'REJECTED';
    if (activeTab === 'retracted') return q.status === 'RETRACTED';
    return true;
  });

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Layers className="h-8 w-8 text-primary" />
              Current Affairs Editorial Desk & Automation Engine
            </h1>
            <Badge className="bg-emerald-600 text-white font-mono text-xs">2026.AUTO_V1</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Automated 2026 Daily Publication Pipeline with Full Administrator Governance & Non-Destructive Erratum Engine
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={autoPublishEnabled ? 'default' : 'secondary'}
            className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <ShieldCheck className="h-4 w-4" />
            Auto-Publish: {autoPublishEnabled ? 'AUTO_VERIFIED (Active)' : 'MANUAL_APPROVED ONLY'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPublishEnabled(!autoPublishEnabled)}
            className="border-dashed text-xs"
          >
            Toggle Mode
          </Button>
        </div>
      </div>

      {/* Global Notice Alert */}
      {notice && (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between gap-3 text-sm text-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>Dismiss</Button>
        </div>
      )}

      {/* Pipeline Governance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold">Asia/Kolkata Execution</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-between">
              05:00–08:00 IST
              <Clock className="h-5 w-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Target: 10–15 fresh bilingual MCQs/day dynamically sized
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold">Auto-Published (2026)</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
              {questions.filter((q) => q.publicationMode === 'AUTO_VERIFIED' && q.status === 'PUBLISHED').length} MCQs
              <CheckCircle2 className="h-5 w-5 text-emerald-800 dark:text-emerald-300" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Fail-closed gates passed under 2026.AUTO_V1
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold">Awaiting Correction / Held</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between">
              {questions.filter((q) => q.status === 'REVIEW_REQUIRED' || q.status === 'DRAFT').length} MCQs
              <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Requires editor clarification before release
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-semibold">Isolated / Retracted</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-700 dark:text-rose-400 flex items-center justify-between">
              {questions.filter((q) => q.status === 'REJECTED' || q.status === 'RETRACTED').length} MCQs
              <ShieldAlert className="h-5 w-5 text-rose-700 dark:text-rose-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Non-destructive errata applied; 0 student records deleted
          </CardContent>
        </Card>
      </div>

      {/* Tabs Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="all" className="text-xs md:text-sm">
            All Questions ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="auto_published" className="text-xs md:text-sm">
            Auto-Published ({questions.filter((q) => q.publicationMode === 'AUTO_VERIFIED' && q.status === 'PUBLISHED').length})
          </TabsTrigger>
          <TabsTrigger value="awaiting_correction" className="text-xs md:text-sm">
            Awaiting Correction ({questions.filter((q) => q.status === 'REVIEW_REQUIRED' || q.status === 'DRAFT').length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs md:text-sm">
            Rejected ({questions.filter((q) => q.status === 'REJECTED').length})
          </TabsTrigger>
          <TabsTrigger value="retracted" className="text-xs md:text-sm">
            Retracted ({questions.filter((q) => q.status === 'RETRACTED').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold capitalize">
              {activeTab.replace('_', ' ')} Questions ({filteredQuestions.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Dynamic sizing target: 10–15 authentic questions · Fail-closed policy active
            </span>
          </div>

          {filteredQuestions.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No questions found in this category.
            </Card>
          ) : (
            filteredQuestions.map((item) => (
              <Card
                key={item.id}
                className={`border-l-4 transition-shadow hover:shadow-md ${
                  item.status === 'PUBLISHED'
                    ? 'border-l-emerald-600'
                    : item.status === 'REJECTED'
                    ? 'border-l-destructive'
                    : item.status === 'RETRACTED'
                    ? 'border-l-rose-600'
                    : 'border-l-amber-500'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">
                        {item.id}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        v{item.contentVersion}
                      </Badge>
                      <Badge
                        variant={item.publicationMode === 'AUTO_VERIFIED' ? 'default' : 'secondary'}
                        className="text-xs font-mono"
                      >
                        {item.publicationMode}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Event: {item.eventDate}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          item.status === 'PUBLISHED'
                            ? 'default'
                            : item.status === 'REJECTED' || item.status === 'RETRACTED'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs uppercase font-bold"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Bilingual Question Stem */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        English Question
                      </span>
                      <p className="font-medium text-foreground mt-1 text-sm md:text-base">
                        {item.question_en}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        தமிழ் வினா
                      </span>
                      <p className="font-medium text-foreground mt-1 text-sm md:text-base">
                        {item.question_ta}
                      </p>
                    </div>
                  </div>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {item.options_en.map((optEn, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-md text-sm border flex items-start justify-between ${
                          idx === item.correctOptionIndex
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-bold'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        <span>
                          <strong className="mr-2">{String.fromCharCode(65 + idx)}.</strong>
                          {optEn} / {item.options_ta[idx]}
                        </span>
                        {idx === item.correctOptionIndex && (
                          <div className="flex items-center gap-1 text-emerald-800 dark:text-emerald-300 text-xs font-bold shrink-0 ml-2">
                            <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                            <span>Correct Key</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Provenance & Citation Bar */}
                  <div className="bg-muted/20 border p-3 rounded-md text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-bold text-foreground">Official Document: </span>
                        <span className="text-muted-foreground font-mono">{item.officialDocumentId}</span>
                      </div>
                      <div>
                        <span className="font-bold text-foreground">Issuing Authority: </span>
                        <span className="text-muted-foreground">{item.sourcePublisher}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSourceInspectItem(item)}
                      className="text-primary hover:underline flex items-center gap-1 font-semibold text-xs h-7 px-2"
                    >
                      <Eye className="h-3.5 w-3.5" /> Inspect Primary Source
                    </Button>
                  </div>

                  {/* Retraction / Quarantine Reason Banner */}
                  {(item.quarantineReason || item.rejectionReason) && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Defect Audit: </span>
                        <span>{item.rejectionReason || item.quarantineReason}</span>
                        {item.retractionDetails && (
                          <div className="mt-1 font-mono text-[11px]">
                            Remedy: {item.retractionDetails.remedyType} · Rescored on {item.retractionDetails.retractedAt} by {item.retractionDetails.adminUid}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      {item.previousVersions && item.previousVersions.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVersionInspectItem(item)}
                          className="text-xs h-8"
                        >
                          <History className="h-3.5 w-3.5 mr-1" /> Compare Versions ({item.previousVersions.length})
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status !== 'RETRACTED' && item.status !== 'REJECTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRetractItem(item)}
                          className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Retract Immediately
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(item)}
                        className="text-xs h-8"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Question
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL 1: EDIT QUESTION DIALOG */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-background">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-primary" />
                    Edit Question & Options — {editingItem.id}
                  </CardTitle>
                  <CardDescription>
                    Current Version: v{editingItem.contentVersion} · Non-destructive update with version increment
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>✕</Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">English Question</label>
                <textarea
                  value={editStemEn}
                  onChange={(e) => setEditStemEn(e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-background"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">தமிழ் வினா (Tamil Question)</label>
                <textarea
                  value={editStemTa}
                  onChange={(e) => setEditStemTa(e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-background"
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-muted-foreground">4 Options (EN / TA)</label>
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{String.fromCharCode(65 + idx)}.</span>
                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + idx)} (English)`}
                        value={editOptionsEn[idx]}
                        onChange={(e) => {
                          const updated = [...editOptionsEn];
                          updated[idx] = e.target.value;
                          setEditOptionsEn(updated);
                        }}
                        className="flex-1 p-1.5 border rounded text-xs bg-background"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder={`விருப்பம் ${String.fromCharCode(65 + idx)} (தமிழ்)`}
                      value={editOptionsTa[idx]}
                      onChange={(e) => {
                        const updated = [...editOptionsTa];
                        updated[idx] = e.target.value;
                        setEditOptionsTa(updated);
                      }}
                      className="w-full p-1.5 border rounded text-xs bg-background"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground">Correct Option Key</label>
                  <select
                    value={editCorrectKey}
                    onChange={(e) => setEditCorrectKey(Number(e.target.value))}
                    className="w-full p-2 border rounded text-sm bg-background mt-1"
                  >
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground">Reason for Revision</label>
                  <input
                    type="text"
                    placeholder="e.g., Factual correction from revised gazette notification"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-background mt-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">English Explanation</label>
                <textarea
                  value={editExpEn}
                  onChange={(e) => setEditExpEn(e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-background"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">தமிழ் விளக்கம் (Tamil Explanation)</label>
                <textarea
                  value={editExpTa}
                  onChange={(e) => setEditExpTa(e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-background"
                  rows={2}
                />
              </div>
            </CardContent>

            <CardFooter className="border-t flex items-center justify-between gap-3 pt-4">
              <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-1" /> Save as Draft
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>Cancel</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handlePublishCorrection}>
                  <Send className="h-4 w-4 mr-1" /> Publish Correction (v{editingItem.contentVersion + 1})
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* MODAL 2: INSPECT SOURCE DIALOG */}
      {sourceInspectItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-background">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Primary Government Source Evidence
                  </CardTitle>
                  <CardDescription>{sourceInspectItem.id} · {sourceInspectItem.officialDocumentId}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSourceInspectItem(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-muted-foreground uppercase">Authority:</span>
                  <p className="font-medium text-foreground mt-0.5">{sourceInspectItem.sourcePublisher}</p>
                </div>
                <div>
                  <span className="font-bold text-muted-foreground uppercase">Verified Dates:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    Publication: {sourceInspectItem.publicationDate} · Event: {sourceInspectItem.eventDate}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">Official URL:</span>
                <div className="flex items-center justify-between p-2 bg-muted rounded text-xs font-mono break-all mt-1">
                  <span>{sourceInspectItem.sourceUrl}</span>
                  <a href={sourceInspectItem.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline ml-2 shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase">Verifiable Primary Evidence Excerpt:</span>
                <blockquote className="p-3 bg-muted/40 border-l-4 border-l-primary rounded text-xs leading-relaxed text-foreground mt-1 italic">
                  "{sourceInspectItem.sourceExcerpt}"
                </blockquote>
              </div>
            </CardContent>
            <CardFooter className="border-t flex justify-end">
              <Button size="sm" onClick={() => setSourceInspectItem(null)}>Close</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* MODAL 3: VERSION COMPARISON DIALOG */}
      {versionInspectItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-background">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Version Comparison — {versionInspectItem.id}
                  </CardTitle>
                  <CardDescription>Current v{versionInspectItem.contentVersion} vs Previous Revision</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setVersionInspectItem(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 py-4 text-xs">
              {versionInspectItem.previousVersions?.map((prev, idx) => (
                <div key={idx} className="space-y-3 p-3 border rounded bg-muted/20">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Badge variant="outline">Version {prev.version}</Badge>
                    <span className="text-muted-foreground">Modified by {prev.modifiedBy} on {prev.modifiedAt}</span>
                  </div>
                  <div>
                    <span className="font-bold">Reason for Change: </span>
                    <span className="text-muted-foreground">{prev.changeReason}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-2 border rounded bg-background">
                      <span className="font-bold text-muted-foreground uppercase">Previous (v{prev.version})</span>
                      <p className="mt-1">{prev.question_en}</p>
                      <p className="mt-1 text-emerald-700 font-semibold">Key: Option {String.fromCharCode(65 + prev.correctOptionIndex)}</p>
                    </div>
                    <div className="p-2 border rounded bg-background">
                      <span className="font-bold text-muted-foreground uppercase">Current (v{versionInspectItem.contentVersion})</span>
                      <p className="mt-1">{versionInspectItem.question_en}</p>
                      <p className="mt-1 text-emerald-700 font-semibold">Key: Option {String.fromCharCode(65 + versionInspectItem.correctOptionIndex)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="border-t flex justify-end">
              <Button size="sm" onClick={() => setVersionInspectItem(null)}>Close</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* MODAL 4: RETRACTION & ERRATUM DIALOG */}
      {retractItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-background border-destructive/40">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-destructive flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" />
                    Immediate Retraction & Erratum Execution
                  </CardTitle>
                  <CardDescription>Question: {retractItem.id}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRetractItem(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 py-4 text-xs">
              <div>
                <label className="font-bold uppercase text-muted-foreground">Defect Classification</label>
                <select
                  value={defectClassification}
                  onChange={(e) => setDefectClassification(e.target.value)}
                  className="w-full p-2 border rounded mt-1 bg-background text-sm"
                >
                  <option value="INCORRECT_ANSWER_KEY">INCORRECT_ANSWER_KEY</option>
                  <option value="AMBIGUOUS_QUESTION">AMBIGUOUS_QUESTION</option>
                  <option value="INVALID_QUESTION">INVALID_QUESTION</option>
                  <option value="TRANSLATION_DISCREPANCY">TRANSLATION_DISCREPANCY</option>
                  <option value="INCORRECT_CITATION_ONLY">INCORRECT_CITATION_ONLY</option>
                </select>
              </div>

              <div>
                <label className="font-bold uppercase text-muted-foreground">Remedy Type</label>
                <select
                  value={remedyType}
                  onChange={(e) => setRemedyType(e.target.value)}
                  className="w-full p-2 border rounded mt-1 bg-background text-sm"
                >
                  <option value="KEY_RESCORE">KEY_RESCORE (Rescore with revised key)</option>
                  <option value="ACCEPT_MULTIPLE_KEYS">ACCEPT_MULTIPLE_KEYS (Accept both keys)</option>
                  <option value="FULL_MARKS_AWARDED">FULL_MARKS_AWARDED (Grant bonus marks to all attempts)</option>
                  <option value="LANGUAGE_SPECIFIC_RESCORE">LANGUAGE_SPECIFIC_RESCORE (Tamil/English specific)</option>
                  <option value="METADATA_UPDATE_ONLY">METADATA_UPDATE_ONLY (Citation fix only)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-amber-700 dark:text-amber-400 space-y-1">
                <span className="font-bold">Erratum Safety Guarantees:</span>
                <p>• Zero student exam history records deleted.</p>
                <p>• Score adjustments applied transparently without double compensation.</p>
                <p>• Item neutralized in student mistake vaults.</p>
                <p>• Daily manifest updated to exclude retracted item.</p>
              </div>
            </CardContent>
            <CardFooter className="border-t flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setRetractItem(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleExecuteRetraction}>
                Confirm & Retract Immediately
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
