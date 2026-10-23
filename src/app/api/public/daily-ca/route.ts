import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PublicSampleTestPackage } from '@/data/public-sample-questions';

// Initialize Firebase Admin if available in runtime
if (!getApps().length) {
  try {
    initializeApp();
  } catch {
    // Emulator or build fallback
  }
}

/**
 * Public Dynamic Current Affairs API
 * Fetches the latest officially APPROVED and PUBLISHED Current Affairs edition.
 * If no edition has received editorial sign-off, returns hasApprovedEdition: false
 * to strictly prevent fabricating unapproved tests.
 */
export async function GET() {
  try {
    const db = getFirestore();
    
    // Query for latest published daily manifest
    const manifestsSnap = await db
      .collection('ca_manifests')
      .where('type', '==', 'daily')
      .where('status', '==', 'published')
      .orderBy('periodEnd', 'desc')
      .limit(1)
      .get();

    if (manifestsSnap.empty) {
      return NextResponse.json({
        hasApprovedEdition: false,
        status: 'EDITORIAL_REVIEW_IN_PROGRESS',
        message: 'Upcoming Current Affairs edition is undergoing official verification by the editorial desk against Tamil Nadu Government Gazettes.',
        editionDate: null,
        package: null,
      });
    }

    const manifestDoc = manifestsSnap.docs[0];
    const manifestData = manifestDoc.data();

    // Exclude retracted manifests
    if (manifestData.isRetracted === true || manifestData.status !== 'published') {
      return NextResponse.json({
        hasApprovedEdition: false,
        status: 'EDITORIAL_REVIEW_IN_PROGRESS',
        message: 'Upcoming Current Affairs edition is undergoing official verification by the editorial desk against Tamil Nadu Government Gazettes.',
        editionDate: null,
        package: null,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }

    const questionIds: string[] = manifestData.questionIds || [];

    if (questionIds.length === 0) {
      return NextResponse.json({
        hasApprovedEdition: false,
        status: 'EDITORIAL_REVIEW_IN_PROGRESS',
        message: 'No approved questions attached to active manifest.',
        editionDate: null,
        package: null,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }

    // Retrieve approved questions, strictly excluding retracted or unverified questions
    const questionsSnap = await db
      .collection('currentAffairsQuestions')
      .where('status', '==', 'PUBLISHED')
      .where('__name__', 'in', questionIds.slice(0, 10))
      .get();

    if (questionsSnap.empty) {
      return NextResponse.json({
        hasApprovedEdition: false,
        status: 'EDITORIAL_REVIEW_IN_PROGRESS',
        message: 'Published questions are currently being indexed.',
        editionDate: null,
        package: null,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }

    // Strictly validate publication status and filter out retracted or unapproved questions
    const approvedQuestions = questionsSnap.docs
      .filter((doc) => {
        const d = doc.data();
        return d.status === 'PUBLISHED' && d.isRetracted !== true;
      })
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          category: d.category || 'General',
          category_ta: d.category_ta || 'பொது',
          examGroup: d.examType || 'Group II',
          difficulty: d.difficulty || 'medium',
          question_en: d.question_en,
          options_en: d.options_en,
          explanation_en: d.explanation_en,
          question_ta: d.question_ta,
          options_ta: d.options_ta,
          explanation_ta: d.explanation_ta,
          correctOptionIndex: d.correctOptionIndex,
          sourceRef: d.publisher || 'Government Notification',
          sourceUrl: d.sourceUrl,
        };
      });

    if (approvedQuestions.length === 0) {
      return NextResponse.json({
        hasApprovedEdition: false,
        status: 'EDITORIAL_REVIEW_IN_PROGRESS',
        message: 'No valid questions passed publication validation.',
        editionDate: null,
        package: null,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }

    const dynamicPackage: PublicSampleTestPackage = {
      id: manifestDoc.id,
      title_en: manifestData.title_en || 'Daily Current Affairs — Approved Edition',
      title_ta: manifestData.title_ta || 'தினசரி நடப்பு நிகழ்வுகள் — அங்கீகரிக்கப்பட்ட பதிப்பு',
      subtitle_en: `Officially Verified · ${manifestData.periodEnd} Edition`,
      subtitle_ta: `அங்கீகரிக்கப்பட்ட பதிப்பு · ${manifestData.periodEnd}`,
      editionDate: manifestData.periodEnd,
      questionCount: approvedQuestions.length,
      durationMinutes: manifestData.durationMinutes || 10,
      questions: approvedQuestions,
    };

    return NextResponse.json({
      hasApprovedEdition: true,
      status: 'PUBLISHED',
      editionDate: manifestData.periodEnd,
      package: dynamicPackage,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=60',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  } catch (err: any) {
    // Fail-closed fallback: if database is unreachable or offline, report review status
    return NextResponse.json({
      hasApprovedEdition: false,
      status: 'EDITORIAL_REVIEW_IN_PROGRESS',
      message: 'Upcoming Current Affairs edition is undergoing official verification by the editorial desk against Tamil Nadu Government Gazettes.',
      editionDate: null,
      package: null,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  }
}
