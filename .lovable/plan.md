# Fix: Member form uses stale scoring brackets

## Problem
`MemberFormDialog` reads metrics from the hardcoded `METRIC_DEFINITIONS` in `src/lib/scoring.ts`. Bracket edits live in the database (`scoring_config`) and never reach the dialog, so "X pts max" labels and the Troops tier options show the original defaults instead of the user's updated brackets.

## Fix
Switch the dialog to the live config via `useScoringConfig()`.

### `src/components/MemberFormDialog.tsx`
- Drop `import { METRIC_DEFINITIONS } from "@/lib/scoring"`.
- Add `import { useScoringConfig } from "@/hooks/use-scoring-config"` and read `const { metrics: metricDefs } = useScoringConfig();`.
- Replace all `METRIC_DEFINITIONS` usages with `metricDefs`:
  - `getDefaultMetrics()` → turn into an in-component helper that takes `metricDefs` (or compute inline in an effect).
  - The `METRIC_DEFINITIONS.map(...)` render loop → `metricDefs.map(...)`.
- For tier metrics (Troops), `SelectItem` already maps `def.brackets` — once `metricDefs` is live, the dropdown reflects current bracket labels/points.
- Keep `METRIC_HELPERS` lookup by `def.key` untouched.

No DB or schema changes. No other components affected.
