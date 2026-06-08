## Problem

Rankings page shows Khaleesi as **50/106**. The `/106` correctly includes ~28 points of event max (Jun 1–7 has SVS+AvA+Ice Pit 1/2+Glory War+Canyon Clash+Engagement active = 28 max). She has `status='check'` rows for all of them plus AvA rank value 8 (top 30 → 8 pts under the live bracket), so her earned event total should be ~28, making the displayed score ~78/106. Instead the earned portion is being dropped.

Both the earned total and max come from the same `useEventScoring` hook, but only `eventMaxThisWeek` flows through. That points to one of three causes:

1. **`getEventPoints(m.id)` returns 0 earned because the per-member status lookup misses.** `getStatus()` in `use-weekly-events.ts` reads `attendanceCache[week.id]?.[memberId]?.[eventKey]`. The `week.id` here is the weekly_events row UUID. `useEventScoring` passes `currentWeek.weekId` (the date string, e.g. `2026-06-01`) into `getStatus`, which then re-resolves to `week.id` internally — that part is fine. But `isEventActive` is also called from inside `getStatus` first and returns `"na"` if false. For Khaleesi the events should be active, so this isn't the cause either... unless `toggleCache` hasn't loaded by render time.

2. **Stale render: `eventTypes` / `attendanceCache` / `toggleCache` arrive in different ticks.** On the first render, `eventTypes=[]` so `getEventPoints` returns `{earned:0, max:0}` and `eventMaxThisWeek=0`. When the caches arrive, the hook re-renders. If we're seeing 106 max but 0 earned, the `eventTypes` array IS loaded — which means earned should also have computed. So this is unlikely unless `attendanceCache` is empty at the moment max is computed.

3. **A mismatch between `EventPointSource.status` and what the calculator checks.** In `calculateEventPoints`, status events earn points only when `s.status === "check"`. Cause #1's "na" short-circuit would explain it: any event whose toggle row hasn't loaded yet — but here `isEventActive` defaults to `true`, so it would still award the point. The only way `getStatus` returns `"na"` is if `isEventActive` returns `false`. **Looking again at `weekly_event_toggles` for `8791e3d6` (Jun 1–7): `ice_pit_3=false` and `capital=false`.** Both default to `true` for the rest. So status should be `"check"` for all of Khaleesi's checked events.

## Investigation steps

1. Add temporary `console.log` in `useEventScoring.getEventPoints` for one member ID to print the resolved sources, then read browser console via `read_console_logs`. This is the fastest way to see exactly what `calculateEventPoints` is being called with for Khaleesi on the live page.
2. Specifically log `currentWeek`, the `sources` array (with `status`, `value`, `isActive`, `inputType`), and the returned `{earned, max}` for her member id.
3. Compare the values to expectations:
   - sources should have 8 entries (all 8 event types)
   - 7 of them should be `isActive: true` (all except `ice_pit_3`)
   - 7 of them should have `status: "check"` or `value > 0`
   - returned `earned` should be ~28

## Likely fix candidates

Depending on what the logs reveal, the fix will be one of:

- **A. `getStatus` returns `"na"` for active events** because `isEventActive` is racing with `toggleCache` loading. Fix: make `getStatus` not depend on `isEventActive` — return the raw cached status (or `"x"` if absent). `isEventActive` is already checked separately in `useEventScoring`, so the `na` short-circuit inside `getStatus` is redundant and risky.
- **B. `attendanceCache` keyed mismatch.** If the cache uses `weekly_event_id` (UUID) but lookup uses something else, all statuses come back `"x"`. Fix the key resolution.
- **C. `eventTypes` order changed and the rank chip lookup misses.** Unlikely given the data shape.

Most probable based on code inspection: **Cause A**. The `getStatus` "na" short-circuit is the most fragile path. The cleanest fix is to remove that branch and let the caller (`useEventScoring`) gate on `isEventActive` only, which it already does via the `isActive` field on each source.

## Implementation

1. Add temporary diagnostic logging inside `useEventScoring.getEventPoints` filtered to Khaleesi's id (`aa93b85f-46d1-4c84-bedd-7f62b262ab61`). Reload the Rankings page, capture the console output.
2. Based on the captured output, apply one of:
   - **If Cause A:** in `src/hooks/use-weekly-events.ts` remove the `if (!isEventActive(weekId, eventKey)) return "na";` line from `getStatus`. The active gate already lives in `EventPointSource.isActive`.
   - **If Cause B/C:** fix the relevant key resolution.
3. Remove the diagnostic logging.
4. Reload Rankings, confirm Khaleesi shows ~78/106 with the corresponding rank tier.

## Out of scope

No database changes. No bracket or threshold edits. No UI restyling. Other pages (Members, Dashboard, etc.) already share the same `useEventScoring` hook, so they'll be fixed by the same change.
