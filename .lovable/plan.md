## Why switch

Today thresholds are absolute points (`R3 ≥ 26`, `R2 ≥ 15`, `R1 < 15`) against a fixed `MAX_TOTAL_POINTS` (~31). But the effective weekly max already shifts:
- An optional/SvS event toggled off removes its `maxPoints` from what's earnable that week.
- Adding/removing metrics in scoring config changes the total.

With absolute thresholds, a quiet week silently makes R3 harder to reach; an event-heavy week makes it easier. Percentages keep the bar consistent regardless of what's active.

Your proposal — **R3 ≥ 85%, R2 ≥ 50%, R1 < 50%** — is the right shape. R4/R5 stay leadership-only overrides (unchanged).

## Plan

### 1. Schema — switch thresholds to percentages
Migration on `rank_thresholds`:
- Add `min_percent NUMERIC(5,2)` and `max_percent NUMERIC(5,2)` (nullable).
- Backfill existing rows from the current `min_points` / `max_points` against `MAX_TOTAL_POINTS` (31), then seed the defaults: R1 = 0–49.99, R2 = 50–84.99, R3 = 85–100.
- Keep the old `min_points` / `max_points` columns for now (drop in a follow-up migration once the UI is migrated) to avoid breaking anything mid-deploy.

### 2. Scoring logic — `src/lib/scoring.ts`
- `getRank(totalScore, leadership, thresholds, maxPoints)` — add a `maxPoints` arg (the effective weekly max). Compare `(totalScore / maxPoints) * 100` against `minPercent`.
- Add `getEffectiveMaxPoints(activeMetricKeys)` that sums `maxPoints` for only the metrics currently in play (so toggled-off events don't count).

### 3. Hook — `src/hooks/use-rank-thresholds.ts`
- `RankThreshold` becomes `{ rankKey, minPercent, maxPercent }`.
- `updateThreshold(rankKey, minPercent, maxPercent)` writes to the new columns.
- Defaults: `R1 0–49.99`, `R2 50–84.99`, `R3 85–100`.

### 4. Effective max wiring
Where `getRank` is called (rankings page, members page, events page), pass the effective max:
- Default to summing all `METRIC_DEFINITIONS[*].maxPoints` (current behavior).
- Optionally, on the Events page where we know which events are active that week, pass the week-specific max so the displayed rank reflects this week's reality.

For consistency across the app I'd start by always using the full-config max (so a member's rank is stable across pages), and only show the "this week %" on the Events roster as a secondary display. Calling out as an open decision below.

### 5. Settings UI — `src/routes/settings.tsx` (rank thresholds editor)
- Replace point inputs with percent inputs (0–100, two decimals).
- Show a live preview: "R3 ≥ 85% (≥ 26.4 / 31 pts at current config)".

### 6. Members / Rankings / Badge displays
- Display "Score: 22 / 31 (71%)" instead of just "22 pts" so the percent is visible.
- No change to `RankBadge` itself.

## Open decisions for you

1. **Rank source of truth across pages** — should a member's rank everywhere be (a) their overall score % against the full config max, or (b) recomputed per week using only that week's active events? (a) is simpler and consistent; (b) is more "accurate this week" but means the same member shows different ranks on Events vs Members. I'd lean (a).
2. **Exact thresholds** — confirming R3 ≥ 85, R2 50–84.99, R1 < 50? Or do you want different cutoffs?
3. **Keep absolute as a fallback option, or fully replace?** I'd fully replace — having both modes adds confusion.

## Files changed
- `supabase/migrations/...` (add percent columns + backfill + seed)
- `src/hooks/use-rank-thresholds.ts`
- `src/lib/scoring.ts`
- `src/routes/settings.tsx` (threshold editor)
- `src/routes/rankings.tsx`, `src/routes/members.tsx`, `src/routes/events.tsx` (display + call sites)
