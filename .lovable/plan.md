## Goal

Replace the current week's "Zero weekly participation" flag on the Members at Risk page with a **"Low overall participation"** flag based on a rolling 4-week average of event attendance.

## Behavior

- For each non-officer member, look at the **last 4 weeks** of attendance data (most recent first), using whichever of those weeks exist — current active week + most recent archived weeks, capped at 4.
- For each included week, count:
  - `opportunities` = number of attendance-tracked events that were active that week (same definition as today's `activeEventCount`)
  - `attended` = number of those events the member was marked `check` for
- Sum across the included weeks and compute `participationRate = attended / opportunities` (skip the flag entirely if `opportunities === 0` across all 4 weeks).
- Flag thresholds:
  - `< 25%` → **high** severity, label "Low overall participation", detail e.g. `3 / 16 (19%) last 4 wks`
  - `25% – 49%` → **medium** severity, same label, same detail format
  - `≥ 50%` → no flag
- Remove the existing `zero_participation` flag (the new one supersedes it; a member with 0/16 will land in the high tier).
- Keep all other flags (Alliance Recognition, AvA, Missed SvS, Low score, Low troops, Low HQ) unchanged.

## Technical Notes

- `src/lib/at-risk.ts`
  - Remove `zero_participation` from `RISK_INDICATORS` and from `evaluateMemberRisk`.
  - Add `low_overall_participation` to `RISK_INDICATORS`.
  - Extend `WeekContext` with `rollingOpportunities: number` and `rollingAttended: number` (replacing the single-week `activeEventCount` / `attendedEventCount` usage for the participation flag — those fields can stay for any future use but are no longer read for participation).
  - Add the new flag logic with the thresholds above.
- `src/routes/at-risk.tsx`
  - Build the rolling window: `[activeWeeks[0], ...archivedWeeks].slice(0, 4)` (filter out undefined).
  - For each member, iterate the window and sum opportunities/attended using existing `isEventActive(weekId, key)` and `getStatus(weekId, memberId, key)` from `useWeeklyEvents`.
  - Pass the totals into `evaluateMemberRisk` via the extended context.
  - Keep the per-row "attended / totalOpps" display tied to the current week as it is today (table column unchanged), since that summary is about this week, not the rolling window — the rolling detail lives inside the flag chip.

## Out of Scope

- No changes to SvS / AvA / score / troops / HQ flags.
- No changes to how weeks are archived or how attendance is stored.
- No new DB queries — all data is already loaded by `useWeeklyEvents`.