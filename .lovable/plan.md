# Analytics Page Plan (v3)

A new `/analytics` route to track member and alliance performance over time, plus a `member_metrics_history` table so member progression becomes a real time series. CSV export from every section.

## What we already have
- `event_attendance` — weekly per-member event status (check/x/na, AvA rank in `value`)
- `weekly_events` — chronological week list
- `members.metrics` — **current** snapshot only
- `scoring_config`, `rank_thresholds`, `poll_responses`, `member_name_history`

## Schema change: `member_metrics_history`

Columns: `id`, `member_id`, `metrics` (jsonb), `power` (numeric), `leadership_rank` (text), `total_score` (int), `rank` (text R1–R5), `recorded_at` (timestamptz default now()), `recorded_date` (date, generated/derived), `week_id` (nullable text), `source` (text: 'manual' | 'auto_weekly' | 'baseline' | 'edit').

**Dedupe rule:** unique `(member_id, recorded_date)` — only the **latest** snapshot for a given member/day is kept.
- Implementation: `INSERT ... ON CONFLICT (member_id, recorded_date) DO UPDATE SET …` on every write
- Indexes: `(member_id, recorded_at desc)`, `(week_id)`
- RLS: read = authenticated; write = officer/admin. GRANT to authenticated + service_role.

## Snapshot triggers (when history rows are written)

1. **Baseline on new member creation** — `saveMember` (insert path) writes a history row with `source='baseline'`. Guarantees every member has a starting point the moment they're added.
2. **On any metric edit** — `saveMember` (update path) + `updateMemberMetrics` upsert a row with `source='edit'`. Dedupe-per-day means rapid edits collapse into one row.
3. **On `startNewWeek`** — snapshot all current members with `source='auto_weekly'` and `week_id`. Gives a reliable weekly cadence even if no edits happened.
4. **One-time backfill button (Settings → "Seed Analytics Baseline")** — for the current roster, upserts a `source='baseline'` row dated today for every member. User runs this **once** when they're done entering initial info. Idempotent (dedupe key handles re-runs).

## Page layout

### Top: Average Stat Cards (NEW per user request)
Grid of compact KPI cards — one per scored metric — each showing the alliance **average** of that stat right now, plus a small trend delta vs the same metric 4 weeks ago (from history). Cards:
- HQ Level (avg)
- Troop Tier (modal: most common tier, e.g. "T9")
- Rally Cap (avg)
- Alliance Recognition % (avg)
- AvA Weekly Rank (avg, lower=better)
- PC Heroes (avg)
- Tech Power (avg, M)
- Vehicle Power (avg, M)
- Kill Count (avg, M)
- Total Power (avg + sum)
- Avg Total Score / Max
Each card: big number, label, trend arrow (▲▼ with % vs 4w ago), uses gold/rank theme tokens.

### 1. Alliance Overview strip
Active members, % R3+, avg 4-week attendance, total combat power. **[Export CSV]**

### 2. Attendance Over Time (line chart)
Line per event (Ice Pit 1/2/3, Glory War, Capital, SvS, AvA), Y = attendance %. Toggles. **[Export CSV]**

### 3. Member Progression Over Time (from history)
- Avg HQ level, avg power, total kill count, avg tech/vehicle power per week
- Stacked area: rank distribution per week
- Troop tier distribution over time
**[Export CSV]**

### 4. AvA Performance
Avg AvA rank per week + stacked bars of top30/31–50/51–70/71+. **[Export CSV]**

### 5. Event Participation Heatmap
Events × last 12 weeks, color = attendance %. **[Export CSV]**

### 6. Leaderboards (tabs)
Most consistent · Most improved · At risk · Top contributors. **[Export CSV per tab]**

### 7. Per-Member Drilldown
Searchable selector showing attendance timeline, AvA trend, score/power/HQ/kill count over time, current breakdown vs alliance avg, name history. **[Export this member's full history]**

### 8. Filters
Date range (4/8/12/26 weeks/all), rank, event subset.

## CSV Export
Shared `src/lib/csv.ts`: `exportCsv(filename, rows, columns)` with proper escaping, UTF-8 BOM. Triggered by `<Button variant="outline" size="sm"><Download/></Button>` on each card. Filename: `{section}_{YYYY-MM-DD}.csv`.

## Technical notes
- New route `src/routes/analytics.tsx` + sidebar link in `AppLayout`
- Recharts (already in shadcn `chart.tsx`); theme tokens for colors
- New hooks: `useMetricsHistory()`, `useAnalytics(weeks, members, history)` — memoized
- Modify `useMembers.saveMember` and `updateMemberMetrics` to upsert history rows
- Modify `useWeeklyEvents.startNewWeek` to snapshot all members
- New Settings button → seed baseline for all current members (idempotent via dedupe key)
- ~100 members × 26 weeks ≈ 2.6k history rows + ~18k attendance rows — fine client-side

## Open questions
1. For Top Stat Cards, OK to compute trend delta as "now vs nearest history row ≥28 days ago" (graceful when not enough history exists yet)?
2. Should the "Seed Analytics Baseline" button be officer-only or admin-only?
