## Goal

All score-displaying pages read from the **last archived week's snapshot** (fixed values + that week's event totals), not the live in-progress week. Events page stays live for data entry. Rank Changes compares the two most recently archived weeks. Before any archives exist, show an empty placeholder.

## How archiving works today (and the gap)

When you start a new week, the oldest active week auto-flips to `is_archived = true` and a `member_metrics_history` row is upserted — but the snapshot is written **for the new week** and **without that week's event bonus**. So archived snapshots today don't include event points.

## Plan

### 1. Fix the archive snapshot

Change `startNewWeek` so that, at the moment a week archives:
- Build event bonuses for the **week being archived** (per member, using current event toggles + attendance + AvA rank).
- Snapshot each member with that bonus → `member_metrics_history` keyed by `week_id = <archived weekId>`, with `total_score` = base + earned and `rank` computed against `baseMax + eventMax`.
- Continue to seed a baseline snapshot for the new week (no events yet) so the new week exists in history too.

This makes each archived week a complete, frozen record: per-member `total_score`, `rank`, the metric values used, and the event bonus baked in.

### 2. New hook: `useArchivedSnapshot(weekId?)`

Reads `member_metrics_history` rows for a given archived `week_id` (defaults to the most recent archived week). Returns:
- `weekId`, `weekLabel`
- `byMember: Record<memberId, { totalScore, rank, metrics, leadershipRank }>`
- `exists` (false → trigger empty state)

Also expose `latestArchivedWeek` and `previousArchivedWeek` selectors.

### 3. Page changes (display only — Events entry stays live)

- **Rankings**: read scores/ranks from `useArchivedSnapshot(latest)`. If no archived week exists, show placeholder: "No completed week yet — archive a week from the Events page to see rankings."
- **Dashboard (index)**: rank distribution, totals, average from latest snapshot. Same placeholder if none.
- **Members**: per-member score column reads snapshot score; current metrics still editable as today.
- **At-Risk**: detection runs against snapshot totals.
- **Analytics**: trend already uses history — make sure it filters to archived weeks only.
- **Rank Changes**: compare `latestArchivedWeek` vs `previousArchivedWeek`. If fewer than 2 exist, show "Need at least 2 archived weeks to compare."
- **Events page**: unchanged — still writes to the current active week.

### 4. Backfill (one-time, optional)

For any existing archived weeks that have snapshot rows without event bonus, leave as-is (history is already what it is). New behavior takes effect from the next archive.

## Technical notes

- No schema migration needed. `member_metrics_history` already stores `week_id`, `total_score`, `rank`, `metrics`, `leadership_rank`.
- `snapshotMemberMetrics` already accepts `eventBonus` — only call site that needs updating is `startNewWeek`, plus we add a pass over the about-to-be-archived week with computed bonuses.
- To compute the about-to-archive week's event bonus we need event types + toggles + attendance + AvA metric — all already accessible inside the hook.
- Snapshot uniqueness is `(member_id, recorded_date)`. To avoid colliding with any same-day baseline snapshot, write the archive snapshot first, then the new-week baseline.
- "Live" event totals shown only on the Events page itself (entry UX); not surfaced on Rankings/Dashboard.

## Out of scope

- Editing snapshots after archive.
- Re-archiving / un-archiving weeks.
- Manual "Archive now" button — archives still happen when a new week starts.
