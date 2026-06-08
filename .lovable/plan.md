## Problem

During the week, events that haven't happened yet (no one has been marked check/x, no AvA ranks entered) still contribute their max points to each member's total. That deflates everyone's percent and skews the live R1/R2/R3 rankings until every event is filled in.

## Fix

Treat an event as "not yet counted" if no member has any recorded entry for it in the current week. Such events contribute 0 to BOTH `earned` and `max`, so the rank percent stays fair — same mechanism already used for toggled-off events.

### Definition of "has entries"

For the current week's `weeklyEventId`, look at the raw `event_attendance` rows (already cached in `useWeeklyEvents` as `attendanceCache` / `valueCache`):

- **Status events** (check/x events like SvS, Bear, etc.): has entries if at least one member has an actual row recorded (any status — `check`, `x`, or `na`). The default "x" returned by `getStatus` when no row exists does NOT count.
- **Rank events** (AvA): has entries if at least one member has a `value > 0` recorded.

### Steps

1. **`src/hooks/use-weekly-events.ts`** — expose a helper `hasAnyEntries(weekId, eventKey, inputType)` that checks the raw caches (not the defaulted `getStatus`) for any recorded row for that event in that week.

2. **`src/hooks/use-event-scoring.ts`** — when building `EventPointSource[]`, set `isActive` to `false` for events where `hasAnyEntries(currentWeek.weekId, e.key, e.inputType)` is false. Apply the same filter to `eventMaxThisWeek`. No change to `calculateEventPoints` itself — the existing "isActive=false ⇒ 0/0" branch already does the right thing.

3. **`src/routes/rankings.tsx`** — no change needed; `MAX_TOTAL_POINTS` is derived from `eventMaxThisWeek`, which will now exclude empty events automatically. The header "Max N points" will reflect only events with entries.

### Out of scope

- No DB or schema changes.
- No change to the Events page UI (officers can still see and fill empty events).
- No change to rank thresholds, at-risk flags, or AvA bracket scoring.
- Archived weeks: same rule applies — if an old week was archived with an empty event, that event won't be counted. (In practice all entries are filled before archival, so this should be a no-op for historical data.)
