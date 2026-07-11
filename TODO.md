# Flow Content Pipeline — Next Steps

## Accounts & API Keys (Jon — manual setup)

- [ ] **Typefully** — Sign up at typefully.com, connect LinkedIn + X accounts, get API key from settings
- [ ] **Telegram Bot** — Message @BotFather on Telegram, create bot, save the bot token
- [ ] **Fly.io** — Sign up at fly.io, install CLI (`brew install flyctl`), run `fly auth login`
- [ ] **Notion API** — Go to notion.so/my-integrations, create internal integration for clippings DB, get token + database ID
- [ ] **Anthropic API** — Get API key from console.anthropic.com (may already have one)
- [ ] **Kit API** — Get API secret from Kit settings → Advanced (already have an account)
- [ ] **Sanity** — Get project ID, dataset name, and write token from manage.sanity.io (if blog publishing is in scope)
- [ ] **OpenClaw** — Set up project at openclaw.com, configure Telegram bot integration

## Strategy Files (in progress)

- [ ] Move `strategy-export/` files from Evissa repo to `strategy/` in this repo
- [ ] Review voice.md, pillars.md, audience.md for accuracy
- [ ] Fill in platform docs (twitter.md, newsletter.md, blog.md) with more specifics
- [ ] Curate good-posts.md examples — confirm these are actually the best performers

## Infrastructure

- [ ] Create `.env` from env vars listed in ARCHITECTURE-V2.md — populate with API keys once obtained
- [ ] Set up database — run `db/schema.sql` against SQLite or Turso
- [ ] Configure OpenClaw — write `openclaw/config.yaml` with Telegram bot token and cron schedule
- [ ] Set up Fly.io app — `fly launch`, configure volume for SQLite, set secrets

## Pipeline Build (code tasks)

- [ ] `pipeline/ingest.ts` — Notion API → database
- [ ] `pipeline/ideate.ts` — Clippings + strategy context → Claude API → ideas
- [ ] `pipeline/draft.ts` — Approved ideas + platform voice → Claude API → drafts
- [ ] `pipeline/review.ts` — Drafts + voice/avoid context → Claude API → revised drafts
- [ ] `pipeline/publish.ts` — Route to Typefully / Sanity / Kit APIs
- [ ] `pipeline/orchestrator.ts` — Runs stages in sequence, handles errors, logs runs
- [ ] `services/notion.ts` — Notion API client
- [ ] `services/typefully.ts` — Typefully API client
- [ ] `services/sanity.ts` — Sanity mutation client
- [ ] `services/kit.ts` — Kit broadcast API client
- [ ] `services/llm.ts` — Claude API wrapper with strategy context loading
- [ ] `services/db.ts` — SQLite/Turso client

## Testing

- [ ] Add test clippings to Notion
- [ ] Run ingest manually, verify DB records
- [ ] Run ideate on test clippings, review quality of generated ideas
- [ ] Test Telegram review flow (approve/skip/notes)
- [ ] Run draft on approved ideas, check platform formatting
- [ ] Test publish in draft/sandbox mode on each platform
- [ ] End-to-end: Notion clipping → published LinkedIn post

## Deploy

- [ ] Write `deploy/Dockerfile`
- [ ] Write `deploy/fly.toml`
- [ ] Deploy to Fly.io
- [ ] Set secrets via `fly secrets set`
- [ ] Enable nightly cron
- [ ] Monitor first 3 days of automated runs

---

*Last updated: 2026-03-30*
