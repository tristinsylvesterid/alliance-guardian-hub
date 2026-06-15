## Goal
Replace hard-delete of event types with a soft "archive" so historical attendance from past weeks is never lost again, and surface archived events read-only on history views.

## Schema change
Add to `event_types`:
- `archived_at timestamptz null`
- `archived_by uuid null` (optional, for audit)

No data migration needed for existing rows.

Note on past data: the Ice Pits attendance rows are already gone (verified `event_attendance` has 0 rows for `ice_pits`). This plan prevents future loss; it does not recover the deleted Ice Pits records.

## Hook changes (`use-event-types.ts`)
- `fetchEventTypes` returns ALL rows (including archived) with `archivedAt` field.
- Expose two derived lists: `activeEventTypes` (archived_at IS NULL) and `eventTypes` (all, for history rendering).
- Replace `removeEventType` with:
  - `archiveEventType(key)` → `UPDATE event_types SET archived_at = now() WHERE key = $1`
  - `restoreEventType(key)` → `UPDATE event_types SET archived_at = NULL ...`
  - `deleteEventTypePermanently(key)` → hard delete + cascade clear `event_attendance` and `weekly_event_toggles` rows for that key (only via an explicit "Delete forever" confirmation; warns about history loss).

## UI changes
- **Settings → Event types**: list active types with an "Archive" button (replaces current Remove). Add a collapsed "Archived events" section showing archived types with "Restore" and "Delete forever" actions. Archived types are excluded from `eventMax` calculation.
- **Events page (live entry)**: render only `activeEventTypes` for columns/inputs and toggles. An archived event type cannot be toggled on for new weeks.
- **Event Archive page (historical weeks)**: render the union of `activeEventTypes` + any archived event types that have attendance/toggle rows for the weeks being shown, so previous-season events still display with their data. Mark archived columns with an "Archived" badge.
- **Scoring (`use-event-scoring.ts`, `archiveWeek`)**: when computing per-week event points, include archived event types only for weeks where they were active and had entries (existing `isEventActive` + `hasAnyEntries` logic already handles this once we keep them in the list). For the current/live week, archived types are skipped.

## Out of scope
- Recovering the deleted Ice Pits attendance (data is gone).
- Per-week archive/unarchive of event types (only global archive).

## Technical notes
- Migration uses `ALTER TABLE` only; existing RLS policies cover the new columns.
- `useEventScoring.getEventMaxForWeek` already filters by `isEventActive` per-week, so excluding archived types from the live max is a one-line filter on the list.
- "Delete forever" must explicitly delete from `event_attendance` and `weekly_event_toggles` first (no FK cascade exists), then `event_types`.
