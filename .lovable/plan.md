

# Fix Weekly Events: Add Delete + Smart "New Week" Logic

## Problem
Members clicked "New Week" too many times, pushing the current week to May 2026. There's no way to delete a week, and the button always auto-advances to the next calendar week regardless of the actual date.

## Recommendation

### 1. Add a "Delete Week" button
- Add a delete button (with confirmation dialog) next to the week selector on the Events page
- Only allow deleting weeks that have **no attendance data** recorded, OR show a warning that attendance data will also be deleted
- Deleting cascades: remove the `weekly_events` row and any related `event_attendance` rows

### 2. Change "New Week" to use the current real-world date
Instead of always adding the next sequential week after the newest one, the button should:
- Calculate the **current calendar week** (week of today's date)
- If that week already exists, disable the button or show a message
- This prevents accidentally creating weeks months into the future

### 3. Immediate cleanup
Delete the future weeks (May 4, Apr 27, Apr 20) that shouldn't exist, keeping only the current week (Apr 13–19) as active.

## Implementation

| Step | What |
|------|------|
| 1 | **`use-weekly-events.ts`**: Add `deleteWeek(weekId)` function that deletes attendance rows then the week row |
| 2 | **`use-weekly-events.ts`**: Change `startNewWeek()` to use `getWeekStart(new Date())` instead of incrementing from newest |
| 3 | **`events.tsx`**: Add delete button with confirmation dialog next to week selector; disable "New Week" if current calendar week already exists |
| 4 | **Data cleanup**: Delete the 3 future weeks and their attendance data |

## Technical Details

**Delete function:**
```typescript
async function deleteWeek(weekId: string) {
  const dbId = getWeekDbId(weekId);
  if (!dbId) return;
  await supabase.from("event_attendance").delete().eq("weekly_event_id", dbId);
  await supabase.from("weekly_events").delete().eq("id", dbId);
  await fetchWeeks();
}
```

**Smart new week logic:**
```typescript
async function startNewWeek() {
  const currentStart = getWeekStart(new Date());
  const newWeekId = formatWeekId(currentStart);
  // Check if this week already exists
  const existing = [...activeWeeks, ...archivedWeeks].find(w => w.weekId === newWeekId);
  if (existing) return; // already exists
  // Insert current week only
  await supabase.from("weekly_events").insert({ week_id: newWeekId, label: formatWeekLabel(currentStart), svs_active: true, is_archived: false });
  // Auto-archive logic stays the same
}
```

**Files changed:** `src/hooks/use-weekly-events.ts`, `src/routes/events.tsx`
**Data cleanup:** Delete 3 future weekly_events rows + their attendance

