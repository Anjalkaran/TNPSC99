import { NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { PublicSampleTestPackage } from '@/data/public-sample-questions';
import { TemporalEligibilityValidator } from '@/lib/accuracy/temporal-validator';

export const dynamic = 'force-dynamic';

/**
 * Public Dynamic Current Affairs API
 * 
 * Enforces the Mandatory 2026-Only Current Affairs Fallback Priority:
 * First: Today's fully approved 2026 Current Affairs edition.
 * Second: Most recent approved 2026 Current Affairs edition, showing original date & labelled as revision.
 * Third: Editorial verification fallback:
 *        English: "2026 Current Affairs — Editorial Verification in Progress."
 *        Tamil:   "2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது."
 * Never display fabricated, unverified or pre-2026 questions.
 */
export async function GET() {
  try {
    if (!db) {
      throw new Error('Database instance is unavailable');
    }

    const todayDate = new Date().toISOString().split('T')[0];
    
    // Query recent published daily manifests ordered by date descending
    const manifestsSnap = await db
      .collection('ca_manifests')
      .where('type', '==', 'daily')
      .where('status', '==', 'published')
      .orderBy('periodEnd', 'desc')
      .limit(5)
      .get();

    if (manifestsSnap.empty) {
      return NextResponse.json({
        hasApprovedEdition: false,
        status: 'EDITORIAL_REVIEW_IN_PROGRESS',
        tier: 'EDITORIAL_VERIFICATION_IN_PROGRESS',
        message: '2026 Current Affairs — Editorial Verification in Progress.',
        message_ta: '2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது.',
        editionDate: null,
        package: null,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }

    // Inspect manifests in reverse-chronological order to apply Tier 1 vs Tier 2
    for (const manifestDoc of manifestsSnap.docs) {
      const manifestData = manifestDoc.data();

      // Exclude retracted manifests, premium manifests, or invalid access metadata
      const isManifestValidFreeDaily =
        manifestData.status === 'published' &&
        manifestData.isRetracted !== true &&
        manifestData.isFree === true &&
        manifestData.accessLevel === 'free';

      if (!isManifestValidFreeDaily) {
        continue;
      }

      const questionIds: string[] = manifestData.questionIds || [];
      if (questionIds.length === 0) {
        continue; // Empty manifest, check next fallback
      }

      // Query questions for this manifest
      const questionsSnap = await db
        .collection('currentAffairsQuestions')
        .where('status', '==', 'PUBLISHED')
        .where('__name__', 'in', questionIds.slice(0, 15))
        .get();

      if (questionsSnap.empty) {
        continue;
      }

      // Validate publication status & strict 2026 temporal eligibility
      const approvedQuestions = questionsSnap.docs
        .filter((doc) => {
          const d = doc.data();
          if (
            d.status !== 'PUBLISHED' ||
            d.isRetracted === true ||
            d.isQuarantined === true ||
            d.isFree !== true ||
            d.accessLevel !== 'free'
          ) {
            return false;
          }

          // Strict 2026 Temporal Gate Check
          const temporal = TemporalEligibilityValidator.validate({
            id: doc.id,
            question_en: d.question_en,
            question_ta: d.question_ta,
            options_en: d.options_en,
            options_ta: d.options_ta,
            correctOptionIndex: d.correctOptionIndex,
            explanation_en: d.explanation_en,
            explanation_ta: d.explanation_ta,
            eventDate: d.eventDate,
            publicationDate: d.publicationDate,
            isCurrentAffairs: true,
            olderSchemeContext: d.olderSchemeContext,
          });

          return temporal.eligible;
        })
        .map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            category: d.category || 'Current Affairs',
            category_ta: d.category_ta || 'நடப்பு நிகழ்வுகள்',
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
            eventDate: d.eventDate,
            publicationDate: d.publicationDate,
          };
        });

      if (approvedQuestions.length === 0) {
        continue;
      }

      const editionDate = manifestData.periodEnd;
      const isTodayEdition = editionDate === todayDate;

      // -----------------------------------------------------------------------
      // TIER 1: Today's Fully Approved 2026 Current Affairs Edition
      // -----------------------------------------------------------------------
      if (isTodayEdition) {
        const dynamicPackage: PublicSampleTestPackage = {
          id: manifestDoc.id,
          title_en: manifestData.title_en || `Daily Current Affairs (${approvedQuestions.length} Questions)`,
          title_ta: manifestData.title_ta || `தினசரி நடப்பு நிகழ்வுகள் (${approvedQuestions.length} வினாக்கள்)`,
          subtitle_en: `Officially Verified · ${editionDate} Edition`,
          subtitle_ta: `அங்கீகரிக்கப்பட்ட பதிப்பு · ${editionDate}`,
          editionDate,
          questionCount: approvedQuestions.length,
          durationMinutes: manifestData.durationMinutes || 10,
          isRevision: false,
          questions: approvedQuestions,
        };

        return NextResponse.json({
          hasApprovedEdition: true,
          status: 'PUBLISHED',
          tier: 'TODAY_APPROVED',
          editionDate,
          isRevision: false,
          package: dynamicPackage,
        }, {
          headers: {
            'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=60',
            'X-Content-Type-Options': 'nosniff',
          }
        });
      }

      // -----------------------------------------------------------------------
      // TIER 2: Revision Fallback (Most Recent Approved 2026 Edition)
      // -----------------------------------------------------------------------
      const revisionPackage: PublicSampleTestPackage = {
        id: manifestDoc.id,
        title_en: manifestData.title_en || `Daily Current Affairs — Revision Practice (${approvedQuestions.length} Questions)`,
        title_ta: manifestData.title_ta || `தினசரி நடப்பு நிகழ்வுகள் — மீள்பார்வைப் பயிற்சி (${approvedQuestions.length} வினாக்கள்)`,
        subtitle_en: manifestData.subtitle_en || `Revision Practice · ${editionDate} Edition`,
        subtitle_ta: manifestData.subtitle_ta || `மீள்பார்வைப் பயிற்சி · ${editionDate} பதிப்பு`,
        editionDate,
        originalEditionDate: editionDate,
        isRevision: true,
        revisionNotice_en: manifestData.revisionNotice_en || `October 2026 Revision Practice — ${editionDate} Edition`,
        revisionNotice_ta: manifestData.revisionNotice_ta || `அக்டோபர் 2026 மீள்பார்வைப் பயிற்சி — ${editionDate} பதிப்பு`,
        questionCount: approvedQuestions.length,
        durationMinutes: manifestData.durationMinutes || 10,
        questions: approvedQuestions,
      };

      return NextResponse.json({
        hasApprovedEdition: true,
        status: 'PUBLISHED',
        tier: 'REVISION_FALLBACK',
        editionDate,
        originalEditionDate: editionDate,
        isRevision: true,
        revisionNotice_en: manifestData.revisionNotice_en || `October 2026 Revision Practice — ${editionDate} Edition`,
        revisionNotice_ta: manifestData.revisionNotice_ta || `அக்டோபர் 2026 மீள்பார்வைப் பயிற்சி — ${editionDate} பதிப்பு`,
        message: manifestData.message || `Today's edition is under editorial verification. Serving October 2026 Revision Practice from ${editionDate}.`,
        message_ta: manifestData.message_ta || `இன்றைய பதிப்பு உண்மைச் சரிபார்ப்பில் உள்ளது. ${editionDate} தேதியிட்ட அக்டோபர் 2026 மீள்பார்வைப் பயிற்சி வழங்கப்படுகிறது.`,
        package: revisionPackage,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=180, s-maxage=600',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }

    // -------------------------------------------------------------------------
    // TIER 3: No Approved 2026 Edition Exists -> Editorial Verification Fallback
    // -------------------------------------------------------------------------
    return NextResponse.json({
      hasApprovedEdition: false,
      status: 'EDITORIAL_REVIEW_IN_PROGRESS',
      tier: 'EDITORIAL_VERIFICATION_IN_PROGRESS',
      message: '2026 Current Affairs — Editorial Verification in Progress.',
      message_ta: '2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது.',
      editionDate: null,
      package: null,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=120, s-maxage=300',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  } catch (err: any) {
    console.error('[daily-ca API internal error]:', err?.message || err);
    // Fail-closed fallback: if database is unreachable, report Tier 3 verification status
    return NextResponse.json({
      hasApprovedEdition: false,
      status: 'EDITORIAL_REVIEW_IN_PROGRESS',
      tier: 'EDITORIAL_VERIFICATION_IN_PROGRESS',
      message: '2026 Current Affairs — Editorial Verification in Progress.',
      message_ta: '2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது.',
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
