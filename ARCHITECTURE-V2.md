# Flow Content Pipeline — Architecture Plan

## Overview

An automated content pipeline that turns unstructured clippings (articles, Reddit threads, notes) into strategy-aligned content, published across LinkedIn, X, blog (Sanity), and newsletter (Kit). The system runs autonomously on a remote server, with human review/approval via Telegram.

---

## Current State

| Component | Status |
|-----------|--------|
| **Flow app** (this repo) | React + Vite frontend, localStorage only, no real database, no Notion integration |
| **Avisa project** | Local only, contains strategy docs + writing agents, used with Claude Code |
| **Notion** | Used manually for clipping articles/ideas, no API integration |
| **Publishing** | Fully manual across all platforms |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GITHUB REPO                          │
│  Pipeline scripts, strategy context, OpenClaw config        │
│  (code lives here, deploys to Fly.io)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ deploy
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     FLY.IO (always-on)                       │
│                                                             │
│  ┌───────────────┐    ┌──────────────────────────────────┐  │
│  │   OpenClaw     │    │        Pipeline Engine           │  │
│  │               │    │                                  │  │
│  │  - Telegram   │◄──►│  1. Ingest (Notion → raw)        │  │
│  │    interface   │    │  2. Ideate (raw → ideas)         │  │
│  │  - Cron        │    │  3. Draft (ideas → drafts)       │  │
│  │    scheduling  │    │  4. Review (LLM refinement)      │  │
│  │  - Approval    │    │  5. Publish (→ platforms)        │  │
│  │    flow        │    │                                  │  │
│  └───────┬───────┘    └──────────────┬───────────────────┘  │
│          │                           │                       │
│          └───────────┬───────────────┘                       │
│                      ▼                                       │
│              ┌──────────────┐                                │
│              │   Database    │                                │
│              │  (SQLite or   │                                │
│              │   Turso)      │                                │
│              └──────────────┘                                │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐      ┌──────────────┐     ┌─────────────┐
   │ Typefully │      │    Sanity     │     │     Kit      │
   │ (LinkedIn │      │   (Blog)     │     │ (Newsletter) │
   │  + X)     │      │              │     │              │
   └──────────┘      └──────────────┘     └─────────────┘
```

---

## Pipeline Stages

### Stage 1: Ingest (nightly cron)
- **Trigger:** OpenClaw cron, runs nightly (e.g. 2am)
- **Input:** Notion database of clippings (articles, Reddit threads, notes, bookmarks)
- **Process:** Pull all items with status "unprocessed" via Notion API
- **Output:** Raw clipping records written to database with metadata (source URL, title, excerpt, tags, date clipped)

### Stage 2: Ideate (runs after ingest)
- **Input:** Raw clippings + strategy context (from Avisa)
- **Process:** LLM takes each clipping + your strategy docs (pillars, voice, themes, audience) and generates 1-3 content ideas per clipping. Each idea has: angle, target platform(s), pillar alignment, hook
- **Output:** Ideas written to database with status "pending_review"
- **Notification:** OpenClaw sends you a Telegram summary: "12 new clippings processed → 28 ideas generated. Ready for review."

### Stage 3: Human Review (async, via Telegram)
- **Trigger:** You, whenever you're ready
- **Process:** OpenClaw sends ideas one by one or in batches. You reply with:
  - "approve" / thumbs up → moves to drafting
  - "skip" / thumbs down → archived
  - Free-text notes → stored as direction for the drafting stage
- **Output:** Approved ideas move to status "approved" with optional notes

### Stage 4: Draft (runs on approved ideas)
- **Trigger:** OpenClaw detects approved ideas (polling or event-driven)
- **Input:** Approved idea + strategy context + platform-specific voice/format rules
- **Process:** LLM generates platform-specific drafts. One idea may produce multiple drafts (LinkedIn version, X thread, newsletter section, blog post)
- **Output:** Drafts written to database with status "draft"

### Stage 5: Review (automated LLM pass)
- **Trigger:** Runs immediately after drafting
- **Input:** Draft + strategy context + platform constraints
- **Process:** A separate LLM "reviewer" agent checks for:
  - Voice consistency with your writing samples
  - Platform formatting rules (character limits, structure)
  - Clarity, hook strength, CTA presence
  - Generates a revised version + review notes
- **Output:** Revised draft with status "reviewed", review notes attached

### Stage 6: Human Edit (async, via Telegram)
- **Trigger:** OpenClaw sends reviewed drafts for your approval
- **Process:** You read the draft + review notes. Options:
  - "publish" → moves to publishing
  - Reply with edits → OpenClaw updates the draft, optionally re-runs review
  - "rework" → sends back to drafting with new direction
- **Output:** Final drafts with status "approved_for_publish"

### Stage 7: Publish
- **Trigger:** You say "publish" or schedule a publish time
- **Process per platform:**
  - **LinkedIn + X** → Typefully API (handles formatting, scheduling, Unicode conversion)
  - **Blog** → Sanity API (markdown → Portable Text, create document, publish)
  - **Newsletter** → Kit API (markdown → HTML, create broadcast as draft or scheduled)
- **Output:** Published status + URLs/links stored in database

---

## Strategy Context (from Avisa)

Your Avisa strategy docs need to be extracted into structured files that the pipeline loads as LLM context. These live in the repo and get deployed to Fly.io.

```
strategy/
├── pillars.md          # Content pillars, core beliefs, topics
├── voice.md            # Writing voice, tone, personality
├── audience.md         # Target audience profiles
├── themes.md           # Cross-cutting narrative themes
├── platforms/
│   ├── linkedin.md     # LinkedIn-specific voice, format rules, writing samples
│   ├── twitter.md      # X-specific voice, format rules
│   ├── newsletter.md   # Newsletter voice, structure
│   └── blog.md         # Blog voice, structure, SEO considerations
└── examples/
    ├── good-posts.md   # Examples of your best content (for few-shot prompting)
    └── avoid.md        # Anti-patterns, things to avoid
```

Each pipeline stage loads the relevant subset of these files as system/context prompts.

---

## Project Structure

```
Flow-Content-Pipeline/
├── pipeline/
│   ├── ingest.ts           # Notion → database
│   ├── ideate.ts           # Clippings → ideas
│   ├── draft.ts            # Ideas → platform drafts
│   ├── review.ts           # LLM reviewer pass
│   ├── publish.ts          # Route to Typefully/Sanity/Kit
│   └── orchestrator.ts     # Runs stages in sequence, handles errors
│
├── services/
│   ├── notion.ts           # Notion API client (read clippings)
│   ├── typefully.ts        # Typefully API (LinkedIn + X publishing)
│   ├── sanity.ts           # Sanity mutation client (blog publishing)
│   ├── kit.ts              # Kit broadcast API (newsletter)
│   ├── llm.ts              # Claude API calls (ideation, drafting, review)
│   └── db.ts               # Database client (SQLite/Turso)
│
├── strategy/               # Avisa strategy context files (see above)
│
├── db/
│   ├── schema.sql          # Database schema
│   └── migrations/         # Schema migrations
│
├── openclaw/
│   ├── config.yaml         # OpenClaw configuration
│   ├── skills/
│   │   ├── review-ideas.md     # Skill: send ideas for Telegram review
│   │   ├── review-drafts.md    # Skill: send drafts for Telegram review
│   │   ├── publish-content.md  # Skill: trigger publishing
│   │   └── pipeline-status.md  # Skill: report pipeline status
│   └── cron/
│       └── nightly.yaml    # Cron schedule definition
│
├── deploy/
│   ├── Dockerfile          # Container for Fly.io
│   └── fly.toml            # Fly.io config
│
├── components/             # (existing) Flow app UI components
├── services/
│   └── geminiService.ts    # (existing) Gemini integration
├── App.tsx                 # (existing) Flow app
├── types.ts                # (existing + extended) Type definitions
├── package.json
└── tsconfig.json
```

---

## Database Schema

```sql
-- Raw clippings ingested from Notion
CREATE TABLE clippings (
    id TEXT PRIMARY KEY,
    notion_id TEXT UNIQUE NOT NULL,
    title TEXT,
    url TEXT,
    excerpt TEXT,
    notes TEXT,
    tags TEXT,              -- JSON array
    source TEXT,            -- 'article', 'reddit', 'tweet', 'note', etc.
    clipped_at DATETIME,
    ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'unprocessed'  -- unprocessed, processed, archived
);

-- Ideas generated from clippings
CREATE TABLE ideas (
    id TEXT PRIMARY KEY,
    clipping_id TEXT REFERENCES clippings(id),
    angle TEXT NOT NULL,            -- The specific content angle
    hook TEXT,                      -- Suggested hook/opening
    pillar TEXT,                    -- Which content pillar it aligns with
    target_platforms TEXT,          -- JSON array of platforms
    notes TEXT,                     -- Your review notes
    status TEXT DEFAULT 'pending',  -- pending, approved, skipped, archived
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME
);

-- Platform-specific drafts
CREATE TABLE drafts (
    id TEXT PRIMARY KEY,
    idea_id TEXT REFERENCES ideas(id),
    platform TEXT NOT NULL,         -- linkedin, twitter, newsletter, blog
    content TEXT NOT NULL,
    review_notes TEXT,              -- LLM reviewer feedback
    revision INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',    -- draft, reviewed, approved, published, rework
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    published_url TEXT,
    typefully_id TEXT,              -- Typefully draft ID (for LinkedIn/X)
    sanity_id TEXT,                 -- Sanity document ID (for blog)
    kit_broadcast_id TEXT           -- Kit broadcast ID (for newsletter)
);

-- Pipeline run log
CREATE TABLE pipeline_runs (
    id TEXT PRIMARY KEY,
    stage TEXT NOT NULL,            -- ingest, ideate, draft, review, publish
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT DEFAULT 'running',  -- running, completed, failed
    summary TEXT,                   -- Human-readable summary of what happened
    error TEXT
);
```

---

## Integration Details

### Notion (Read)
- **API:** Notion API v2022-06-28
- **Auth:** Internal integration token
- **Usage:** Query a database for clippings where status = "unprocessed"
- **After ingest:** Update Notion item status to "processed"

### Typefully (LinkedIn + X Publishing)
- **API:** Typefully API
- **Auth:** API key
- **Usage:** Create drafts via API → Typefully handles formatting and scheduling
- **Why Typefully:** Solves the markdown-to-LinkedIn formatting problem entirely. Handles Unicode bold/italic, proper line spacing, emoji rendering. Also supports X/Twitter. You can schedule posts or publish immediately.
- **Bonus:** Typefully has analytics, so you can track performance without building that yourself.

### Sanity (Blog Publishing)
- **API:** Sanity Mutation API
- **Auth:** Write token
- **Usage:** Convert markdown → Portable Text, create/publish documents
- **Library:** `@sanity/client` for mutations

### Kit (Newsletter Publishing)
- **API:** Kit V3 Broadcasts API
- **Auth:** API secret
- **Usage:** Create broadcast with subject + HTML content (markdown → HTML via `marked`)
- **Default behavior:** Create as draft for manual send, or set `send_at` to schedule

### LLM (Claude API)
- **API:** Anthropic Claude API
- **Auth:** API key
- **Usage:** Powers ideation, drafting, and review stages
- **Model:** Claude Sonnet for speed/cost on ideation and review, Claude Opus for drafting quality (configurable)

---

## OpenClaw Configuration

### Cron Schedule
- **Nightly ingest + ideate:** `0 2 * * *` (2am daily)
- **Draft approved ideas:** triggered on approval, or batched

### Telegram Interaction Patterns

**Morning summary:**
> "Good morning. Last night's pipeline processed 8 new clippings into 15 ideas. 3 drafts are ready for review. Want to start reviewing?"

**Idea review:**
> **Idea #42** (from: "Why most AI agents fail" — Reddit)
> **Angle:** Counter-narrative — most AI agent failures are actually prompt engineering failures, not model failures
> **Pillar:** AI as Co-pilot
> **Platforms:** LinkedIn, X thread
>
> 👍 Approve | 👎 Skip | 💬 Reply with notes

**Draft review:**
> **Draft #78** — LinkedIn
> ---
> [full draft text]
> ---
> Reviewer notes: "Strong hook. CTA could be more specific. Consider adding a concrete example in paragraph 2."
>
> ✅ Publish | ✏️ Reply with edits | 🔄 Rework

---

## Environment Variables / Secrets

```
# Notion
NOTION_API_KEY=
NOTION_CLIPPINGS_DB_ID=

# LLM
ANTHROPIC_API_KEY=

# Typefully
TYPEFULLY_API_KEY=

# Sanity
SANITY_PROJECT_ID=
SANITY_DATASET=
SANITY_WRITE_TOKEN=

# Kit (ConvertKit)
KIT_API_SECRET=

# Telegram (for OpenClaw)
TELEGRAM_BOT_TOKEN=

# Database
DATABASE_URL=              # Turso URL or local SQLite path

# OpenClaw
OPENCLAW_LLM_PROVIDER=    # anthropic, openai, etc.
OPENCLAW_LLM_API_KEY=     # API key for OpenClaw's own LLM usage
```

---

## Deployment Steps

### 1. Prepare strategy context
- Extract Avisa strategy docs into `strategy/` folder
- Structure as markdown files per the schema above

### 2. Set up database
- **Option A:** SQLite file on Fly.io volume (simplest, single-server)
- **Option B:** Turso hosted SQLite (if you later want the Flow app to read from it too)

### 3. Build pipeline scripts
- Implement each stage in `pipeline/`
- Wire up integration services

### 4. Configure OpenClaw
- Set up Telegram bot via BotFather
- Write custom skills for review/approval flows
- Configure cron schedule

### 5. Deploy to Fly.io
- `fly launch` with Dockerfile
- Set secrets via `fly secrets set`
- Attach volume for SQLite (if using Option A)

### 6. Test end-to-end
- Add test clippings to Notion
- Run pipeline manually
- Review via Telegram
- Publish to test/draft mode on each platform

---

## Future Enhancements (not now)

- **Flow app as deployed dashboard** — mobile-responsive, reads from shared DB, shows full pipeline status
- **Performance tracking** — pull analytics from Typefully/LinkedIn/Kit back into the DB
- **Multi-model routing** — use cheaper/faster models for simple tasks, premium for complex drafting
- **Content calendar view** — visual scheduling across platforms
- **A/B hook testing** — generate multiple hooks per idea, track which performs better
