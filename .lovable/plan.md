## Problem

The "Max Pts" column on Settings → Scoring Brackets stores `max_points` in the database as a separate value from the bracket list. When you edit a bracket's point value, `max_points` is not recalculated, so the column (and the "Total possible" sum) shows stale numbers.

Example from your screenshot: Troops shows Max Pts = 6, but its highest bracket is "T10 Complete: 10pts" — so it should be 10. Total possible should be higher than 46.

## Fix

Make `max_points` always derived from the brackets, recalculated automatically whenever brackets are added, edited, or removed.

### Changes

1. **`src/hooks/use-scoring-config.ts`**
   - In `updateBracket`, `addBracket`, and `removeBracket`: after computing the new bracket array, also compute `max_points = Math.max(...newBrackets.map(b => b.points), 0)` and write both fields in the same `update()` call.
   - Keep `recalcMaxPoints` for a one-time backfill of existing rows.

2. **`src/routes/settings.tsx`** (one-time backfill on load)
   - After metrics load, for each metric where stored `max_points !== Math.max(brackets.points)`, call `recalcMaxPoints(key)` once. This corrects rows that are already stale without requiring the user to re-edit them.

No schema changes, no UI changes — `metrics[i].maxPoints` and `maxTotal` will simply reflect the bracket data correctly.
