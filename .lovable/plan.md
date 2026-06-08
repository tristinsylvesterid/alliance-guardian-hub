## Problem

The Rankings page (and every other score readout) is using **two different scoring sources**:

- The per-metric breakdown chips (`8/10`, `6/8`, `9/9`…) come from `useScoringConfig()` — the live, edited brackets in the DB. These add up to ~69/78.
- The big total (`50/106`) and the rank (`R1`) come from `calculateTotalScore()` in `src/lib/scoring.ts`, which iterates the **hardcoded** `METRIC_DEFINITIONS` (old 3/3/3/2/3/3/3/3 caps). So it caps each metric at the old max and discards points the user can clearly see in the chips.

Result: total is wrong (50 instead of ~69), and rank is wrong because the percent is computed off the truncated total. The 106 max comes out right only because Rankings already adds `eventMaxThisWeek` to the live `BASE_MAX_POINTS` from `useScoringConfig`.

The same bug affects every page that calls `calculateTotalScore`: Dashboard, Members, At-Risk, Events, Analytics, Rank Changes, Event Archive, Archive, metrics-history snapshots, and the at-risk library.

## Fix

1. **`src/lib/scoring.ts`** — change `calculateTotalScore(metrics, defs?)` to accept a `MetricDefinition[]` and iterate that instead of the hardcoded constant. Default to `METRIC_DEFINITIONS` so older callers still compile, but every UI caller will pass live defs.

2. **Update every caller to pass live metric definitions** from `useScoringConfig()`:
   - `src/routes/rankings.tsx`, `members.tsx`, `index.tsx`, `at-risk.tsx`, `events.tsx`, `analytics.tsx`, `rank-changes.tsx`, `event-archive.tsx`, `archive.tsx` — read `metrics` from the hook (most already do) and pass it into `calculateTotalScore(m.metrics, metrics)`.
   - `src/lib/metrics-history.ts` — `snapshotAllMembers` already receives `maxTotal`; add a `metricDefs` parameter and forward it to `calculateTotalScore`. Update the one call site in `src/routes/settings.tsx` to pass `metrics` from `useScoringConfig()`.
   - `src/lib/at-risk.ts` — same: accept `metricDefs` and pass through. Update its call sites accordingly.

3. **No DB changes, no bracket logic changes** — bracket evaluation in `calculateMetricPoints` is already correct; only the summing loop was stuck on the old caps.

## Verification

After the change, the screenshot members should show ~69/106 (chips sum) and re-rank to R2 (≈65%) under the current thresholds, matching what the per-metric chips already display.
