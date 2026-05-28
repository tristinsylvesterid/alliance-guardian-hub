## Problem

The Polls section on the Events page sits as a full-width card above the Attendance Roster and renders a second, parallel member table — one row per member, one column per poll. With 50–100 members this dominates the page, pushes the actual roster below the fold, and duplicates the member list you're already scanning right below.

## Fix — fold polls into the Attendance Roster

Remove the standalone Polls card. Move poll columns into the existing Attendance Roster table as additional right-side columns (one column per poll), grouped under a "Polls (1pt)" header band so they read distinctly from event columns. Each cell stays the same toggleable check/X you have today.

Move poll management (add poll input + delete poll buttons) into a compact toolbar:
- A small "Polls" toolbar row directly above the roster table — poll name input + Add button on the right, current poll chips with inline delete on the left.
- Per-column delete moves to a tiny trash icon in the column header (as it already is), so no separate management UI is needed.

When there are zero polls this week, no poll columns render and the toolbar just shows the add input — no empty-state card taking vertical space.

## Layout after change

```
[Page header + week selector]
[Event summary cards row]
[Attendance Roster card]
  ├─ Toolbar: [poll chips ...]              [+ Add poll input]
  └─ Table: Member | Rank | Event1 .. EventN ‖ Poll1 .. PollN
```

A subtle vertical divider (border-left on the first poll column) separates events from polls so the two groups remain visually distinct without a second card.

## Files changed
- `src/routes/events.tsx` (only)

No schema, hook, or business-logic changes — pure presentation refactor of the events route.
