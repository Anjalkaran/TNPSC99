import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../src/app/(app)/admin/current-affairs/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update ca_2026_draft_03 to REJECTED and add ca_2026_draft_07
const q3Search = `  {
    id: 'ca_2026_draft_03',
    contentVersion: 1,
    publicationMode: 'AUTO_VERIFIED',
    status: 'PUBLISHED',`;

const q3Replacement = `  {
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
  },`;

const q3Start = content.indexOf(q3Search);
if (q3Start === -1) {
  console.error('q3Search not found');
  process.exit(1);
}
const q3End = content.indexOf('  },', q3Start) + 4; // up to end of q3
content = content.slice(0, q3Start) + q3Replacement + content.slice(q3End);

// Also update ca_2026_draft_11
const q11Search = `    id: 'ca_2026_draft_11',`;
const q11Start = content.indexOf(q11Search);
if (q11Start !== -1) {
  const q11ItemStart = content.lastIndexOf('  {', q11Start);
  const q11End = content.indexOf('  },', q11Start) + 4;
  const q11Replacement = `  {
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
  },`;
  content = content.slice(0, q11ItemStart) + q11Replacement + content.slice(q11End);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated admin/current-affairs/page.tsx with node script!');
