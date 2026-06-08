# Add "Engagement" weekly event, remove manual polls, fix event order

## Goal
Replace the manual Polls workflow with a single recurring **Engagement** status event that behaves like other status events (yes/no per member, screenshot import supported, 1 point default). Also fix the column order on the Events page.

## Changes

### 1. Seed the Engagement event type
- Auto-insert an `event_types` row on app load if missing:
  - `key: "engagement"`, `name: "Engagement"`, `input_type: "status"`, `has_svs_toggle: false`, `is_optional: false`, `point_weight: 1`.
- Implemented as a one-time bootstrap effect inside `useEventTypes` (after fetch, if `engagement` not present, insert it then refetch).
- It then automatically appears in:
  - Events page weekly grid (✓ / ✗ / N/A per member)
  - Import Screenshots dialog (status mode → name parsing)
  - `useEventScoring` weekly earned/max points
  - At-Risk page as one of the `activeEvents`

### 2. Fix `EVENT_ORDER` in `src/routes/events.tsx`
New order (last entry is Engagement):

```text
ice_pit_1, glory_war, ice_pit_2, ice_pit_3, capital, canyon_clash, ava, svs, engagement
```

### 3. Remove the manual Polls UI from `src/routes/events.tsx`
- Delete the "Polls (1pt)" section in the card header (input + Add Poll button).
- Delete the poll columns in `<TableHeader>` and `<TableBody>`.
- Remove `useWeeklyPolls` import, `newPollName` state, and all `addPoll / removePoll / getResponse / setResponse / getPollsForWeek` calls.

### 4. Drop poll counting from at-risk logic
- `src/routes/at-risk.tsx`: stop importing `useWeeklyPolls`; pass `pollCount: 0`, `pollResponseCount: 0` to `evaluateMemberRisk`. Engagement is now picked up automatically via `activeEvents`.
- `src/lib/at-risk.ts`: no formula change required (the fields become effectively zero); leave the type as-is to keep the diff small.

### 5. Cleanup
- `src/hooks/use-weekly-polls.ts` — delete (no remaining callers).
- Keep `weekly_polls` and `poll_responses` DB tables in place to preserve history. No migration.

## Files touched
- `src/hooks/use-event-types.ts` — bootstrap-seed `engagement`
- `src/routes/events.tsx` — new EVENT_ORDER, remove Polls UI
- `src/routes/at-risk.tsx` — drop poll dependency
- `src/hooks/use-weekly-polls.ts` — delete
