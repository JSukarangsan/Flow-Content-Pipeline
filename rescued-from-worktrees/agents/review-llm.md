---
name: review-llm
trigger: runs immediately after draft agent
sources: draft + strategy context + platform constraints
output: revised draft + review notes
---

# LLM Review Agent

A separate "reviewer" pass that checks drafts for voice consistency, formatting, and quality.

## Trigger
Runs automatically after each draft is generated.

## Process
1. Load strategy context: voice.md, platform rules, examples/avoid.md
2. For each draft with status "draft":
   - Check voice consistency against writing samples
   - Verify platform formatting rules (character limits, structure)
   - Assess: clarity, hook strength, CTA presence, pillar alignment
   - Generate revised version + review notes
3. Update draft in database: status → "reviewed", attach review notes

## Context Loaded
- strategy/voice.md
- strategy/platforms/{platform}.md
- strategy/examples/avoid.md
- strategy/examples/good-posts.md (for comparison)

## Model
Claude Sonnet (reviewer role — fast, focused, editorial)
