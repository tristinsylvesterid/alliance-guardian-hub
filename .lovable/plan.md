

# Plan: Connect to Lovable Cloud for Persistent Data Storage

## The Problem

Right now, all your data (members, events, SvS plans, scores) lives in JavaScript memory — it resets every time you refresh the page. To actually use the app, we need a real database.

## The Solution

We'll enable **Lovable Cloud** (built-in Supabase database) and migrate all your in-memory data stores to persistent database tables.

## Database Tables to Create

1. **members** — player profiles (name, leadership rank, metrics JSON, location coords)
2. **event_types** — tracked event categories (AvA, SvS, Canyon Clash, custom ones)
3. **weekly_events** — week definitions (week start date, SVS active toggle)
4. **event_attendance** — per-member, per-week, per-event attendance status
5. **archived_members** — archived player records with reason and timestamp
6. **scoring_config** — metric definitions and bracket configurations
7. **svs_plans** — SvS plan metadata (mode, opponent, week, result, capital %, notes)
8. **svs_plan_entries** — per-member SvS plan data (power, poll response, team, role, location)

## Implementation Steps

1. **Enable Lovable Cloud** — set up the Supabase database connection
2. **Create migration** — define all 8 tables with proper types and foreign keys
3. **Seed default data** — insert the default scoring metrics, event types, and brackets
4. **Rewrite hooks** — replace every in-memory hook (`use-members`, `use-weekly-events`, `use-svs-plans`, `use-event-types`, `use-scoring-config`, `use-archived-members`) to read/write from the database using the Supabase client
5. **Update components** — adjust any components that rely on the old data shape if needed
6. **Add RLS policies** — since this is a shared officer tool (no individual user auth yet), we'll start with open policies and can lock it down with auth later

## What You'll Get

- Data persists across page refreshes and sessions
- Multiple officers can access the same data simultaneously
- All members, events, plans, and scores stored permanently

## Important Note

This is a significant refactor touching most hooks and several routes. We should do it in stages — tables + hooks first, then verify everything works before adding auth.

