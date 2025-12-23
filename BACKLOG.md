# Flow Backlog

## Roadmap Overview

| Phase | Focus | Status |
|-------|-------|--------|
| V1.0 | Core MVP (current) | ✅ Complete |
| V1.1 | Plays System | 🔲 Planned |
| V1.2 | Strategy Copilot | 🔲 Planned |
| V2.0 | Integrations & Play Builder | 🔲 Future |

---

## Feature Specs

### 1. PLAYS SYSTEM

**Target:** V1.1

#### Core Concept

Plays are reusable content multiplication patterns. Instead of staring at a blank page thinking "what should I post," you select a Play that knows how to transform a single piece of content or idea into multiple strategic outputs.

#### Play Architecture

```typescript
type Play = {
  id: string
  name: string
  trigger: 'long-form content' | 'big idea' | 'case study' | 'hot take' | 'question' | 'weekly recap'
  inputs: PlayInput[]           // what the user needs to provide
  outputs: PlayOutput[]         // what gets generated
  executionSteps: string[]      // the AI workflow
  platformMapping: Platform[]   // which outputs go where
}
```

#### Starter Play Library

| Play Name | Trigger | Inputs | Outputs |
|-----------|---------|--------|---------|
| **Pillar & Satellite** | Long-form blog/article | 1 pillar post | 5-7 LinkedIn posts, 3-5 tweet threads, 1 newsletter section |
| **Controversy Cascade** | Hot take / contrarian opinion | 1 spicy opinion | Initial post → defense post → nuance post → "what I learned" post → newsletter deep-dive |
| **Case Study Atomizer** | Client win / project completion | Case study details | Metrics post, lessons learned post, "how we did it" thread, testimonial ask template |
| **Reverse Engineer** | Competitor or industry content | URL or paste | Your contrarian take, "yes and" expansion, application to your niche |
| **Weekly Recap** | Week's activities/learnings | Quick bullet notes | "5 things I learned" post, thread version, newsletter intro |
| **Question Flip** | FAQ you keep answering | Common question | Direct answer post, contrarian angle, "unpopular opinion" version |

#### Play Execution UI

1. User selects a Play from the Play Library
2. Modal opens with input fields specific to that Play
3. User fills in required inputs (or selects existing Pillar content)
4. AI generates all outputs simultaneously
5. Outputs appear as draft Executions linked to the source Pillar
6. User reviews, edits, approves → moves to scheduling queue

#### Play Builder (V2)

- Power users can create custom Plays
- Define inputs, outputs, prompt templates, platform targeting
- Share/import Plays (ecosystem opportunity)

---

### 2. STRATEGY COPILOT

**Target:** V1.2

#### Core Concept

An AI agent that sits on top of your content inventory, external inputs, and (optionally) performance data to generate weekly content plans aligned with your strategy.

#### The Three Input Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: YOUR STRATEGY (from Flow)                        │
│  - Pillars and their themes                                │
│  - Voice/tone settings                                     │
│  - Platform priorities                                     │
│  - Content inventory (what you've already created)         │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: EXTERNAL INPUTS (configurable sources)           │
│  - Notion database (saved articles, research, ideas)       │
│  - RSS feeds (industry news)                               │
│  - Bookmarks/read-later queue                              │
│  - Manual "spark" notes                                    │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: PERFORMANCE SIGNALS (optional)                   │
│  - Manual entry (engagement scores)                        │
│  - CSV import from analytics                               │
│  - Future: API connections to LinkedIn/Twitter             │
└─────────────────────────────────────────────────────────────┘
```

#### Performance Tracking Reality Check

API options are messy:

- **LinkedIn API** — requires partner approval, limited access for personal profiles
- **Twitter/X API** — paid, rate-limited, constantly changing
- **Manual is actually fine for V1** — most creators know what's working

**Practical V1 approach:**

1. Add a `performance_score` field to Executions (1-5 scale or Low/Med/High/Viral)
2. User tags published content with rough performance after a few days
3. Strategy Copilot weights recommendations based on what's worked

**V2 enhancement:**

- CSV import from native platform analytics exports
- Notion database sync where user tracks performance in their existing system

#### Strategy Copilot Weekly Planning Flow

**Step 1: Context Gathering**

Copilot analyzes:
- Pillar balance (which themes are neglected?)
- Recent performance patterns (what's resonating?)
- External inputs (new articles/ideas to work with)
- Calendar context (any events, launches, timely hooks?)

**Step 2: Weekly Plan Generation**

Output format:

```
WEEK OF [DATE] - CONTENT PLAN

Theme Focus: [Pillar] - you haven't posted about this in 2 weeks

MONDAY - LinkedIn
  Idea: [Generated from saved article about X]
  Play: Reverse Engineer
  Hook: "Everyone's talking about X. Here's what they're missing..."
  Pillar: [AI Strategy]

WEDNESDAY - LinkedIn
  Idea: [Builds on your high-performing post from last week]
  Play: Controversy Cascade (Follow-up)
  Hook: "Last week I said [X]. Here's what happened in the DMs..."
  Pillar: [Agency Operations]

FRIDAY - Twitter Thread
  Idea: [Case study from your Notion research queue]
  Play: Case Study Atomizer
  Hook: "How [Company] did [Result] - thread:"
  Pillar: [Implementation Stories]

NEWSLETTER (Sunday)
  Theme: Tie together the week's themes
  Include: Deep-dive on Wednesday's topic
```

**Step 3: User Review & Commit**

- User reviews plan, swaps/edits suggestions
- "Generate Drafts" button creates actual content for each slot
- Drafts land in the Editor for final polish

#### Data Sources Integration (V1)

**Notion Integration:**

Connect a Notion database with:
- Title (article/idea name)
- URL (source link)
- Notes (your quick thoughts)
- Tags (topic categories)
- Status (unprocessed, used, archived)

Copilot pulls unprocessed items as potential content fuel.

**Simple "Spark Box":**

- Quick capture within Flow
- Paste a link, jot a thought, tag a pillar
- Copilot mines these during planning

---

## Open Questions

> Decisions needed before implementation

| # | Question | Options | Decision |
|---|----------|---------|----------|
| 1 | **Notion vs. built-in capture** | Flow's own idea capture vs. Notion sync as source of truth | TBD |
| 2 | **Planning cadence** | Weekly plans only vs. also "generate one post now" quick mode | TBD |
| 3 | **Performance tracking MVP** | Manual tagging (1-5) vs. CSV import from day one | TBD |
| 4 | **Play library scope** | Start with 5-6 plays vs. more variety at launch | TBD |

---

## Infrastructure Backlog

> Technical debt and foundational improvements

| Priority | Item | Notes | Status |
|----------|------|-------|--------|
| P1 | Add testing framework | Jest or Vitest | 🔲 |
| P1 | Add ESLint + Prettier | Code quality | 🔲 |
| P1 | Persist pillars/executions | Currently only settings saved to LocalStorage | 🔲 |
| P2 | API key management UI | Secure input instead of env var | 🔲 |
| P2 | Undo/Redo system | Editor history management | 🔲 |
| P3 | Advanced search | Regex, date filters | 🔲 |
| P3 | Pillar archiving UI | Status exists, no UI | 🔲 |
| P3 | Manual theme editing | Currently AI-assigned only | 🔲 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.0.0 | 2025-11-22 | Initial MVP - 3-pane architecture, Gemini integration, keyboard navigation |
