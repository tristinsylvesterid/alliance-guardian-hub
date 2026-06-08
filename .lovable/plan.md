## Problem

The Settings page's Rank Thresholds card says "currently 78 max", but actual rank percent uses metrics + per-week event point weights (status events use `point_weight`; the AvA rank event uses the AvA bracket max). So the displayed max underrepresents the real weekly ceiling.

## Fix

In `src/routes/settings.tsx`:

1. Pull `eventTypes` from `useEventTypes()` (already imported) and reuse `metrics` from `useScoringConfig()`.
2. Compute `eventMax` the same way `calculateEventPoints` does, but assuming all events active (this card represents the maximum possible week):
   - For each `eventType`: if `inputType === "rank"`, add the AvA metric's `maxPoints` (look up via `metrics.find(m => m.key === "ava")`, fallback 0); otherwise add `pointWeight`.
3. Display `Total possible: {maxTotal + eventMax} points` on the Scoring Brackets card and `currently {maxTotal + eventMax} max` on the Rank Thresholds card description. Keep the bracket-only `maxTotal` for the per-metric table header math (no change needed there since it isn't shown).

No changes to scoring logic, DB, or other pages — purely a display correction in `settings.tsx`.
