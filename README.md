# LinkedIn Profile Optimizer

A Chrome extension + backend service that reads your LinkedIn profile, scores it, and generates AI-optimized content to help you land your next opportunity.

---

## What It Does

1. **Scrapes your own LinkedIn profile** (client-side, in your browser)
2. **Scores it** against best-practice rules (deterministic, instant)
3. **Generates optimized content** using AI (LLM-powered rewrites)
4. **Lets you review/edit** every draft before anything touches your profile
5. **Syncs changes** back to LinkedIn through risk-tiered delivery paths

---

## Architecture

```
┌─────────────────────────────────────────────┐
│          Chrome Extension                    │
│  Content Script: DOM scraping + form fill    │
│  Sidebar: React UI (Shadow DOM)             │
│  Background: Auth + messaging                │
│  Client-side scorer (rules cached)           │
└──────────────────┬──────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────┐
│  Google Cloud Run (FastAPI)                  │
│  /profile/score | /content/generate          │
│  /content/extract | /updates/approve         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│  Supabase (Postgres + pgvector + Auth)       │
└─────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Next.js Dashboard (Vercel)                  │
│  History, analytics, settings                │
└──────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Extension | Chrome Manifest V3, TypeScript, React, Vite + CRXJS |
| Backend | FastAPI, Python 3.11, LangGraph, Groq (Llama 3.1/3.3) |
| Database | Supabase (Postgres + pgvector) |
| Auth | Supabase Auth via chrome.identity |
| Hosting | Google Cloud Run (backend), Vercel (dashboard) |
| File Parsing | pdfplumber, python-docx |

---

## Project Structure

```
linkedin-optimizer/
├── extension/          # Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── content/    # DOM scraping + form filling
│   │   ├── background/ # Service worker
│   │   ├── sidebar/    # React UI
│   │   ├── popup/      # Extension popup
│   │   └── types/      # Shared types
│   └── manifest.json
│
├── dashboard/          # Next.js Web Dashboard
│   └── src/
│       └── app/        # Pages
│
├── backend/            # FastAPI Backend
│   ├── app/
│   │   ├── api/        # API endpoints
│   │   ├── core/       # Scorer, config, rules
│   │   ├── agents/     # LangGraph pipeline
│   │   ├── rag/        # pgvector retrieval
│   │   ├── parsers/    # CV/resume parsing
│   │   ├── models/     # SQLAlchemy/Pydantic
│   │   └── services/   # Auth, LLM, storage
│   └── Dockerfile
│
├── shared/             # Shared types
└── docs/               # Documentation
```

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker (for Cloud Run deployment)
- Google Cloud account (for Cloud Run)
- Supabase account (free tier)

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema in the Supabase SQL Editor:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  linkedin_public_id TEXT,
  persona TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile snapshots
CREATE TABLE profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  raw_text TEXT,
  score INTEGER,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile updates (audit log)
CREATE TABLE profile_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  source TEXT CHECK (source IN ('cv', 'custom')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'synced', 'manual_copy', 'deep_linked', 'failed')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Best practice rules (with pgvector)
CREATE TABLE best_practice_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  rule_text TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON best_practice_rules
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_updates ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read own snapshots" ON profile_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots" ON profile_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own updates" ON profile_updates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own updates" ON profile_updates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

3. Enable Google/GitHub OAuth in Authentication > Providers
4. Note your `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run locally
uvicorn app.main:app --reload --port 8080
```

### 3. Extension Setup

```bash
cd extension

# Install dependencies
npm install

# Build for development
npm run dev

# Load in Chrome:
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the extension/dist folder
```

### 4. Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run locally
npm run dev
```

### 5. Cloud Run Deployment

```bash
cd backend

# Build and deploy
gcloud run deploy linkedin-optimizer \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0
```

---

## Environment Variables

### Backend (.env)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
```

### Extension (manifest.json or .env)

```
VITE_API_URL=https://your-cloud-run-url.run.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Dashboard (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Usage

1. Install the extension (developer mode)
2. Open your LinkedIn profile (`linkedin.com/in/yourname`)
3. The sidebar appears with your profile score
4. Click "Optimize" on any section
5. Choose CV upload or custom text
6. Review the AI-generated draft
7. Edit or approve
8. Choose sync method (auto-sync, deep-link, or copy-paste)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profile/score` | Score a profile section |
| POST | `/content/extract` | Parse CV/resume → structured JSON |
| POST | `/content/generate` | Generate optimized content |
| POST | `/updates/approve` | Log an approved change |
| GET | `/certifications/deep-link` | Build LinkedIn add-certification URL |

---

## License

MIT
