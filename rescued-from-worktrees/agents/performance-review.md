---
name: performance-review
trigger: weekly cron (Monday 8am)
sources: Typefully analytics, Kit open rates
output: performance summary + strategy feedback
---

# Performance Review Agent

Weekly automated pull of content performance data. Feeds back into strategy context.

## Trigger
Runs weekly on Monday mornings.

## Process
1. Pull analytics from Typefully (LinkedIn + X post performance)
2. Pull open rates and click data from Kit (newsletter)
3. Analyze: which pillars performed best, which hooks worked, which platforms over/underperformed
4. Generate performance summary
5. Send via Telegram: "Weekly content performance: X posts published, best performer was [title] on [platform]. Pillar breakdown: [stats]."
6. Optionally update strategy/themes.md with emerging patterns

## Context Loaded
- strategy/pillars.md (to map performance back to pillars)
- Last 4 weeks of performance data (from database)

## Model
Claude Sonnet
