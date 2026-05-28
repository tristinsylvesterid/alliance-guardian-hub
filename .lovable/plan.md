## Goal
Make the per-event summary cards on `/events` compact, dense, and easily scannable. Replace the current large cards (big number, progress bar, full-width header with toggle on the right) with small tiles that fit more per row.

## New tile design
Each event becomes a small tile (roughly 1/5–1/6 width on desktop, wrapping on smaller screens) with:

- Line 1: event name (small, gold, font-heading) + tiny toggle on the right (if optional/SVS) — no "Active/Off" label, just the switch
- Line 2: `attending / total` count (e.g. `18 / 32`) in a compact, readable size — no giant 3xl number, no progress bar
- For rank-input events (AvA): show `ranked / total` plus `avg #N` on a second tiny line
- Dimmed state when toggled off: faded text + "N/A" instead of counts

Layout: switch the `grid md:grid-cols-N` to a flex-wrap row (or `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6`) so tiles stay compact regardless of how many event types exist.

## Files
- `src/routes/events.tsx` — replace the event summary grid block (lines ~168–258) with the compact tile layout. No logic changes, just presentation.

No backend, hook, or scoring changes.