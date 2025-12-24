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

#### V1.1 Play Library (3 Plays)

| Play Name | Trigger | Inputs | Outputs |
|-----------|---------|--------|---------|
| **Pillar & Satellite** | Long-form blog/article | 1 pillar post | 5-7 LinkedIn posts, 3-5 tweet threads, 1 newsletter section |
| **Case Study Atomizer** | Client win / project completion | Case study details | Metrics post, lessons learned post, "how we did it" thread, testimonial ask template |
| **Question Flip** | FAQ you keep answering | Common question | Direct answer post, contrarian angle, "unpopular opinion" version |

#### Future Plays (V2+)

| Play Name | Trigger | Inputs | Outputs |
|-----------|---------|--------|---------|
| Controversy Cascade | Hot take / contrarian opinion | 1 spicy opinion | Initial post → defense post → nuance post → "what I learned" post → newsletter deep-dive |
| Reverse Engineer | Competitor or industry content | URL or paste | Your contrarian take, "yes and" expansion, application to your niche |
| Weekly Recap | Week's activities/learnings | Quick bullet notes | "5 things I learned" post, thread version, newsletter intro |

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
│  LAYER 2: EXTERNAL INPUTS (via MCP)                        │
│  - Notion database (saved articles, research, ideas)       │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: PERFORMANCE SIGNALS                              │
│  - CSV import from LinkedIn analytics                      │
│  - CSV import from Kit (newsletter) analytics              │
└─────────────────────────────────────────────────────────────┘
```

#### Performance Tracking (CSV Import)

**Supported Platforms:**

| Platform | Export Source | Key Metrics |
|----------|---------------|-------------|
| **LinkedIn** | Analytics → Export | Impressions, reactions, comments, shares, CTR |
| **Kit** (newsletter) | Broadcasts → Export | Opens, clicks, unsubscribes, click rate |

**How it works:**

1. User exports CSV from LinkedIn or Kit dashboard
2. Flow parses CSV and matches posts to Executions by date/content
3. `performance_score` field auto-populated on Executions
4. Strategy Copilot uses scores to weight recommendations

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

#### Data Sources Integration (Notion via MCP)

**Why MCP:**
- No custom OAuth integration needed
- User configures Notion MCP server with their API key
- Flow queries databases via MCP protocol
- Clean separation of concerns

**Notion Database Schema:**

| Field | Type | Purpose |
|-------|------|---------|
| Title | Text | Article/idea name |
| URL | URL | Source link |
| Notes | Text | Quick thoughts |
| Tags | Multi-select | Topic categories (maps to Pillars) |
| Status | Select | `unprocessed` / `used` / `archived` |

**Flow Integration:**
1. User connects Notion MCP server in settings
2. Selects which database to sync
3. Copilot queries for `status = unprocessed` items
4. After using an idea, Flow updates status to `used`

---

## Decisions Made

> Resolved before implementation

| # | Question | Decision |
|---|----------|----------|
| 1 | **Notion vs. built-in capture** | ✅ **Notion via MCP** — No built-in capture, Notion is the source of truth |
| 2 | **Planning cadence** | ✅ **Weekly plans only** — Plays handle ad-hoc generation |
| 3 | **Performance tracking MVP** | ✅ **CSV import** — LinkedIn + Kit (newsletter) from day one |
| 4 | **Play library scope** | ✅ **3 plays** — Pillar & Satellite, Case Study Atomizer, Question Flip |

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
