# System Flows

This document describes every flow in the LinkedIn Profile Optimizer system.

---

## 1. Onboarding Flow

```
┌─────────────────────────────────────────────────────────┐
│  USER INSTALLS EXTENSION                                │
│  → Clones repo from GitHub                              │
│  → Loads unpacked extension in Chrome developer mode     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  USER OPENS linkedin.com/in/own-profile                 │
│  → Content script activates (URL pattern match)         │
│  → Detects this is the user's own profile               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  PERSONA SELECTION SCREEN (sidebar)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  "Who are you?"                                   │  │
│  │                                                   │  │
│  │  [Job Seeker]        Actively looking for work    │  │
│  │  [Career Coach]      Helping others optimize      │  │
│  │  [Service Provider]  Freelancer/consultant        │  │
│  │  [General]           Maintaining presence         │  │
│  └───────────────────────────────────────────────────┘  │
│  → User selects persona → Saved to Supabase user record │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  AUTHENTICATION                                          │
│  → chrome.identity.launchWebAuthFlow()                  │
│  → Supabase OAuth (Google/GitHub/Microsoft)             │
│  → JWT + refresh token stored in chrome.storage.session │
│  → Background worker sets refresh alarm                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  FIRST PROFILE SCRAPE                                   │
│  → Content script parses profile DOM                    │
│  → Returns structured JSON (all sections)               │
│  → Sent to backend POST /profile/score                  │
│  → Backend returns completeness score + RAG tips        │
│  → Sidebar renders score (0-100) + section checklist    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Profile Scraping Flow

```
┌─────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT ACTIVATES                               │
│  Trigger: URL matches linkedin.com/in/{username}        │
│  Guard: Only activates on OWN profile (not others')     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  SELECTOR STRATEGY (selectors.ts)                       │
│  For each section, try in order:                        │
│  1. aria-label based selector (most stable)             │
│  2. Structural path (section > div > span hierarchy)    │
│  3. Data attributes (fallback, least stable)            │
│  → If all fail: mark section as "unscrapable"           │
│  → Log to selector health monitor                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  SECTION EXTRACTION                                     │
│  Extracts:                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  - headline       (text content)                 │   │
│  │  - about          (full text, line breaks kept)  │   │
│  │  - experience[]   (title, company, dates, desc)  │   │
│  │  - education[]    (school, degree, dates)        │   │
│  │  - skills[]       (name, endorsements)           │   │
│  │  - featured[]     (type, title, url, description)│   │
│  │  - certifications[] (name, org, date, url)       │   │
│  │  - recommendations[] (author, text)              │   │
│  │  - contact_info   (email, website, phone)        │   │
│  └──────────────────────────────────────────────────┘   │
│  → Returns structured JSON with section boundaries      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  JSON PAYLOAD                                            │
│  {                                                      │
│    "profile_url": "linkedin.com/in/username",           │
│    "scraped_at": "2025-01-15T10:30:00Z",               │
│    "sections": {                                        │
│      "headline": { "text": "...", "length": 120 },     │
│      "about": { "text": "...", "length": 800 },        │
│      "experience": [ { "title": "...", ... } ],        │
│      ...                                                │
│    }                                                    │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Scoring Flow

```
┌─────────────────────────────────────────────────────────┐
│  PROFILE JSON RECEIVED                                   │
│  Source: Content script (client-side) or API call        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  RULE-BASED SCORER (scorer.py + rules.yaml)             │
│  For each section, evaluate:                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  1. Completeness (fields filled vs expected)     │   │
│  │     - Headline present? Length >= 40 chars?       │   │
│  │     - About present? Length >= 200 chars?         │   │
│  │     - At least 2 experience entries?              │   │
│  │     - Skills >= 5?                               │   │
│  │                                                  │   │
│  │  2. Length compliance                             │   │
│  │     - Headline: 40-220 chars optimal              │   │
│  │     - About: 200-2600 chars optimal               │   │
│  │     - Experience descriptions: 100+ chars each    │   │
│  │                                                  │   │
│  │  3. Keyword density (if target_role provided)     │   │
│  │     - Contains role-relevant keywords?            │   │
│  │     - Natural keyword distribution?               │   │
│  │                                                  │   │
│  │  4. Formatting                                   │   │
│  │     - Experience uses bullet points?              │   │
│  │     - Consistent date format?                     │   │
│  │     - No typos detected?                          │   │
│  │                                                  │   │
│  │  5. Recency                                      │   │
│  │     - Experience dates current?                   │   │
│  │     - Activity in last 30 days?                   │   │
│  │     - Featured section populated?                 │   │
│  └──────────────────────────────────────────────────┘   │
│  → Each rule returns: pass/fail + weight + points       │
│  → Weighted sum → 0-100 score                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  RAG RETRIEVAL (optional, backend-only)                 │
│  For each section scoring below threshold:              │
│  → Embed section text                                   │
│  → pgvector similarity search in best_practice_rules    │
│  → Retrieve top-3 relevant tips per section             │
│  → Tips include: rule_text, examples, priority          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  RESPONSE                                                │
│  {                                                      │
│    "overall_score": 67,                                 │
│    "sections": {                                        │
│      "headline": {                                      │
│        "score": 45,                                     │
│        "status": "needs_work",                          │
│        "issues": ["Too short (28 chars, aim for 40+)"], │
│        "tips": ["Include your role + value proposition"]│
│      },                                                 │
│      "about": { "score": 72, ... },                     │
│      "experience": { "score": 80, ... },                │
│      ...                                                │
│    }                                                    │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Content Generation Flow — CV Mode

```
┌─────────────────────────────────────────────────────────┐
│  USER CLICKS "OPTIMIZE" ON A SECTION                    │
│  → Sidebar shows source selection:                      │
│    [From CV/Resume]  [Custom Text]                      │
│  → User selects "From CV/Resume"                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  FILE UPLOAD                                             │
│  → User uploads PDF or DOCX                             │
│  → File sent to backend POST /content/extract           │
│  → Content-Type: multipart/form-data                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  CV PARSING (parsers/pdf_parser.py or docx_parser.py)   │
│  PDF: pdfplumber extracts text with layout awareness    │
│  DOCX: python-docx extracts paragraphs + tables        │
│  → Raw text extracted                                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  STRUCTURED EXTRACTION (agents/extractor.py)            │
│  → Parse raw text into structured fields:               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  - contact_info: { name, email, phone, location }│   │
│  │  - experience: [{ title, company, dates, desc }] │   │
│  │  - education: [{ school, degree, dates }]        │   │
│  │  - skills: [{ name, proficiency }]               │   │
│  │  - certifications: [{ name, org, date, url }]    │   │
│  │  - achievements: [{ text, impact }]              │   │
│  └──────────────────────────────────────────────────┘   │
│  → Confidence score per field (0-1)                     │
│  → Fields below 0.7 confidence flagged for user review  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  CONTENT MATCHING                                        │
│  → Match extracted CV fields to target LinkedIn section  │
│  → Example: Target = "experience"                       │
│    → Pull relevant experience entries from CV           │
│    → Pull relevant achievements for each role           │
│    → Include metrics/numbers where available            │
│  → Creates content_to_place object                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LANGGRAPH PIPELINE (agents/pipeline.py)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │  State Machine:                                 │   │
│  │                                                  │   │
│  │  [parse_input] → [retrieve_rules] → [rewrite]   │   │
│  │       ↓                            ↓             │   │
│  │  validate input              pgvector search     │   │
│  │  extract fields              get top-3 rules     │   │
│  │                              per section          │   │
│  │                                    ↓             │   │
│  │                            [generate_draft]      │   │
│  │                                    ↓             │   │
│  │                            Groq Llama 3.1/3.3    │   │
│  │                            rewrite with rules    │   │
│  │                                    ↓             │   │
│  │                            [score_draft]         │   │
│  │                                    ↓             │   │
│  │                            evaluate quality      │   │
│  │                            compute match score   │   │
│  │                                    ↓             │   │
│  │                            [return_draft]        │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  RESPONSE                                                │
│  {                                                      │
│    "draft": "Senior Software Engineer at ...",          │
│    "match_score": 87,                                   │
│    "section": "experience",                             │
│    "source": "cv",                                      │
│    "applied_rules": ["Use action verbs", ...],          │
│    "confidence": 0.92                                   │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Content Generation Flow — Custom Text Mode

```
┌─────────────────────────────────────────────────────────┐
│  USER CLICKS "OPTIMIZE" ON A SECTION                    │
│  → User selects "Custom Text"                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  TEXT INPUT                                              │
│  → Free-text textarea in sidebar                        │
│  → User types/pastes exactly what they want said        │
│  → Optional: target_role, keywords fields               │
│  → Sent to backend POST /content/generate               │
│  {                                                      │
│    "source": "custom",                                  │
│    "section": "headline",                               │
│    "custom_text": "Looking for senior PM roles...",     │
│    "target_role": "Product Manager",                    │
│    "keywords": ["product strategy", "agile"]            │
│  }                                                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LANGGRAPH PIPELINE (polish mode)                       │
│  Same pipeline as CV mode, but:                         │
│  → Skip extraction step (text already clean)            │
│  → Focus on:                                            │
│    1. Professional tone polish                          │
│    2. Keyword optimization                              │
│    3. Length compliance                                 │
│    4. Formatting (bullets, structure)                   │
│    5. LinkedIn best practices                           │
│  → Generate draft that preserves user's intent          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  RESPONSE                                                │
│  {                                                      │
│    "draft": "Product Manager | Product Strategy...",    │
│    "match_score": 91,                                   │
│    "section": "headline",                               │
│    "source": "custom",                                  │
│    "applied_rules": ["Include keywords", ...],          │
│    "changes_made": ["Added keywords", "Shortened"]      │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Approval Flow

```
┌─────────────────────────────────────────────────────────┐
│  DRAFT DISPLAYED IN SIDEBAR                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Section: Experience - Senior Engineer at Acme   │   │
│  │  Match Score: 87/100                             │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  [EDITABLE TEXTAREA WITH DRAFT]            │  │   │
│  │  │                                            │  │   │
│  │  │  Led a team of 8 engineers to build...    │  │   │
│  │  │  • Increased performance by 40%           │  │   │
│  │  │  • Reduced costs by $200K annually        │  │   │
│  │  │  • Shipped 3 major features on time       │  │   │
│  │  │                                            │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  [Regenerate]  [Discard]  [Approve]              │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ REGENERATE│ │  EDIT    │ │ APPROVE  │
    │          │ │          │ │          │
    │ Returns  │ │ User     │ │ Continue │
    │ new draft│ │ modifies │ │ to       │
    │ + score  │ │ textarea │ │ delivery │
    └──────────┘ └──────────┘ └────┬─────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────┐
│  AUDIT LOG                                               │
│  → POST /updates/approve                                │
│  → {                                                     │
│      "user_id": "uuid",                                 │
│      "section": "experience",                           │
│      "old_value": "Original text...",                   │
│      "new_value": "Optimized text...",                  │
│      "source": "cv",                                    │
│      "approved_at": "2025-01-15T10:45:00Z"             │
│    }                                                     │
│  → Saved to profile_updates table                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  UPDATE DELIVERY DECISION                               │
│  → Is section a certification?                          │
│    YES → Try Path 2 (deep-link)                         │
│    NO  → Try Path 1 (DOM sync)                          │
│  → If Path 1 fails → Fall back to Path 3 (manual copy) │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Update Delivery — Path 1: Extension DOM Sync

```
┌─────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT LOCATES EDIT FORM                       │
│  → Finds section's edit button via aria-label           │
│  → Clicks edit button to open LinkedIn's edit form      │
│  → Waits for form to render (MutationObserver)          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  FILL FORM FIELDS (filler.ts)                           │
│  → For each field in the approved draft:                │
│    1. Locate input/textarea via selector                │
│    2. Clear existing value                              │
│    3. Set new value via input event dispatch             │
│    4. Verify value was set (read-back check)            │
│  → Handles: text inputs, textareas, rich text editors   │
│  → Dispatches 'input' and 'change' events               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  USER SEES PRE-FILLED FORM                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  LinkedIn's native edit dialog                   │   │
│  │  Fields are pre-filled with optimized content    │   │
│  │  User reviews the changes                        │   │
│  │                                                  │   │
│  │  [Cancel]                        [Save]          │   │
│  └──────────────────────────────────────────────────┘   │
│  → User clicks LinkedIn's "Save" button                │
│  → Extension does NOT auto-submit                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  SUCCESS PATH                                           │
│  → Detect save confirmation (DOM change or URL change)  │
│  → Update audit log: status = "synced"                  │
│  → Show success toast in sidebar                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  FAILURE PATH                                           │
│  → Selector not found OR value not set                  │
│  → Log failure reason + selector used                   │
│  → Fall back to Path 3 (manual copy)                    │
│  → Show user: "Auto-sync failed, here's your draft     │
│    to copy manually"                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Update Delivery — Path 2: Certification Deep-Link

```
┌─────────────────────────────────────────────────────────┐
│  BUILD LINKEDIN-SANCTIONED URL                           │
│  → GET /certifications/deep-link                        │
│  → Query params from approved certification data:       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  https://www.linkedin.com/profile/add            │   │
│  │    ?startTask=CERTIFICATION_NAME                  │   │
│  │    &name=AWS+Solutions+Architect                 │   │
│  │    &organizationName=Amazon                      │   │
│  │    &issueYear=2024                               │   │
│  │    &issueMonth=6                                 │   │
│  │    &certUrl=https://...                          │   │
│  │    &certId=ABC123                                │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  OPEN IN NEW TAB                                        │
│  → chrome.tabs.create({ url: deepLink })                │
│  → LinkedIn's native "Add Certification" dialog opens   │
│  → All fields pre-filled by LinkedIn                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  USER CLICKS "SAVE"                                     │
│  → LinkedIn handles the save natively                   │
│  → Zero automation risk                                 │
│  → Extension detects tab close or URL change            │
│  → Update audit log: status = "deep_linked"             │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Update Delivery — Path 3: Manual Copy (Fallback)

```
┌─────────────────────────────────────────────────────────┐
│  DRAFT RENDERED IN COPY-FRIENDLY VIEW                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Your optimized content is ready:                │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Led a team of 8 engineers to build...    │  │   │
│  │  │  • Increased performance by 40%           │  │   │
│  │  │  • Reduced costs by $200K annually        │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  [Copy to Clipboard]                             │   │
│  │                                                  │   │
│  │  Instructions:                                   │   │
│  │  1. Click "Copy to Clipboard"                    │   │
│  │  2. Go to LinkedIn → Edit your profile           │   │
│  │  3. Paste into the appropriate section           │   │
│  │  4. Click Save on LinkedIn                       │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  USER CLICKS "Copy to Clipboard"                        │
│  → navigator.clipboard.writeText(draft)                 │
│  → Toast: "Copied! Paste into LinkedIn."                │
│  → User manually pastes and saves on LinkedIn           │
│  → Update audit log: status = "manual_copy"             │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Auth Flow

```
┌─────────────────────────────────────────────────────────┐
│  EXTENSION INITIALIZATION                               │
│  → Check chrome.storage.session for existing JWT        │
│  → If JWT exists and not expired:                       │
│    → Use it for API calls                               │
│  → If JWT missing or expired:                           │
│    → Proceed to authentication                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  AUTHENTICATION                                          │
│  → chrome.identity.launchWebAuthFlow({                  │
│      url:SUPABASE_AUTH_URL,                             │
│      interactive: true                                  │
│    })                                                   │
│  → User sees Supabase OAuth screen                      │
│  → Selects Google/GitHub/Microsoft                      │
│  → OAuth callback returns to extension                   │
│  → Exchange code for JWT + refresh token                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  TOKEN STORAGE                                           │
│  → Save to chrome.storage.session:                      │
│    {                                                    │
│      "access_token": "eyJ...",                          │
│      "refresh_token": "abc...",                         │
│      "expires_at": 1705312200                           │
│    }                                                    │
│  → Set alarm for 5 minutes before expiry                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  TOKEN REFRESH (background service worker)              │
│  → On alarm fire:                                       │
│    1. Read refresh_token from storage                   │
│    2. POST to Supabase /auth/v1/token?grant_type=...   │
│    3. Save new access_token + refresh_token             │
│    4. Set next alarm                                    │
│  → If refresh fails:                                    │
│    → Clear tokens                                      │
│    → Prompt re-authentication on next API call          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  API CALLS                                               │
│  → All backend requests include:                        │
│    Authorization: Bearer <access_token>                 │
│  → Backend verifies JWT via Supabase JWKS endpoint      │
│  → On 401 response:                                     │
│    → Try token refresh                                  │
│    → If refresh fails: re-authenticate                  │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Dashboard Flow

```
┌─────────────────────────────────────────────────────────┐
│  USER OPENS DASHBOARD (Vercel URL)                      │
│  → Next.js app loads                                    │
│  → Checks for Supabase session (shared auth)            │
│  → If not authenticated: login page                     │
│  → If authenticated: load dashboard                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  DASHBOARD HOME                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Profile Score: 72/100  [Last scanned: 2h ago]  │   │
│  │                                                  │   │
│  │  Section Breakdown:                              │   │
│  │  ████████░░ Headline: 65                        │   │
│  │  █████████░ About: 78                           │   │
│  │  ██████████ Experience: 85                      │   │
│  │  ███████░░░ Skills: 60                          │   │
│  │                                                  │   │
│  │  Recent Updates:                                 │   │
│  │  • Headline optimized (2h ago)                   │   │
│  │  • Experience updated (1 day ago)                │   │
│  │  • Certification added (3 days ago)              │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ HISTORY  │ │ SETTINGS │ │ BILLING  │
    │          │ │          │ │ (future) │
    │ All      │ │ Persona  │ │          │
    │ profile  │ │ Account  │ │ Free/    │
    │ updates  │ │ API usage│ │ Premium  │
    │ with     │ │          │ │ tiers    │
    │ undo     │ │          │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

---

## 12. Selector Health Monitoring Flow

```
┌─────────────────────────────────────────────────────────┐
│  MONITOR (monitor.ts) — runs on each scrape             │
│  For each section:                                      │
│  → Try each selector strategy                           │
│  → Log success/failure + strategy used                  │
│  → If fallback strategy used:                           │
│    → Flag as "primary selector broken"                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  HEALTH REPORT                                           │
│  → Aggregated weekly (or on demand):                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Selector Health:                                │   │
│  │  ✓ headline: primary (aria-label) — 100%        │   │
│  │  ✓ about: primary (aria-label) — 100%           │   │
│  │  ⚠ experience: fallback (structural) — 85%      │   │
│  │  ✗ skills: data-attr only — 60% (NEEDS UPDATE)  │   │
│  └──────────────────────────────────────────────────┘   │
│  → Alerts when any section drops below 80%              │
│  → Stored for debugging LinkedIn DOM changes            │
└─────────────────────────────────────────────────────────┘
```
