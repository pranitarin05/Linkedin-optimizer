# Technical Decisions

This document records every major technical decision, including the chosen option, rejected alternatives, and the reasoning behind each choice.

---

## Table of Contents

1. [Backend Hosting](#1-backend-hosting)
2. [Backend Framework](#2-backend-framework)
3. [Extension Bundler](#3-extension-bundler)
4. [Sidebar UI Framework](#4-sidebar-ui-framework)
5. [DOM Selector Strategy](#5-dom-selector-strategy)
6. [Scoring Engine](#6-scoring-engine)
7. [Rules Format](#7-rules-format)
8. [RAG System](#8-rag-system)
9. [LLM Provider](#9-llm-provider)
10. [CV Parsing](#10-cv-parsing)
11. [Dashboard Framework](#11-dashboard-framework)
12. [Database](#12-database)
13. [Authentication](#13-authentication)
14. [Extension Distribution](#14-extension-distribution)
15. [Agent Orchestration](#15-agent-orchestration)
16. [Client-Side Scoring](#16-client-side-scoring)
17. [Styling Isolation](#17-styling-isolation)
18. [File Storage](#18-file-storage)
19. [Update Delivery Strategy](#19-update-delivery-strategy)
20. [Playwright Automation](#20-playwright-automation)

---

## 1. Backend Hosting

**Decision: Google Cloud Run**

| Factor | Cloud Run | Render Free | Railway | Fly.io | Self-hosted VPS |
|--------|-----------|-------------|---------|--------|-----------------|
| Cold start | ~1-2s | ~30s | ~0s (always on) | ~5s | ~0s |
| Free tier | 2M req/mo | 750 hrs/mo (spins down) | $5 credit | 3 VMs | Hardware cost |
| Scale-to-zero | Native behavior | Workaround (bad UX) | No | Optional | No |
| Container support | Docker (native) | Docker | Docker | Docker | Manual |
| Pricing | Per request + CPU time | Per instance uptime | Credit-based | Per VM | Fixed monthly |
| Complexity | Low | Low | Low | Medium | High |

**Why Cloud Run wins:**
- Scale-to-zero is the **intended behavior**, not a workaround. When no one uses the API, you pay $0 and the service doesn't consume resources.
- Cold starts of ~1-2 seconds are barely noticeable for an API call. Render's ~30s cold start would make the extension feel broken.
- 2M requests/month free is generous for an MVP. Even with moderate usage, you won't hit this limit.
- No need to manage "always-on" instances or worry about spin-down behavior.

**Why not Render:** Free tier spins down after inactivity, causing 30s cold starts. Users would think the extension is broken.

**Why not Railway:** $5/month credit is fine, but scale-to-zero isn't native — you'd be paying for an always-on instance even when idle.

**Why not Fly.io:** More complex setup (Dockerfile + fly.toml), slightly higher cold starts. Good alternative if Cloud Run doesn't work out.

**Why not self-hosted VPS:** Oracle Cloud free tier is powerful but requires DevOps knowledge (server maintenance, security patches, SSL certs). Too much overhead for an MVP.

---

## 2. Backend Framework

**Decision: FastAPI (Python 3.11)**

| Factor | FastAPI | Flask | Django | Express.js |
|--------|---------|-------|--------|------------|
| Async support | Native | Partial (Flask 2.0+) | Yes (Django 3.1+) | Native |
| Auto API docs | OpenAPI/Swagger built-in | Requires extension | DRF requires setup | Requires Swagger |
| Validation | Pydantic (automatic) | Manual | DRF serializers | Manual/Joi |
| Performance | High (async) | Medium (sync) | Medium | High |
| Python ecosystem | Yes | Yes | Yes | No (Node.js) |
| Learning curve | Low-Medium | Low | Medium-High | Low |

**Why FastAPI wins:**
- **Pydantic validation** — request/response models are enforced automatically. No more "forgot to validate this field" bugs.
- **Auto-generated OpenAPI docs** — `/docs` gives you Swagger UI out of the box. Frontend developers can see the API schema instantly.
- **Native async** — critical for LangGraph pipeline calls and LLM API requests. No thread pool hacks needed.
- **Python ecosystem** — pdfplumber, python-docx, LangChain/LangGraph all have Python-native implementations.

**Why not Flask:** Sync-first design means blocking I/O during LLM calls. You'd need to add Celery or threading for async work. Less type safety.

**Why not Django:** Too much boilerplate for an API-only service. Django's ORM, admin, and auth are great for full-stack apps but unnecessary here. Heavier resource usage.

**Why not Express.js:** Python has better ML/AI library support (LangGraph, pdfplumber, python-docx). Node.js equivalents exist but are less mature.

---

## 3. Extension Bundler

**Decision: Vite + CRXJS**

| Factor | Vite + CRXJS | Webpack + CRXJS | Webpack (manual) | Rollup (manual) |
|--------|--------------|-----------------|------------------|-----------------|
| Build speed | Fast (ESM, HMR) | Medium | Slow | Medium |
| Manifest V3 support | Native via CRXJS | Via CRXJS | Manual | Manual |
| React integration | Vite plugin | Webpack loader | Webpack loader | Rollup plugin |
| HMR (hot reload) | Yes | Yes | No | No |
| Configuration | Simple | Medium | Complex | Complex |
| Community | Growing | Established | Large | Medium |

**Why Vite + CRXJS wins:**
- **CRXJS is purpose-built** for Chrome extension development with Manifest V3. It handles the manifest, content scripts, and service worker bundling automatically.
- **Vite's HMR** means changes to the sidebar React UI reload instantly without rebuilding the entire extension. Massive productivity boost.
- **Simpler config** than Webpack. Less boilerplate, fewer plugins to manage.

**Why not Webpack + CRXJS:** Webpack is slower for dev builds. Configuration is more verbose. CRXJS works with both, but Vite is the recommended path.

**Why not manual Webpack:** You'd have to manually handle Manifest V3's service worker bundling, content script isolation, and asset hashing. CRXJS solves all of this.

---

## 4. Sidebar UI Framework

**Decision: React (in Shadow DOM)**

| Factor | React | Vue | Svelte | Plain JS |
|--------|-------|-----|--------|----------|
| Ecosystem | Largest | Large | Growing | None |
| Component libraries | Extensive | Good | Limited | None |
| Team familiarity | High (industry standard) | Medium | Low | High |
| Bundle size | Medium (~40KB) | Small (~30KB) | Small (~10KB) | Tiny |
| Shadow DOM compatibility | Good (with setup) | Good | Good | Native |
| Learning curve | Low-Medium | Low | Low | Low |

**Why React wins:**
- **Industry standard** — most frontend developers know React. Easiest to find contributors and documentation.
- **Component libraries** — can use Radix UI, shadcn/ui, or similar for accessible components without CSS conflicts (important in Shadow DOM).
- **TypeScript support** — excellent, which matters for a TypeScript-heavy extension.

**Why not Vue:** Smaller ecosystem, fewer component libraries that work well in Shadow DOM. Good framework, but React is more practical for this project.

**Why not Svelte:** Smaller bundle size is nice, but the ecosystem is younger. Shadow DOM integration is less documented. Good choice for new projects, but React is safer here.

**Why not Plain JS:** No component model, no state management, no virtual DOM. The sidebar is complex enough (score display, checklist, draft editor, approval flow) that a framework pays for itself immediately.

---

## 5. DOM Selector Strategy

**Decision: Multi-strategy fallback (aria-label → structural → data-attributes)**

| Strategy | Stability | Examples |
|----------|-----------|---------|
| aria-label | High | `[aria-label="Edit headline"]` |
| Structural path | Medium | `section.pv-profile-section > div > button` |
| Data attributes | Low | `[data-field="edit_button"]` |
| Class names | Very Low | `.artdeco-button--secondary` |

**Why this strategy wins:**
- LinkedIn changes class names frequently (weekly/monthly). Class-based selectors break constantly.
- `aria-label` is semantic — LinkedIn uses it for accessibility, so it's more stable than visual classes.
- Structural paths provide a middle ground — they're based on the DOM hierarchy, which changes less often than classes.
- The multi-strategy fallback means if the primary selector breaks, we automatically use the backup without user-facing failures.

**Why not class names only:** LinkedIn's classes are auto-generated (CSS modules or similar). They change with every deployment. Selectors would break weekly.

**Why not XPath:** Harder to read, harder to maintain, and brittle to DOM restructuring. CSS selectors are more maintainable.

**Monitoring:** `monitor.ts` tracks which strategy succeeds for each section. When fallback strategies are used frequently, it signals that the primary selector needs updating.

---

## 6. Scoring Engine

**Decision: Rule-based (deterministic, no LLM)**

| Factor | Rule-based | LLM-based | Hybrid |
|--------|-----------|-----------|--------|
| Speed | Instant (<10ms) | 2-5 seconds | 1-3 seconds |
| Cost | Free | Costs per call | Partial cost |
| Consistency | 100% deterministic | Variable outputs | Variable for LLM part |
| Auditability | Rules are explicit | Black box | Partial |
| Extensibility | Edit YAML file | Prompt engineering | Both |

**Why rule-based wins for scoring:**
- **Speed** — scoring should be instant. Users shouldn't wait for an LLM to tell them their headline is too short.
- **Free** — no API costs for a core feature that users will use frequently.
- **Deterministic** — same profile always gets the same score. No "why did it give me 87 yesterday and 84 today?" confusion.
- **Auditable** — every rule is explicit in `rules.yaml`. Users can see exactly why they got a certain score.

**Why not LLM-based:** Slow, expensive, inconsistent. An LLM might score the same content differently each time. Not suitable for a scoring engine.

**Why not hybrid:** Adds complexity without clear benefit. The rule-based scorer is good enough for completeness scoring. LLM is reserved for content generation where creativity matters.

---

## 7. Rules Format

**Decision: YAML**

| Factor | YAML | JSON | Python dict | TOML |
|--------|------|------|-------------|------|
| Human-readable | Excellent | Good | Good | Good |
| Non-dev editable | Yes | Difficult (syntax strict) | No (requires code) | Yes |
| Comments | Yes | No | Yes | Yes |
| Nested structures | Clean | Clean | Clean | Limited |
| Tooling | Good | Excellent | N/A | Good |

**Why YAML wins:**
- **Non-devs can edit** — career coaches or product managers can tweak scoring rules without touching code.
- **Comments** — you can explain why a rule exists (`# This rule is critical for recruiter visibility`).
- **Readable** — the rule structure is clear at a glance:
  ```yaml
  headline:
    min_length: 40
    max_length: 220
    weight: 0.2
    rules:
      - name: includes_role_title
        description: "Headline should include your job title"
        check: contains_keyword
        keywords: ["engineer", "manager", "developer"]
  ```

**Why not JSON:** No comments, strict syntax (trailing commas break), harder for non-devs to edit safely.

**Why not Python dict:** Rules would be embedded in code. Changing a rule requires a code change + deployment. Not accessible to non-developers.

---

## 8. RAG System

**Decision: pgvector on Supabase**

| Factor | pgvector (Supabase) | Pinecone | Weaviate | ChromaDB |
|--------|---------------------|----------|----------|----------|
| Infrastructure | Already using Supabase | Separate service | Self-hosted or cloud | Self-hosted |
| Cost | Free (within Supabase free tier) | Free tier available | Self-hosted is free | Self-hosted is free |
| Latency | Low (same DB) | Medium (network) | Medium | Low (local) |
| Complexity | Low (no extra service) | Low | Medium | Medium |
| Scaling | Supabase handles it | Pinecone handles it | You manage | You manage |

**Why pgvector on Supabase wins:**
- **Already using Supabase** — no additional service to manage. Auth, database, and vector search in one place.
- **Free** — pgvector is included in Supabase's free tier. No additional cost.
- **Low latency** — vector search happens in the same database as your other queries. No network hop to a separate service.
- **Simple** — `CREATE EXTENSION vector;` and you're done. No separate infrastructure.

**Why not Pinecone:** Good service, but adds a separate dependency, API key, and potential cost. Overkill for a knowledge base of ~100-500 best-practice rules.

**Why not Weaviate:** Requires self-hosting or cloud setup. More complex than pgvector for this use case.

**Why not ChromaDB:** Good for local development, but requires self-hosting in production. Supabase is simpler.

---

## 9. LLM Provider

**Decision: Groq (Llama 3.1/3.3)**

| Factor | Groq | OpenAI | Ollama (self-hosted) | Anthropic |
|--------|------|--------|----------------------|-----------|
| Cost | Free tier (generous) | Paid ($0.002/1K tokens) | Free (hardware cost) | Paid |
| Speed | Very fast (custom hardware) | Medium | Depends on hardware | Medium |
| Model quality | Good (Llama 3.1/3.3) | Excellent (GPT-4) | Good (varies) | Excellent (Claude) |
| API compatibility | OpenAI-compatible | Native | Local API | Different API |
| Setup | Simple API key | Simple API key | Ollama server + model download | Simple API key |

**Why Groq wins:**
- **Free** — for an MVP, zero LLM costs is critical. Groq's free tier is generous.
- **Fast** — Groq's custom LPU hardware delivers very fast inference. Users won't wait for drafts.
- **OpenAI-compatible API** — easy to swap to OpenAI later by changing the base URL and API key. No code changes needed.
- **Good enough quality** — Llama 3.1/3.3 is capable of professional writing tasks. Not as good as GPT-4, but sufficient for LinkedIn content.

**Why not OpenAI:** Paid from day one. GPT-4 is excellent but costs add up at scale. Can swap to OpenAI later via the compatible API.

**Why not Ollama:** Requires running a local server and downloading models. Adds complexity. Not suitable for a Chrome extension that needs to work on any machine.

**Why not Anthropic:** Excellent models but paid. API is not OpenAI-compatible, so swapping later requires code changes.

**Future path:** When the product scales and needs better quality, swap `base_url` from `api.groq.com` to `api.openai.com` and add an OpenAI API key. The OpenAI-compatible interface means no code changes.

---

## 10. CV Parsing

**Decision: pdfplumber + python-docx**

| Factor | pdfplumber + python-docx | PyPDF2 + docx | Textract (AWS) | Browser-based PDF.js |
|--------|--------------------------|---------------|----------------|---------------------|
| PDF parsing quality | Excellent (layout-aware) | Basic | Excellent | Good |
| DOCX parsing | python-docx (native) | python-docx (same) | N/A | N/A |
| External dependencies | None (Python packages) | None | AWS account + API key | None |
| Cost | Free | Free | Paid per page | Free |
| Layout awareness | Yes (pdfplumber) | No | Yes | Partial |
| Scanned PDFs | No (needs OCR) | No | Yes | No |

**Why pdfplumber + python-docx wins:**
- **Pure Python** — no external APIs, no AWS account, no additional cost.
- **Layout-aware** — pdfplumber understands tables, columns, and text positioning. Critical for parsing resumes with complex layouts.
- **Mature** — both libraries are well-maintained with large user bases.

**Why not PyPDF2:** Less capable text extraction. Doesn't handle layouts well. pdfplumber is the modern replacement.

**Why not Textract (AWS):** Excellent quality but requires an AWS account and costs money per page. Overkill for MVP.

**Why not PDF.js:** Browser-based parsing doesn't work well for server-side extraction. Good for display, not for structured data extraction.

**Edge case — scanned PDFs:** If a user uploads a scanned PDF (image-based), text extraction will fail. For MVP, we'll flag this and ask for a text-based PDF. For v2, we could add OCR via Tesseract or a cloud OCR API.

---

## 11. Dashboard Framework

**Decision: Next.js on Vercel**

| Factor | Next.js + Vercel | Plain React + Vercel | SvelteKit + Vercel | Nuxt + Netlify |
|--------|------------------|---------------------|-------------------|----------------|
| SSR | Native | No (CSR only) | Native | Native |
| Landing page SEO | Excellent (SSR) | Poor (CSR) | Excellent | Excellent |
| API routes | Yes (optional) | No | Yes | Yes |
| Deployment | Zero-config | Zero-config | Zero-config | Zero-config |
| Ecosystem | Largest | Large | Growing | Medium |
| TypeScript | Excellent | Excellent | Excellent | Good |

**Why Next.js wins:**
- **Landing page SEO** — the marketing/landing page needs to be indexable by Google. Next.js SSR ensures this.
- **Zero-config deployment** — Vercel detects Next.js automatically. No build configuration needed.
- **Future API routes** — if we need server-side logic for the dashboard (e.g., webhook handlers), Next.js API routes are available.

**Why not plain React:** No SSR means the landing page won't be SEO-friendly. You'd need to add prerendering manually.

**Why not SvelteKit:** Smaller ecosystem, fewer integrations. Good framework, but React is more practical for this project.

---

## 12. Database

**Decision: Supabase (Postgres + pgvector)**

| Factor | Supabase | Firebase | PlanetScale | Self-hosted Postgres |
|--------|----------|----------|-------------|---------------------|
| Database type | Postgres (SQL) | Firestore (NoSQL) | MySQL | Postgres |
| Vector search | pgvector (built-in) | No (requires extension) | No | pgvector (manual setup) |
| Auth | Built-in | Built-in | No | Manual (NextAuth, etc.) |
| Real-time | Yes | Yes | No | Manual setup |
| Free tier | 500MB DB, 1GB storage | 1GB storage, 50K reads/day | 5GB, 1B reads | Hardware cost |
| Self-hosting | Optional | No | No | Yes |

**Why Supabase wins:**
- **All-in-one** — Auth + Database + Vector Search + Storage in one service. No need to glue together multiple services.
- **Postgres** — industry-standard relational database. SQL is more flexible than NoSQL for this use case ( joins between users, snapshots, updates, rules).
- **pgvector** — vector search is built-in. No need for a separate vector database.
- **Free tier** — generous limits for MVP.

**Why not Firebase:** NoSQL document model is less flexible for relational data (users → snapshots → updates). No built-in vector search. Google's pricing can be unpredictable.

**Why not PlanetScale:** MySQL-based, no vector search, no built-in auth. Good for scaling, but not for this use case.

**Why not self-hosted Postgres:** Requires server management, backups, SSL setup. Too much overhead for an MVP.

---

## 13. Authentication

**Decision: Supabase Auth via chrome.identity**

| Factor | Supabase Auth + chrome.identity | Firebase Auth | Auth0 | Manual OAuth |
|--------|--------------------------------|---------------|-------|--------------|
| Extension support | Native (chrome.identity) | Possible (complex) | Possible (complex) | Manual |
| OAuth providers | Google, GitHub, Microsoft, etc. | Google, GitHub, etc. | Many | Any |
| Token management | Supabase handles | Firebase handles | Auth0 handles | You manage |
| Cost | Free (50K MAU) | Free (50K MAU) | Free (7K MAU) | Free |
| Integration with DB | Native (same Supabase project) | Separate | Separate | Manual |

**Why Supabase Auth wins:**
- **chrome.identity integration** — Chrome's `chrome.identity` API is designed for OAuth in extensions. Supabase Auth works with it natively.
- **Same project** — Auth and Database are in the same Supabase project. User records are automatically linked to auth users.
- **Free tier** — 50K monthly active users is more than enough for MVP.

**Why not Firebase Auth:** Possible but more complex to set up with Chrome extensions. Separate project from the database.

**Why not Auth0:** Free tier limited to 7K MAU. Paid plans are expensive. Overkill for this use case.

**Why not manual OAuth:** You'd have to implement token exchange, refresh, and storage yourself. Supabase handles all of this.

---

## 14. Extension Distribution

**Decision: GitHub (developer mode)**

| Factor | GitHub (developer mode) | Chrome Web Store | Edge Add-ons |
|--------|------------------------|------------------|--------------|
| Cost | Free | $5 one-time | Free |
| Review process | None | Days-weeks | Days |
| Update distribution | Git pull | Store review | Store review |
| User base | Developers/technical | Anyone | Anyone |
| Trust | Lower (user installs manually) | Higher (store verified) | Higher |

**Why GitHub wins for MVP:**
- **Free** — no $5 developer registration fee.
- **Instant updates** — push to GitHub, users pull. No review process.
- **Fast iteration** — no waiting for store review when you fix a bug.
- **Target audience** — technical users who are comfortable with developer mode are the ideal early adopters.

**Why not Chrome Web Store:** $5 fee + review process + slower updates. Good for v2 when the product is polished and targeting non-technical users.

**Migration path:** When ready for mainstream, publish to Chrome Web Store. The extension code doesn't change — just the distribution method.

---

## 15. Agent Orchestration

**Decision: LangGraph**

| Factor | LangGraph | LangChain | CrewAI | Custom state machine |
|--------|-----------|-----------|--------|---------------------|
| Pipeline control | Explicit state machine | Chain-based (less flexible) | Multi-agent | Full control |
| Debugging | Visual graph, state inspection | Limited | Limited | Manual |
| Error handling | Built-in retry, branching | Basic | Basic | Manual |
| Learning curve | Medium | Low-Medium | Low | High |
| Community | Growing | Large | Growing | N/A |

**Why LangGraph wins:**
- **Explicit state** — each step in the pipeline (parse → retrieve → rewrite → score) is a node with defined inputs/outputs. Easy to debug.
- **Branching** — CV mode vs custom text mode are different paths in the graph. Clean to implement.
- **Visual debugging** — LangGraph provides a visual representation of the pipeline. Useful for understanding flow.

**Why not LangChain:** LangChain's chain-based approach is less flexible for branching pipelines. LangGraph is the evolution of LangChain for complex workflows.

**Why not CrewAI:** Multi-agent orchestration is overkill. We have a single pipeline, not multiple agents collaborating.

**Why not custom state machine:** Possible but you'd reinvent what LangGraph provides (state management, retry, branching, visualization).

---

## 16. Client-Side Scoring

**Decision: Yes, rules cached in extension**

| Factor | Client-side scoring | Server-side only | Hybrid |
|--------|---------------------|------------------|--------|
| Offline support | Yes | No | Partial |
| Backend dependency | None for scoring | Required | Required for enhanced |
| Latency | Instant | Network round-trip | Varies |
| Rules update | Requires extension update | Auto-updates | Partial |
| Complexity | Low | Low | Medium |

**Why client-side scoring wins:**
- **Offline support** — basic scoring works without internet. Users get instant feedback.
- **No backend dependency** — reduces load on Cloud Run. Backend is only needed for LLM generation and RAG.
- **Instant feedback** — no network round-trip. Users see their score immediately.

**Trade-off — rules updates:** When scoring rules change, users need to update the extension to get new rules. For MVP, this is acceptable. For v2, we could add a rules versioning system that fetches latest rules from the backend on load.

---

## 17. Styling Isolation

**Decision: Shadow DOM**

| Factor | Shadow DOM | CSS Modules | iframe | Scoped CSS |
|--------|------------|-------------|--------|------------|
| Style isolation | Complete | Class-based | Complete | Class-based |
| Performance | Good | Good | Poor (extra document) | Good |
| LinkedIn CSS conflicts | None | Possible | None | Possible |
| Accessibility | Good | Good | Poor | Good |

**Why Shadow DOM wins:**
- **Complete isolation** — LinkedIn's CSS cannot affect our sidebar. Our CSS cannot affect LinkedIn. Zero conflicts.
- **No class name collisions** — even if LinkedIn uses the same class names as our components, they don't interfere.
- **Good performance** — better than iframe, similar to CSS Modules but with guaranteed isolation.

**Why not CSS Modules:** Class-based isolation can still leak in edge cases. Shadow DOM is guaranteed isolation.

**Why not iframe:** Poor performance, accessibility issues, complex messaging between iframe and content script.

---

## 18. File Storage

**Decision: Supabase Storage**

| Factor | Supabase Storage | AWS S3 | Cloudinary | Local only |
|--------|------------------|--------|------------|------------|
| Integration | Native (same project) | Separate service | Separate service | No cloud |
| Cost | Free (1GB) | Free tier (5GB) | Free tier (25GB) | Free |
| CV upload support | Yes | Yes | Yes | N/A |
| Access control | Supabase RLS | IAM policies | API keys | N/A |

**Why Supabase Storage wins:**
- **Already using Supabase** — no additional service.
- **Free 1GB** — CV files are small (typically <5MB each). 1GB is plenty.
- **Access control** — Supabase Row Level Security ensures users can only access their own files.

---

## 19. Update Delivery Strategy

**Decision: Three risk-tiered paths with manual fallback**

| Path | Risk | Automation |适用场景 |
|------|------|------------|---------|
| Path 1: DOM sync | Low-Medium | Content script fills form | Most sections (headline, about, experience) |
| Path 2: Deep-link | Zero | Opens LinkedIn's native dialog | Certifications only |
| Path 3: Manual copy | Zero | User copies and pastes | Universal fallback |

**Why this strategy wins:**
- **Risk tiers** — users can choose their comfort level. Deep-link is zero risk, DOM sync is low risk, manual copy is zero risk.
- **Fallback chain** — if DOM sync fails, automatic fallback to manual copy. No dead ends.
- **No auto-submit** — LinkedIn's own Save button is always the final step. User retains control.

**Why not DOM sync only:** LinkedIn's DOM changes can break selectors. Without a fallback, users would be stuck.

**Why not deep-link only:** Only works for certifications. Most sections need a different approach.

**Why not manual copy only:** Too much friction. Users want automation where possible.

---

## 20. Playwright Automation

**Decision: Deferred to Phase 2, opt-in only**

| Factor | Phase 2 (opt-in) | MVP inclusion | Never |
|--------|-------------------|---------------|-------|
| Development time | Minimal in MVP | Significant | N/A |
| Account risk | User explicitly consents | User might not understand | No risk |
| Maintenance burden | Delayed | Immediate | None |
| User value | High for power users | High for all | Missing feature |

**Why deferred:**
- **Highest risk path** — Playwright controls a headless browser with the user's session. If something goes wrong, the user's account could be flagged.
- **Most fragile** — LinkedIn actively detects automation. Selectors break, anti-bot measures change.
- **Paths 1-3 cover 90%+ of use cases** — DOM sync for most sections, deep-link for certifications, manual copy as fallback.
- **Cleaner architecture** — Playwright is an isolated module that doesn't affect the core scoring/generation pipeline.

**Why opt-in only (Phase 2):**
- **Explicit consent** — user must acknowledge account risk before enabling.
- **Encrypted session** — session tokens encrypted with user-provided key.
- **Automatic expiry** — sessions expire after 30 days, re-auth required.

---

## Summary Table

| Decision | Choice | Key Reason |
|----------|--------|------------|
| Backend hosting | Google Cloud Run | Scale-to-zero native, 2M req/mo free |
| Backend framework | FastAPI | Async, Pydantic, auto OpenAPI docs |
| Extension bundler | Vite + CRXJS | Purpose-built for Manifest V3, fast HMR |
| Sidebar UI | React (Shadow DOM) | Largest ecosystem, complete style isolation |
| DOM selectors | Multi-strategy fallback | Resilient to LinkedIn DOM changes |
| Scoring | Rule-based | Instant, free, deterministic |
| Rules format | YAML | Non-dev editable, comments supported |
| RAG | pgvector on Supabase | Already using Supabase, free |
| LLM | Groq (Llama 3.1/3.3) | Free, fast, OpenAI-compatible |
| CV parsing | pdfplumber + python-docx | Pure Python, layout-aware |
| Dashboard | Next.js on Vercel | SSR for SEO, zero-config deploy |
| Database | Supabase (Postgres) | All-in-one, pgvector built-in |
| Auth | Supabase Auth + chrome.identity | Native extension support |
| Distribution | GitHub (developer mode) | Free, instant updates, fast iteration |
| Agent orchestration | LangGraph | Explicit state machine, branching |
| Client-side scoring | Yes (rules cached) | Offline support, instant feedback |
| Styling | Shadow DOM | Complete CSS isolation |
| File storage | Supabase Storage | Already using Supabase, free |
| Update delivery | 3 risk-tiered paths + fallback | User choice, no dead ends |
| Playwright | Phase 2, opt-in | Deferred risk, paths 1-3 sufficient |
