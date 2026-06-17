## Findings

- Glory War data for the current week is already saved in the backend: `Jun 15 – Jun 21, 2026` has **61 `glory_war` attendance rows**.
- The preview is reading `event_attendance` with an unauthenticated token and receiving `[]`, not an error. That explains why Apply can appear successful but the Events page still looks unchanged.
- The current fetch code treats an empty backend response as real empty attendance, so it silently clears the UI instead of warning that attendance data was not available.

## Plan

### 1. Fix authenticated attendance reads

Update `src/hooks/use-weekly-events.ts` so event data is only fetched after a valid signed-in session is available.

- Before `fetchWeeks`, `fetchAttendance`, and `fetchToggles`, confirm the user session exists.
- If no session exists, do not overwrite the current caches with empty data.
- Listen for sign-in/session restoration and refetch event data once the session is ready.

### 2. Surface backend read/write problems instead of failing silently

Add proper error handling in the same hook:

- If `weekly_events`, `event_attendance`, or `weekly_event_toggles` fetches fail, log the exact backend error and expose it to the Events page.
- Show a clear toast/banner on `/events`, e.g. “Attendance data could not be loaded. Please sign in again or refresh.”
- Keep the imported review rows visible if Apply cannot confirm the update.

### 3. Make Apply visibly refresh Glory War immediately

After screenshot Apply succeeds:

- Optimistically update the local attendance cache for the selected week/event/member rows.
- Then refetch attendance from the backend.
- Confirm the current week and event key are included in the success message, e.g. “Updated Glory War for Jun 15 – Jun 21, 2026.”

### 4. Remove duplicate weekly-event state

Right now `useWeeklyEvents()` is called in multiple places, which creates separate caches. I’ll lift it into a shared provider so every route/helper sees the same event attendance state.

- Add a shared weekly-events provider.
- Wrap authenticated app content with it.
- Keep the existing `useWeeklyEvents()` API the same so route code stays simple.

### 5. Verify backend permissions for event tables

Confirm the event-related backend tables have explicit app access permissions:

- `event_attendance`
- `weekly_events`
- `weekly_event_toggles`
- `event_types`

If any are missing, add a small migration granting signed-in officers/admins access while keeping the existing row-level rules intact.

### 6. Validate the actual Glory War case

Use the live preview to confirm:

- Current week is `Jun 15 – Jun 21, 2026`.
- Glory War shows the saved attendance count without needing a refresh.
- Importing another Glory War screenshot updates the roster immediately.
- If the user is not signed in, the page shows a clear message instead of silently showing empty attendance.