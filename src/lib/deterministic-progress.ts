import type {
  UserTestAttempt,
  MistakeVaultItem,
  ChapterProgress,
  SubjectProgress,
  StudentProgressSummary,
  ConfidenceLevel,
  MasteryStatus,
  RecommendedRevision,
} from './types';

/**
 * Clean and standardize test titles for chapter grouping
 */
function extractChapterInfo(testTitle?: string, testId?: string): { chapterName: string; subjectName: string } {
  const title = (testTitle || '').trim();
  
  if (title.includes('தமிழ்')) {
    // e.g. "பத்தாம் வகுப்பு தமிழ் — இயல் 1: சொல்"
    const match = title.match(/இயல்\s*\d+[^—\-]*/i);
    const chapter = match ? match[0].trim() : title;
    return { chapterName: chapter || 'இயல் 1: சொல்', subjectName: 'தமிழ் (Tamil)' };
  }

  if (title.toLowerCase().includes('group') || title.toLowerCase().includes('gk') || title.toLowerCase().includes('general')) {
    return { chapterName: title || 'பொது அறிவு (General Studies)', subjectName: 'பொது அறிவு (GS)' };
  }

  if (title.toLowerCase().includes('aptitude') || title.toLowerCase().includes('math')) {
    return { chapterName: title || 'கணிதம் & நுண்ணறிவு', subjectName: 'கணிதம் (Aptitude)' };
  }

  return { chapterName: title || 'பாடம் (General)', subjectName: 'பொதுப் பாடம்' };
}

/**
 * Computes deterministic student learning progress from completed attempts and mistake vault records.
 * ZERO paid AI inference — 100% mathematical, local statistical analytics.
 */
export function computeStudentProgress(
  attempts: UserTestAttempt[] = [],
  mistakes: MistakeVaultItem[] = []
): StudentProgressSummary {
  // 1. Guard against null / undefined / zero-attempt users
  if (!Array.isArray(attempts) || attempts.length === 0) {
    const unresolvedCount = Array.isArray(mistakes) ? mistakes.filter(m => m.status === 'unresolved').length : 0;
    return {
      totalAttempts: 0,
      completedAttempts: 0,
      totalQuestionsAttempted: 0,
      totalCorrect: 0,
      overallAccuracy: 0,
      unresolvedMistakesCount: unresolvedCount,
      subjects: [],
      weakChapters: [],
      recommendedRevision: unresolvedCount > 0 ? {
        type: 'mistake_vault',
        title: 'தவறு பெட்டகம் (Mistake Vault)',
        description: `${unresolvedCount} தவறிய வினாக்கள் காத்திருக்கின்றன. திருப்புதல் பயிற்சி செய்யுங்கள்.`,
        availableQuestionCount: unresolvedCount,
      } : undefined,
    };
  }

  // 2. Deduplicate attempts by unique attempt ID to avoid double-counting
  const seenAttemptIds = new Set<string>();
  const uniqueAttempts: UserTestAttempt[] = [];

  for (const att of attempts) {
    if (!att || !att.id) continue;
    if (seenAttemptIds.has(att.id)) continue;
    seenAttemptIds.add(att.id);
    uniqueAttempts.push(att);
  }

  // Filter completed attempts
  const completedAttempts = uniqueAttempts.filter(a => a.status === 'completed');

  let totalQuestionsAttempted = 0;
  let totalCorrect = 0;

  // Chapter aggregation map: key -> ChapterAccumulator
  interface ChapterAccumulator {
    chapterId: string;
    chapterName: string;
    subjectName: string;
    attemptCount: number;
    totalAttemptedAnswers: number;
    totalCorrectAnswers: number;
    uniqueQuestionIds: Set<string>;
    lastDate?: string;
  }

  const chapterMap = new Map<string, ChapterAccumulator>();

  for (const att of completedAttempts) {
    const { chapterName, subjectName } = extractChapterInfo(att.testTitle, att.testId);
    const key = `${subjectName}::${chapterName}`;

    let acc = chapterMap.get(key);
    if (!acc) {
      acc = {
        chapterId: att.testId || key,
        chapterName,
        subjectName,
        attemptCount: 0,
        totalAttemptedAnswers: 0,
        totalCorrectAnswers: 0,
        uniqueQuestionIds: new Set<string>(),
        lastDate: att.lastUpdatedDate || att.completedAt,
      };
      chapterMap.set(key, acc);
    }

    acc.attemptCount += 1;
    if (att.lastUpdatedDate && (!acc.lastDate || att.lastUpdatedDate > acc.lastDate)) {
      acc.lastDate = att.lastUpdatedDate;
    }

    if (Array.isArray(att.questionIds)) {
      att.questionIds.forEach(qid => acc!.uniqueQuestionIds.add(qid));
    }

    // Answers counting: non -1
    if (Array.isArray(att.answers)) {
      att.answers.forEach(a => {
        if (a !== undefined && a !== -1) {
          acc!.totalAttemptedAnswers += 1;
          totalQuestionsAttempted += 1;
        }
      });
    }

    const score = Number(att.score) || 0;
    acc.totalCorrectAnswers += score;
    totalCorrect += score;
  }

  // Calculate chapter metrics
  const chapterProgressList: (ChapterProgress & { subjectName: string })[] = [];

  chapterMap.forEach((acc) => {
    const attempted = acc.totalAttemptedAnswers;
    const correct = Math.min(acc.totalCorrectAnswers, attempted);
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    
    // Coverage based on unique questions seen vs typical 50-question chapter benchmark
    const estimatedTotal = Math.max(acc.uniqueQuestionIds.size, 50);
    const coverage = Math.min(100, Math.round((acc.uniqueQuestionIds.size / estimatedTotal) * 100));

    // Confidence determination
    let confidence: ConfidenceLevel = 'low';
    if (attempted < 5 || acc.attemptCount < 2) {
      confidence = 'insufficient_data';
    } else if (acc.attemptCount >= 3 && attempted >= 10) {
      confidence = 'high';
    } else if (acc.attemptCount >= 2 && attempted >= 5) {
      confidence = 'moderate';
    }

    // Mastery classification with strict evidence guard
    let masteryStatus: MasteryStatus = 'unattempted';
    if (attempted === 0) {
      masteryStatus = 'unattempted';
    } else if (confidence === 'insufficient_data') {
      // CANNOT be mastered with insufficient data
      masteryStatus = accuracy < 50 ? 'needs_focus' : 'practicing';
    } else if (accuracy >= 80 && (confidence === 'high' || confidence === 'moderate')) {
      masteryStatus = 'mastered';
    } else if (accuracy < 60) {
      masteryStatus = 'needs_focus';
    } else {
      masteryStatus = 'practicing';
    }

    chapterProgressList.push({
      chapterId: acc.chapterId,
      chapterName: acc.chapterName,
      subjectName: acc.subjectName,
      totalQuestions: estimatedTotal,
      attemptedQuestions: attempted,
      correctQuestions: correct,
      accuracy,
      coverage,
      repetition: acc.attemptCount,
      confidence,
      masteryStatus,
      lastPracticedDate: acc.lastDate,
    });
  });

  // Group chapters into subjects
  const subjectMap = new Map<string, ChapterProgress[]>();
  chapterProgressList.forEach(ch => {
    const list = subjectMap.get(ch.subjectName) || [];
    list.push(ch);
    subjectMap.set(ch.subjectName, list);
  });

  const subjects: SubjectProgress[] = [];
  subjectMap.forEach((chapters, subjectName) => {
    const totalChapters = chapters.length;
    const masteredChapters = chapters.filter(c => c.masteryStatus === 'mastered').length;
    const totalAcc = chapters.reduce((sum, c) => sum + c.accuracy, 0);
    const avgAccuracy = totalChapters > 0 ? Math.round(totalAcc / totalChapters) : 0;
    const totalSubjectAttempts = chapters.reduce((sum, c) => sum + c.repetition, 0);

    subjects.push({
      subjectId: subjectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      subjectName,
      totalChapters,
      masteredChapters,
      averageAccuracy: avgAccuracy,
      totalAttempts: totalSubjectAttempts,
      chapters,
    });
  });

  // Identify weak chapters (<60% accuracy or needs_focus)
  const weakChapters = chapterProgressList
    .filter(c => c.masteryStatus === 'needs_focus' || (c.accuracy < 60 && c.attemptedQuestions >= 3))
    .sort((a, b) => a.accuracy - b.accuracy);

  const overallAccuracy = totalQuestionsAttempted > 0
    ? Math.round((totalCorrect / totalQuestionsAttempted) * 100)
    : 0;

  const unresolvedCount = Array.isArray(mistakes)
    ? mistakes.filter(m => m.status === 'unresolved').length
    : 0;

  // Determine smart, deterministic recommendation
  let recommendedRevision: RecommendedRevision | undefined;
  if (unresolvedCount > 0) {
    recommendedRevision = {
      type: 'mistake_vault',
      title: 'தவறு பெட்டகம் (Mistake Vault)',
      description: `${unresolvedCount} தவறிய வினாக்கள் சரிசெய்யப்படாமல் உள்ளன. முழுமையான தேர்ச்சி பெற இவற்றைப் பயிற்சி செய்யுங்கள்.`,
      availableQuestionCount: unresolvedCount,
    };
  } else if (weakChapters.length > 0) {
    const weakest = weakChapters[0];
    recommendedRevision = {
      type: 'weak_chapter',
      title: `${weakest.chapterName} — சிறப்புப் பயிற்சி`,
      description: `இந்த இயலில் உங்களின் துல்லியம் ${weakest.accuracy}%. மதிப்பெண்களை உயர்த்த உடனே திருப்புதல் செய்யவும்.`,
      targetChapterId: weakest.chapterId,
      availableQuestionCount: Math.max(10, weakest.totalQuestions - weakest.correctQuestions),
    };
  } else if (subjects.length > 0) {
    const firstSubject = subjects[0];
    recommendedRevision = {
      type: 'subject',
      title: `${firstSubject.subjectName} — பொதுத் தேர்வு`,
      description: `அனைத்து தலைப்புகளிலும் தேர்ச்சி தொடர முழுமையான மாதிரித் தேர்வு எழுதுங்கள்.`,
      targetSubjectId: firstSubject.subjectId,
      availableQuestionCount: 20,
    };
  }

  return {
    totalAttempts: uniqueAttempts.length,
    completedAttempts: completedAttempts.length,
    totalQuestionsAttempted,
    totalCorrect,
    overallAccuracy,
    unresolvedMistakesCount: unresolvedCount,
    subjects,
    weakChapters,
    recommendedRevision,
  };
}
