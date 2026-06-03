## Problem

The Tracked Events row for AvA shows the hint "Bracket-scored (edit above)", but the AvA bracket table is hardcoded in `src/lib/scoring.ts` (`AVA_METRIC`) and never appears in the Scoring Brackets card above. There is no actual edit UI.

## Fix

Surface AvA in the existing Scoring Brackets table so it uses the same editor as every other metric.

### Steps

1. **Migration** — insert a row into `scoring_config` for AvA:
   - `key='avaWeeklyScore'`, `name='AvA Weekly Score'`, `type='rank'`, `unit='rank'`, `max_points=4`, `sort_order=99`
   - `brackets`: the four current AVA_METRIC brackets (Top 30 = 4, 31–50 = 3, 51–70 = 1, 71+ = 0)
   - Guarded with `ON CONFLICT (key) DO NOTHING` so re-running is safe.

2. **`src/lib/scoring.ts`** — update `calculateEventPoints` to accept an optional `avaMetric: MetricDefinition` override (falls back to the hardcoded `AVA_METRIC` if not provided). Keep `AVA_METRIC` exported as the default.

3. **`src/hooks/use-event-scoring.ts`** (and any other caller of `calculateEventPoints`) — pass the AvA metric from `useScoringConfig().metrics` when available, so edits in Settings flow into per-week event scoring and rankings.

4. **`src/routes/settings.tsx`** — no UI change needed; once AvA is in `scoring_config`, it appears in the Scoring Brackets table and reuses the existing "Edit Brackets" dialog. The "Bracket-scored (edit above)" hint becomes accurate.

### Out of scope

- No change to ranking thresholds, at-risk flags, or the Tracked Events UI.
- No schema change beyond the single seed insert.
