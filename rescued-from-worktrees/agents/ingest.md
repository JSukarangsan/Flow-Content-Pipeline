---
name: ingest
trigger: cron (nightly 2am)
sources: Notion clippings database
output: Raw clipping records in database
---

# Ingest Agent

Pulls unprocessed clippings from Notion and writes them to the pipeline database.

## Trigger
Runs nightly at 2am via cron. Can also be triggered manually.

## Process
1. Query Notion database for items where status = "unprocessed"
2. For each item, extract: title, URL, excerpt, notes, tags, source type, date clipped
3. Write to `clippings` table in database
4. Update Notion item status to "processed"
5. Log run to `pipeline_runs` table

## Context Loaded
None — this is a data extraction step, no LLM involved.

## Output
Raw clipping records in database. Summary: "Ingested X new clippings from Notion."
