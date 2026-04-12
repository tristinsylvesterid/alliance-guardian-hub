

# Fix Scoring Brackets + Add Helper Text to Member Form

## Changes

### 1. Fix bracket boundaries in database
Update `scoring_config` rows to close gaps for metrics that allow decimals. Only 4 metrics need decimal-aware boundaries: Tech Power, Vehicle Power, Kill Count, and PC Heroes. The rest (HQ Level, Rally Cap, Alliance Recognition, AvA) use whole integers and their brackets are already correct for integer values.

**Data updates via insert tool:**

| Metric | Issue | Fix |
|--------|-------|-----|
| PC Heroes | ">50" has min:51, misses 50.01-50.99 | min→50.01, "<30" max→29.99, "30-39" max→39.99 |
| Tech Power | ">15M" has min:15, ambiguous boundary with "12-15M" | Already uses 14.99 — fine. Just ensure ">15M" min stays 15.01 to not double-count 15.00. Actually min:15 with max:14.99 means 15.00 matches ">15M" ✓. Leave as-is. |
| Vehicle Power | Same pattern — already uses .99 boundaries ✓ | No change needed |
| Kill Count | Already uses .49/.99 boundaries ✓ | No change needed |

Only **PC Heroes** actually has the gap bug. The "M" metrics already have proper decimal boundaries.

**SQL updates:**
```sql
UPDATE scoring_config SET brackets = '[
  {"label":">50","points":3,"min":50.01},
  {"label":"40-50","points":2,"min":40,"max":50},
  {"label":"30-39","points":1,"min":30,"max":39.99},
  {"label":"<30","points":0,"max":29.99}
]'::jsonb WHERE key = 'pcHeroes';
```

### 2. Add helper text and correct `step` per metric in MemberFormDialog

Add a `METRIC_HELPERS` map with description text for each metric, and set the correct `step` attribute:

| Metric | step | Helper text |
|--------|------|-------------|
| HQ Level | 1 | "Your headquarters level (whole number)" |
| Troops | n/a (dropdown) | — |
| Rally Cap | 1 | "Max rally capacity level (whole number)" |
| Alliance Recognition | 1 | "Research completion percentage, 0-100 (no decimals)" |
| AvA Weekly Score | 1 | "Your weekly rank position, 1 = best (whole number)" |
| PC Heroes | 0.01 | "Number of PC heroes, e.g. 50.5" |
| Tech Power | 0.01 | "In millions, e.g. 14.5" |
| Vehicle Power | 0.01 | "In millions, e.g. 7.2" |
| Kill Count | 0.01 | "In millions, e.g. 1.5" |
| SvS Participation | n/a (toggle) | — |
| Engagement | n/a (toggle) | — |

Render helper text as a small muted paragraph below each input.

### 3. Update hardcoded METRIC_DEFINITIONS in scoring.ts
Fix the PC Heroes brackets in the hardcoded fallback to match the DB fix.

## Implementation Steps

| Step | What |
|------|------|
| 1 | **Data update** (insert tool): Fix PC Heroes bracket boundaries |
| 2 | **`src/lib/scoring.ts`**: Fix PC Heroes brackets in hardcoded definitions |
| 3 | **`src/components/MemberFormDialog.tsx`**: Add helper text map, set per-metric `step` values, render descriptions below inputs |

