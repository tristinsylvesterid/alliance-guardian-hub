## Goal
Make Glory War screenshot imports visibly update the current Events page immediately and reliably.

## What I found
- The backend already has current-week Glory War rows: `Jun 15 – Jun 21, 2026` has 61 `glory_war` attendance entries.
- The Events page can read authenticated event data, but the current hook fetches all `event_attendance` rows in one unfiltered request.
- There are 1105 attendance rows total. The Data API response is capped at 1000 rows unless pagination/range is used, so some rows can be missing from the UI even after Apply succeeds.
- There is also a key mismatch risk: old rows use keys like `canyonClash`, while active event types now use normalized keys like `glory_war`. Glory War is correct in the database, but the code should make refresh behavior explicit and visible.

## Implementation plan
1. **Fix attendance loading**
   - Change `useWeeklyEvents` to fetch attendance by the currently loaded active/archived week IDs instead of `select('*')` for every attendance row.
   - This avoids the 1000-row cap hiding current Glory War data.

2. **Make Apply refresh the exact event**
   - After `setStatusBulk`, keep the optimistic UI update and then refetch attendance for the selected week/event.
   - Do not let a partial/full-table refetch overwrite the optimistic Glory War rows with missing data.

3. **Expose load/apply problems clearly**
   - Surface `loadError` on the Events page with an inline alert so silent data loading failures are visible.
   - Keep the parsed review rows open if Apply fails.

4. **Add a small debug-safe confirmation**
   - After Apply, show a success message that includes the event name, matched count, and selected week label.
   - This confirms the import went to the week the user is viewing.

5. **Verify the actual Glory War case**
   - Use the live preview to confirm `Jun 15 – Jun 21, 2026` displays Glory War attendance from the existing 61 backend rows.
   - Confirm applying a Glory War import updates the summary/tables without requiring a page reload.

## Out of scope
- No changes to the AI screenshot parsing prompts unless the data fails to parse.
- No schema or permission changes unless a database read/write error appears during verification.