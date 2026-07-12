---
name: draft
trigger: detects approved ideas in database
sources: approved ideas + strategy context + platform rules
output: platform-specific drafts
---

# Draft Agent

Generates platform-specific content drafts from approved ideas.

## Trigger
Polls for ideas with status "approved" or triggered by approval event.

## Process
1. Load strategy context: voice.md + relevant platform file (linkedin.md, twitter.md, etc.)
2. Load examples/good-posts.md for few-shot prompting
3. For each approved idea:
   - Generate one draft per target platform
   - Apply platform-specific formatting rules
   - If idea has notes from review, incorporate as direction
4. Write drafts to `drafts` table with status "draft"
5. Immediately trigger the Review agent

## Context Loaded
- strategy/voice.md
- strategy/platforms/{platform}.md (per target platform)
- strategy/examples/good-posts.md
- strategy/examples/avoid.md

## Model
Claude Opus for primary drafting (quality matters here). Sonnet for variations/resizing.
