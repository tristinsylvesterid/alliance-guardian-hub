

# SvS Planning Page Fixes

## Changes

### 1. Auto-date plan label to next Saturday
When creating a new plan, calculate the next upcoming Saturday and use that as the label instead of today's date.

**File:** `src/hooks/use-svs-plans.ts` — update `createPlan` to compute next Saturday date for the label.

### 2. Add "Didn't Answer" poll option
Add `"didnt_answer"` to the `PollResponse` type and add it as a dropdown option in the poll column.

**Files:**
- `src/hooks/use-svs-plans.ts` — extend `PollResponse` type to include `"didnt_answer"`
- `src/routes/svs-planning.tsx` — add "Didn't Answer" `<SelectItem>` in the poll dropdown, style it with a yellow/amber color

### 3. Add "Has T10s" checkbox column
Add a boolean `has_t10s` column to the database and display it as a checkbox in the table.

**Migration:** `ALTER TABLE public.svs_plan_entries ADD COLUMN has_t10s boolean NOT NULL DEFAULT false;`

**Files:**
- `src/hooks/use-svs-plans.ts` — add `hasT10s` to `SvsMemberEntry`, map to/from `has_t10s` in DB reads/writes
- `src/routes/svs-planning.tsx` — add a "T10s" column with a Checkbox component

### 4. Default team to Team 4
Change the default team from `"team1"` to `"team4"` when creating new plan entries.

**Files:**
- `src/hooks/use-svs-plans.ts` — change `team: "team1"` to `team: "team4"` in `createPlan`

**Migration:** Also update the column default: `ALTER TABLE public.svs_plan_entries ALTER COLUMN team SET DEFAULT 'team4';`

