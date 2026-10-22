# TNPSC99 – Phase 3A: Homepage and Design System Implementation Report

**Document Reference:** `TNPSC99-PHASE3A-REPORT-v1.0`  
**Execution Timestamp:** 2026-10-22  
**Target Environment:** Local Workspace / Git Branch `phase-3a-homepage-design-system`  
**Status:** **IMPLEMENTED & VERIFIED** (Clean Build 51/51 routes, 14/14 Security Tests Passing)

---

## 1. Executive Summary & Objective

In accordance with the approved TNPSC99 roadmap, Phase 3A focused on unifying the design system and delivering a high-converting, mobile-first public homepage. The key directive was establishing **MCQ Academy – ₹99/month** as the unambiguous primary offer, highlighting authentic school textbook MCQs (Classes 6–10 Samacheer Kalvi), showcasing Practice vs. Exam modes, and enabling friction-free public access to pricing details without forced login redirects.

All changes were implemented in a dedicated Git branch branched off the Phase 2 security baseline (`phase-2-core-security-hardening`). No security controls were regressed, no Firestore production records were altered, and all strict AI Tutor constraints (no price on homepage, labeled "Coming Soon", zero inference tokens consumed) were enforced.

---

## 2. Preflight & Branch Isolation

| Check | Requirement | Result |
|---|---|---|
| **Base Commit** | Phase 2 Core Security Hardening HEAD (`e8773a8`) | **CONFIRMED** |
| **New Branch** | `phase-3a-homepage-design-system` | **CREATED & ACTIVE** |
| **Security Controls** | Token verification, server-side idempotency, Firestore rules | **PRESERVED 100%** |
| **Production State** | Zero writes to Firestore, zero live payment charges | **COMPLIED** |

---

## 3. Unified Design System Specification

The design tokens have been consolidated across `tailwind.config.ts`, `src/app/globals.css`, and core UI primitives:

### 3.1 Color Palette

| Token | Hex Value | HSL Representation | Semantic Application |
|---|---|---|---|
| **Primary** | `#1e3a8a` | `224 64% 33%` | Main brand color, hero headings, primary CTA buttons |
| **Secondary** | `#2563eb` | `221 83% 53%` | Accent interactive elements, mode highlights, gradients |
| **Success** | `#059669` | `161 94% 30%` | Answer verification, checklist checkmarks, active status |
| **Accent** | `#f59e0b` | `38 92% 50%` | Offer callouts, badges, AI tutor notification chip |
| **Background** | `#f8fafc` | `210 40% 98%` | Global platform background (clean slate canvas) |
| **Card / Surface** | `#ffffff` | `0 0% 100%` | Elevated cards, test series tiles, modal sheets |
| **Border** | `#e2e8f0` | `214 32% 91%` | Subtle structural dividers and component borders |

### 3.2 Standardized Radii
- **Button Radius:** Standardized to **12px** (`rounded-xl` / `0.75rem`) across all button variants and sizes in `src/components/ui/button.tsx`.
- **Card Radius:** Standardized to **16px** (`rounded-2xl` / `1.0rem`) across all container cards in `src/components/ui/card.tsx`.

### 3.3 Typography & Font Stacks
- **English / Latin:** `Inter` loaded via `next/font/google` with `display: swap`.
- **Tamil:** `Noto Sans Tamil` loaded via `next/font/google` (weights: 400, 500, 600, 700) with `display: swap`.
- Configured in `tailwind.config.ts` under `fontFamily.sans`, `fontFamily.tamil`, and `fontFamily.body` to ensure native rendering of Tamil glyphs alongside English text.

---

## 4. Homepage Redesign Architecture (`src/app/page.tsx`)

The new homepage replaces generic placeholders with an intentional, high-conversion information architecture:

1. **Hero Section:**
   - **Announcement Pill:** `TNPSC MCQ Academy — Flat ₹99/Month · Samacheer Kalvi Aligned`
   - **Primary Headline:** "Master TNPSC Exams with School Textbook MCQs"
   - **Subhead:** Clear emphasis on 6th to 10th standard school books, Group I, II, and IV prep, instant explanations, and printed page references.
   - **Dual CTAs:** "Join MCQ Academy (₹99/mo)" (direct conversion) and "Start Free Demo Practice".
   - **Trust Metrics Bar:** 4 quick-glance chips highlighting Textbook focus, Dual modes, Page citations, and Bilingual support.

2. **MCQ Academy Showcase Card (The ₹99 Anchor):**
   - Elevated spotlight card featuring **₹99/month** prominently.
   - Transparent value messaging comparing against ₹5,000–₹15,000 coaching academy costs.
   - Complete itemized breakdown of subscription entitlements: unlimited textbook tests, dual modes, Samacheer Kalvi page numbers, Group 1/2/4 coverage, bookmarks, and 100% ad-free environment.

3. **Dual Testing Modes Showcase:**
   - **Practice Mode (பயிற்சி முறை):** Instant answer reveal, conceptual explanations, printed textbook citations, bookmarking.
   - **Exam Mode (தேர்வு முறை):** Live countdown timer, question palette navigation, score cards, and post-test review.

4. **Curriculum Coverage (Samacheer Kalvi Classes 6–10):**
   - Replaced unverified "1,00,000+ MCQs" with authentic curriculum streams:
     - பொதுத்தமிழ் (General Tamil): இலக்கணம், இலக்கியம், தமிழ் அறிஞர்கள்
     - பொது அறிவியல் (General Science): Physics, Chemistry, Biology & Ecology
     - சமூக அறிவியல் & வரலாறு (Social Science): Tamil Nadu History, Geography, Resources
     - ஆட்சியியல் & பொருளாதாரம் (Polity & Economy): Constitution of India, State Governance, Economy

5. **Targeted Exam Tracks:**
   - Specific paths for **TNPSC Group I**, **Group II & IIA**, and **Group IV & VAO**.

6. **AI Tutor Add-on Section (Strictly Guarded):**
   - Styled with subtle dashed amber border.
   - Clearly badged: **"Coming Soon — Optional Add-on"**.
   - Explicitly explains that AI features are powered by **separate prepaid credits**, with **zero required fees for standard ₹99 MCQ practice**.
   - No pricing shown on homepage; zero AI model inference calls executed.

7. **How It Works (3 Steps):**
   - Step 1: Pick School Standard & Subject (Classes 6–10)
   - Step 2: Choose Practice Mode or Exam Mode
   - Step 3: Review References, Bookmark Tricky Questions & Improve

8. **High-Conversion Footer CTA:**
   - Bold Navy background (`#1e3a8a`) prompting final conversion to MCQ Academy.

---

## 5. Public Pricing Route Access (`/subscription`)

### The Problem in Legacy Implementation:
In legacy code, `src/app/(app)/layout.tsx` executed an unconditional `if (!user) router.push('/login');` before evaluating whether the route was a public informational or pricing page. Unauthenticated visitors clicking "Pricing" or visiting `/subscription` were bounced to `/login`.

### The Resolution:
1. **Public Path Whitelist:**
   - Defined `PUBLIC_PATHS = ['/subscription', '/contact', '/about-us', '/terms-and-conditions', '/privacy-policy', '/refund-policy']`.
2. **Dual-Layout Strategy:**
   - If `!user` and `isAllowedPath`: Renders clean public navigation (`SiteHeader` + Page Content + `SiteFooter`) with public Login/Register buttons.
   - If `!user` and route is protected (e.g., `/dashboard`, `/profile`, `/test/*`): Immediately redirects to `/login`.
   - If `user` is authenticated: Renders the complete student/admin sidebar experience (`SidebarProvider` + `AppSidebar`).
3. **Friction-Free Checkout Guard:**
   - In `src/app/(app)/subscription/page.tsx`, if an unauthenticated visitor clicks "Subscribe Now — ₹99/month", they are notified and routed to `/login?redirect=/subscription` so they can complete checkout seamlessly upon sign-in.

---

## 6. Responsive Verification Across Viewports

Verification was executed against the running dev server using Google Chrome CDP:

| Breakpoint | Viewport (WxH) | Inner Width | Scroll Width | Horizontal Overflow | Visual Status |
|---|---|---|---|---|---|
| **Mobile** | 390px × 844px | 390px | 390px | **NONE (0px)** | Flawless single-column layout, touch-friendly CTA buttons |
| **Tablet** | 768px × 1024px | 768px | 768px | **NONE (0px)** | Balanced 2-column grids, optimized card spacing |
| **Desktop** | 1280px × 800px | 1280px | 1280px | **NONE (0px)** | Full multi-column grid, elevated showcase card |

### Captured Artifacts:
- `phase3a_homepage_desktop.png` (185 KB, 1280x800)
- `phase3a_homepage_desktop_full.png` (827 KB, 1280x800 Full Page)
- `phase3a_homepage_tablet.png` (188 KB, 768x1024)
- `phase3a_homepage_mobile.png` (109 KB, 390x844)
- `phase3a_homepage_mobile_full.png` (676 KB, 390x844 Full Page)
- `phase3a_pricing_desktop.png` (442 KB, 1280x800)
- `phase3a_pricing_mobile.png` (152 KB, 390x844)

---

## 7. Before vs. After Comparison Matrix

| Feature | Before (Phase 2 Baseline) | After (Phase 3A Implementation) |
|---|---|---|
| **Primary Offer** | Generic "Master the TNPSC Exam", ₹99 offer completely absent from homepage | **MCQ Academy – ₹99/month** anchored in hero pill, dedicated showcase card, and navigation |
| **Question Bank Stats** | Fictitious "1,00,000+ Questions", "5,000+ Mock Tests" | **Removed.** Replaced with authentic Samacheer Kalvi Classes 6–10 syllabus coverage streams |
| **Dual Testing Modes** | Generic text mentioning tests | Dedicated comparative showcase of **Practice Mode** (instant answers & page citations) vs. **Exam Mode** (timed exam hall simulation) |
| **Textbook References** | Undocumented on homepage | Prominently featured as a primary differentiator (printed page references for all answers) |
| **AI Tutor Positioning** | Unclear distinction between subscription and AI | Clear teaser labeled **"Coming Soon — Optional Add-on"**, explicit note on separate prepaid credits, no pricing |
| **Pricing Page Access** | Bounced anonymous visitors straight to `/login` | Publicly accessible at `/subscription` with public header and "MCQ Academy (₹99)" nav link |
| **Design Consistency** | Mismatched button radii (6px, 8px, 12px), unbranded colors | Standardized: Primary `#1e3a8a`, Secondary `#2563eb`, Success `#059669`, Accent `#f59e0b`, 12px button radius, 16px card radius |
| **Typography** | Default Inter only | **Inter** + **Noto Sans Tamil** configured in Next.js font loader and Tailwind theme |

---

## 8. Build & Regression Test Results

### 8.1 Production Build
- Command: `npm run build`
- Result: **0 errors, Exit code 0**
- Routes generated: **51 / 51 static and dynamic routes compiled**
- Output size: Homepage client JS bundled at 8.28 kB (First load JS: 287 kB).

### 8.2 Security Regression Suite
- Command: `npx tsx scripts/test-phase2-security.ts`
- Result: **14 / 14 tests passing (0 failures)**
  - Subscription Gating & Tier Checks: 5/5 PASS
  - Razorpay Payment & Webhook Cryptographic Signatures: 5/5 PASS
  - Deterministic Analytics (Zero-LLM): 2/2 PASS
  - Textbook Reference Protected Access: 2/2 PASS

---

## 9. Modified Files Register

| File Path | Nature of Changes |
|---|---|
| `tailwind.config.ts` | Configured Inter & Noto Sans Tamil fonts, `--success` color tokens, standardized `btn` (12px) and `card` (16px) radii |
| `src/app/globals.css` | Updated CSS variables with exact HSL design tokens for light and dark modes (`#1e3a8a`, `#2563eb`, `#059669`, `#f59e0b`, `#f8fafc`) |
| `src/app/layout.tsx` | Added Google font imports for `Noto_Sans_Tamil` alongside `Inter`, applied font variables to `body` |
| `src/app/page.tsx` | Complete overhaul: ₹99 MCQ Academy hero, textbook alignment, dual testing modes, authentic syllabus, AI Tutor teaser |
| `src/app/(app)/layout.tsx` | Enabled public access for anonymous visitors to `/subscription`, `/about-us`, `/contact` with public `SiteHeader`/`SiteFooter` |
| `src/app/(app)/subscription/page.tsx` | Added public sign-in redirect on subscribe click; updated hero badge and messaging for unauthenticated visitors |
| `src/components/site-header.tsx` | Added prominent "MCQ Academy (₹99)" link to desktop header and mobile navigation sheet |
| `src/components/ui/button.tsx` | Standardized default button radius to 12px (`rounded-xl`) |
| `src/components/ui/card.tsx` | Standardized card radius to 16px (`rounded-2xl`) |
| `src/lib/subscription-utils.ts` | Exported `UserProfile` type for script test suite compatibility |
| `capture_page.js` | Added `--full` flag support for capturing full-length responsive web pages |

---

## 10. Verification Confirmation

Phase 3A is fully implemented, verified across desktop, tablet, and mobile viewports, cleanly compiled, and ready for commit on `phase-3a-homepage-design-system`.
