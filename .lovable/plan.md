## Problem

New members show no rank because every ranking surface (Rankings, Dashboard, Members, At-Risk) reads from the **last archived week's snapshot**. A member added after the most recent archive has no snapshot row, so they fall back to R1 / "No snapshot" until the next week is archived.

## Fix

Give new (and any un-snapshotted) members an **interim rank** computed live from a fixed subset of their current metrics, compared against that subset's maximum possible points.

### Scoring subset (interim rank only)

Only these 7 metrics count toward the interim rank:

- HQ Level
- Rally Cap
- Tech Power
- PC Heroes (Hero)
- Vehicle Power
- Alliance Recognition Research
- Kill Count

Sum = `subsetEarned`. Max = sum of each metric's `maxPoints` from `METRIC_DEFINITIONS` for those 7 keys = `subsetMax`. Rank is resolved via existing `getRank(subsetEarned, leadershipRank, thresholds, subsetMax)` so the same percent thresholds (R1/R2/R3) and leadership overrides (R4/R5) apply.

### Where it applies

In every place that currently reads `latestByMember[m.id]`:

- `src/routes/rankings.tsx`
- `src/routes/members.tsx`
- `src/routes/at-risk.tsx`
- `src/routes/index.tsx` (dashboard)

If a member **has** an archived snapshot → keep current behavior (snapshot wins).
If a member has **no** snapshot → compute interim rank/score from the 7-metric subset and display it. Mark these rows with an "Interim" badge (replaces today's "No snapshot" label) so officers can tell archived vs live data apart. Sorting on Rankings uses the interim score (out of `subsetMax`) alongside snapshot scores — the score-out-of-max ordering already normalizes that.

### Files touched

- `src/lib/scoring.ts` — add `INTERIM_METRIC_KEYS` constant + `calculateInterimScore(metrics, defs)` returning `{ earned, max }`.
- `src/routes/rankings.tsx`, `src/routes/members.tsx`, `src/routes/at-risk.tsx`, `src/routes/index.tsx` — when no snapshot, compute interim score and rank instead of defaulting to 0 / R1. Show "Interim" tag.

### Out of scope

- No DB migration, no auto-snapshot on member create (interim is purely a display fallback; next weekly archive will replace it with a real snapshot).
- No change to archiving logic or the full 11-metric scoring used for archived weeks.
- No change to Rank Changes page (it intentionally compares two archived weeks).
