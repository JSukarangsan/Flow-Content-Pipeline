---
name: ideate
trigger: runs after ingest completes
sources: clippings table + strategy context
output: 1-3 content ideas per clipping
---

# Ideate Agent

Takes each new clipping and generates strategy-aligned content ideas.

## Trigger
Runs automatically after ingest completes. Can also be triggered manually on specific clippings.

## Process
1. Load strategy context: pillars.md, audience.md, themes.md, voice.md
2. For each unprocessed clipping:
   - Send to Claude with strategy context as system prompt
   - Generate 1-3 content ideas, each with: angle, hook, target platform(s), pillar alignment
3. Write ideas to `ideas` table with status "pending"
4. Send Telegram summary: "X new clippings → Y ideas generated. Ready for review."

## Context Loaded
- strategy/pillars.md
- strategy/audience.md
- strategy/themes.md
- strategy/voice.md

## Model
Claude Sonnet (speed/cost optimization — ideation doesn't need Opus quality)
