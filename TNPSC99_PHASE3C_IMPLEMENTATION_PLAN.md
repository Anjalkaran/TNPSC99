# TNPSC99 — Phase 3C: Student Learning Progress, Deterministic Mistake Vault & Dashboard Mastery Implementation Plan

**Date:** October 22, 2026  
**Target Git Branch:** `phase-3c-learning-progress-mistake-vault`  
**Base Commit:** `19bf6ed` (Phase 3B Approved Baseline)  
**Engineering Philosophy:** 100% Deterministic Local Mathematics | Zero Paid AI / LLM Calls | Zero Cloud Billing Overhead  

---

## 1. Executive Summary & Core Objectives

Phase 3C elevates TNPSC99 from a test delivery engine into an adaptive, personalized learning platform for Tamil Nadu Civil Service aspirants. By analyzing historical test attempts, question-level response logs, and chapter-level mastery metrics, TNPSC99 will provide students with clear learning direction, targeted mistake rectification, and customized revision tests.

### Non-Negotiable Boundaries
- **Zero Paid AI Inference:** All weak-area identification, topic proficiencies, and revision recommendations must use deterministic statistical formulas executed locally on the client or in lightweight backend functions without OpenAI/Gemini/Anthropic API costs.
- **₹99/Month Value Amplification:** Position the Mistake Vault and Chapter Mastery as core value pillars of the ₹99/month MCQ Academy.
- **Phase 2 & 3B Non-Regression:** Preserve server-side payment signatures, subscription tier gating, and dual-mode testing engine behavior.

---

## 2. Architectural Blueprint & Core Modules

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TNPSC99 PHASE 3C PLATFORM                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
[MODULE 1: MASTERY PROGRESS]  [MODULE 2: MISTAKE VAULT]    [MODULE 3: REVISION ENGINE]
- Subject/Chapter %           - "தவறு பெட்டகம்"           - Dynamic test generator
- Syllabus completion graph   - Aggregated wrong answers   - Pulls from vault & weak areas
- Target score milestones     - Textbook citations         - Feeds into Phase 3B engine
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    ▼
                     [MODULE 4: STUDENT DASHBOARD]
                     - At-a-glance mastery ring
                     - Active streak & time spent
                     - Urgent weak-area callout
                     - Quick-start revision launcher
```

---

## 3. Module Details & Specifications

### 3.1 Module 1: Deterministic Progress & Mastery Graph
- **Objective:** Track coverage of Tamil, General Studies, and Aptitude curriculum.
- **Proficiency Formula:**
  $$\text{Proficiency} = \left( 0.7 \times \frac{\text{Correct Answers}}{\text{Total Attempted}} + 0.3 \times \min\left(1, \frac{\text{Attempts}}{3}\right) \right) \times 100$$
  - Rewarding high accuracy while incorporating repetition stability (dampening single-attempt flukes).
- **Categorization:**
  - **Mastered (தேர்ச்சி):** $\ge 80\%$ proficiency
  - **In Progress (பயிற்சியில்):** $50\% - 79\%$ proficiency
  - **Needs Focus (கவனம் தேவை):** $< 50\%$ proficiency or high error rate

### 3.2 Module 2: Mistake Vault ("தவறு பெட்டகம்")
- **Concept:** Every question answered incorrectly across any test (Practice or Exam) is automatically indexed in the candidate's personal Mistake Vault.
- **Capabilities:**
  - Filter by Subject (Tamil, History, Polity, Geography, Aptitude), Class (6th–12th), or Unit.
  - Review Card showing Question, Student's Chosen Option, Correct Answer, Full Rationale, and **Inline Textbook Reference Button** opening the Phase 3B PDF drawer at the exact page citation.
  - **Resolution Mechanism:** When a student successfully answers a mistake question correctly during a revision session, it is transitioned from `unresolved` to `resolved` status.

### 3.3 Module 3: Dynamic Revision Test Generator
- **Concept:** One-click generation of personalized practice tests targeting specific problem areas.
- **Generation Modes:**
  1. **Mistake Vault Drill:** Pulls 10, 20, or 30 unresolved questions directly from `mistakeVault`.
  2. **Weak Chapter Intensive:** Selects questions from chapters where candidate proficiency is $<60\%$.
  3. **Comprehensive Subject Brushup:** Balanced mix of 70% unattempted questions and 30% previously failed questions.
- **Engine Hand-off:** Formats the dynamically generated test and launches it directly in the Phase 3B `McqTest` engine (supporting both Practice Mode for instant review and Exam Mode for timed pressure).

### 3.4 Module 4: Enhanced Student Dashboard
- **Component:** `src/app/(app)/dashboard/page.tsx`
- **New Sections:**
  1. **Hero Performance Ring:** Circular progress indicator displaying Overall TNPSC Readiness % and weekly test count.
  2. **"Mistake Vault" Action Card:** Displays count of pending mistakes (e.g., *"14 கேள்விகள் மறுஆய்வு தேவை"*) with a 1-click "Practice Mistakes" CTA.
  3. **Priority Focus Recommendation:** Highlights the single lowest-scoring chapter with a direct "Start Practice" button.
  4. **Recent Activity & Exam History:** Enhanced table displaying test mode, score badge, percentage, time spent, and a "Review" button opening the post-exam review suite.

---

## 4. Data Models & Firestore Schema Extensions

### 4.1 Subcollection: `users/{userId}/mistakeVault/{questionId}`
```typescript
interface MistakeVaultItem {
  questionId: string;
  testId: string;
  testTitle: string;
  subjectId?: string;
  classId?: string;
  chapterName?: string;
  lastFailedDate: string;
  failureCount: number;
  selectedOptionIndex: number;
  status: 'unresolved' | 'resolved';
  resolvedAt?: string;
}
```

### 4.2 Aggregated Metric Schema in `users/{userId}/mastery/summary`
```typescript
interface StudentMasterySummary {
  overallProficiency: number;
  totalTestsCompleted: number;
  totalQuestionsAttempted: number;
  totalCorrect: number;
  totalMistakesUnresolved: number;
  subjectMastery: Record<string, {
    proficiency: number;
    attemptedCount: number;
    correctCount: number;
  }>;
  weakChapterIds: string[];
  lastCalculatedAt: string;
}
```

---

## 5. File Architecture & Component Hierarchy

```
src/
├── app/(app)/
│   ├── dashboard/
│   │   ├── page.tsx                           # Redesigned dashboard with mastery widgets
│   │   └── components/
│   │       ├── mastery-hero-ring.tsx          # Circular proficiency gauge
│   │       ├── mistake-vault-preview.tsx      # Quick launcher for mistake drills
│   │       └── weak-topic-card.tsx            # Targeted next-action card
│   ├── mistake-vault/
│   │   └── page.tsx                           # Dedicated Mistake Vault filterable manager
│   └── revision/
│       └── [config]/page.tsx                  # Dynamic revision test launcher
├── components/
│   └── revision/
│       ├── revision-config-modal.tsx          # Modal to select question count and source
│       └── mistake-card.tsx                   # Individual question card with textbook drawer
└── lib/
    ├── deterministic-analytics.ts             # Extended with chapter & vault algorithms
    └── mistake-vault-service.ts               # Local state & Firestore syncing routines
```

---

## 6. Implementation Roadmap & Testing Plan

| Milestone | Target Deliverable | Verification Criteria |
|---|---|---|
| **Step 1: Data Service** | `src/lib/mistake-vault-service.ts` | 100% deterministic indexing of wrong answers on test submission without duplicate writes. |
| **Step 2: Mistake Vault Page** | `src/app/(app)/mistake-vault/page.tsx` | Filterable by subject/class; inline textbook drawer opens exact page; mark as resolved. |
| **Step 3: Revision Generator** | `src/components/revision/` | Generates 10-30 question tests; seamlessly renders in Phase 3B `McqTest`. |
| **Step 4: Dashboard Redesign** | `src/app/(app)/dashboard/page.tsx` | Responsive layout at 390px, 768px, 1280px; zero horizontal scroll; no AI latency. |
| **Step 5: Testing & Acceptance** | Integration & unit test suites | Next.js build passes; 100% test pass rate across new and Phase 2/3B suites. |

---

## 7. Rollback & Isolation Strategy

1. **Branch Isolation:** Development will take place on `phase-3c-learning-progress-mistake-vault`.
2. **Backward Compatibility:** All new Firestore collections and fields are additive. Legacy attempt logs and score documents will not be modified or deleted.
3. **Instant Rollback:**
   ```bash
   git checkout phase-3b-testing-engine-dual-modes
   ```
