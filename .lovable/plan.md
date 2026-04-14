

# Add Editable Rank Thresholds to Settings

## What Changes

Store the rank thresholds (R1 max, R2 min/max, R3 min) in a new `rank_thresholds` database table so they can be edited from the Settings page. Currently these are hardcoded as `R1 ≤14`, `R2 15-25`, `R3 26+` in `scoring.ts`.

## Implementation

### 1. Database table (migration)
Create a simple `rank_thresholds` table with one row per rank (R1, R2, R3). R4/R5 are leadership overrides and don't need thresholds.

```sql
CREATE TABLE public.rank_thresholds (
  rank_key text PRIMARY KEY,
  min_points integer NOT NULL,
  max_points integer -- NULL means no upper bound
);
INSERT INTO rank_thresholds VALUES ('R1', 0, 14), ('R2', 15, 25), ('R3', 26, NULL);
```
With RLS: authenticated can read, admins can modify.

### 2. New hook: `use-rank-thresholds.ts`
Fetches the 3 rows, exposes `thresholds` and an `updateThreshold(rankKey, minPoints, maxPoints)` function.

### 3. Update `getRank` usage across the app
Currently `getRank` is hardcoded. Two options:
- **Option A**: Make `getRank` accept thresholds as a parameter, and pass them from the hook wherever it's called (6 files).
- **Option B**: Create a shared hook/context that provides a `getRankForScore` function using the DB thresholds.

I'll go with **Option A** — it's simpler and avoids adding a new context provider. The `getRank` signature becomes:
```typescript
getRank(score, leadershipRank?, thresholds?)
```
With a fallback to the current hardcoded values if thresholds aren't provided.

### 4. Settings page UI
Add a "Rank Thresholds" card below the Scoring Brackets card with 3 inline rows showing R1/R2/R3 and their min/max point fields, editable in place.

### 5. Update Rankings page threshold display
The Rankings page shows a static "Rank Thresholds" card — update it to use the DB values instead of hardcoded text.

## Files Changed
| File | Change |
|------|--------|
| Migration | New `rank_thresholds` table + seed data + RLS |
| `src/hooks/use-rank-thresholds.ts` | New hook |
| `src/lib/scoring.ts` | `getRank` accepts optional thresholds param |
| `src/routes/settings.tsx` | Add threshold editor card |
| `src/routes/rankings.tsx` | Use DB thresholds |
| `src/routes/index.tsx` | Pass thresholds to `getRank` |
| `src/routes/members.tsx` | Pass thresholds to `getRank` |
| `src/routes/events.tsx` | Pass thresholds to `getRank` |
| `src/routes/event-archive.tsx` | Pass thresholds to `getRank` |
| `src/routes/archive.tsx` | Pass thresholds to `getRank` |

