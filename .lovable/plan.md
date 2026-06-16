## What's happening

When you click **Apply** in the screenshot import dialog, the code loops through each matched member and calls `setStatus` (or `setValue`) one at a time. Two things make this fragile:

1. **Errors are swallowed.** `setStatus` in `src/hooks/use-weekly-events.ts` calls `supabase.from("event_attendance").upsert(...)` but never checks the returned `error`. If the upsert fails (RLS, bad week id, etc.), the loop keeps going, the success toast fires, and you see "nothing changed" with zero feedback in the UI.
2. **Each iteration re-fetches the whole attendance table** before the next iteration runs, so a slow round-trip can interleave with the next upsert and a transient failure on any single row is invisible.

I can't tell yet whether the actual failure is RLS, a stale `selectedWeekId`, or something else — because the code throws away the error. The plan is to make the failure visible first, then fix the underlying cause if instrumentation reveals one.

## Plan

### 1. Make `setStatus` report errors
**File:** `src/hooks/use-weekly-events.ts`
- Capture `{ error }` from the upsert.
- If `error`, `console.error` it and `throw` so callers can react.
- Same treatment for `setEventActive` and `toggleSvs` while we're there (one-line each).

### 2. Batch the screenshot Apply into a single upsert
**File:** `src/routes/events.tsx` (`onApplyStatus` / `onApplyRank` handlers)

Replace the per-member `for` loop with a single batched call:
- Add a new `setStatusBulk(weekId, rows[])` helper in `use-weekly-events.ts` that does one `event_attendance.upsert([...rows])` and one `fetchAttendance()` at the end.
- `onApplyStatus` builds `rows` with `status: "check"` for every matched member.
- `onApplyRank` builds `rows` with `status` derived from rank + the rank in `value`.

Benefits: one network round-trip, no interleaving, one obvious error if anything goes wrong.

### 3. Surface errors in the dialog
**File:** `src/components/ImportScreenshotsDialog.tsx`
- Wrap the existing `await onApplyStatus / onApplyRank` so that a thrown error shows a real `toast.error(e.message)` instead of the generic "Failed to apply changes" and keeps the review rows on screen so the user can retry.

### 4. Guardrail: refuse to apply with no active week
- If `selectedWeekId` is empty at apply time, `toast.error("Pick a week before importing")` and bail. (Today it silently no-ops because `setStatus` returns early when `dbId` is missing.)

### 5. Verify
After the changes, importing one screenshot will either land the attendance rows (visible immediately in the table) or produce a concrete error message naming the failing column / policy / row — which tells us if there is a deeper bug to fix in a follow-up.

## Out of scope
- No schema or RLS changes yet — we'll only touch policies if step 5 surfaces an RLS denial.
- No changes to the AI parsing pipeline; parsing already works per your report.
