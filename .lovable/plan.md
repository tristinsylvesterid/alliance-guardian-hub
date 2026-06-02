## Weekly Rank Change page

A new `/rank-changes` page that lists only members whose rank tier (R1/R2/R3/etc.) differs between **last week's final state** and **right now**. It recomputes live — as members are edited and as event attendance is toggled, the list updates automatically.

### How "previous rank" is determined
When a new week starts, the app already snapshots every member into `member_metrics_history` with `source = 'auto_weekly'` and `week_id = <new week>`. That snapshot captures each member's metrics as they were at the moment the previous week closed — exactly the "previous week's final" state.

For each member, previous rank =
`getRank(baseScore(snapshot.metrics) + priorWeekEventBonus.earned, snapshot.leadership_rank, thresholds, MAX_BASE + priorWeekEventBonus.max)`

where `priorWeekEventBonus` is computed from `event_attendance` + `weekly_event_toggles` for the prior week (so SvS-off weeks correctly omit SvS, AvA uses bracket scoring, etc.).

> One nuance: today's `startNewWeek` snapshot doesn't include the prior week's event bonus in `total_score`. The page sidesteps that by recomputing the prior rank from `snapshot.metrics` + prior-week event records, so the comparison stays correct even for older weeks.

Fallback: if no prior-week snapshot exists for a member (joined this week), they're excluded — no rank change to report.

### Current rank
Reuse the live calculation already wired across the app: `baseScore(member.metrics) + currentWeekEvents.earned` ranked against `MAX_BASE + currentWeekEvents.max`. This is what `members.tsx`, `rankings.tsx`, etc. already do.

### Page layout
- Route: `src/routes/rank-changes.tsx` titled "Weekly Rank Changes".
- Header explains the comparison (`<previous week label>` → `<current week label>`) plus a small "Refresh" button that just calls `router.invalidate()` / refetches hooks for users who want a manual nudge.
- Single table sorted by magnitude of change (biggest jumps first), columns:
  - Member name (+ leadership rank badge)
  - Previous rank (RankBadge)
  - Arrow
  - Current rank (RankBadge)
  - Direction chip: "Promoted" (up) / "Demoted" (down) with up/down icon
- Empty state when no one changed: "No rank changes this week yet."
- Edge cases handled inline:
  - No prior week available yet → "Need at least one previous week to compare."
  - No current week → "Start a new week on the Events page to begin tracking changes."

### Live update strategy
The page uses the existing hooks (`useMembers`, `useEventTypes`, `useWeeklyEvents`, `useScoringConfig`, `useRankThresholds`, `useEventScoring`) plus a new lightweight hook that fetches prior-week snapshots once and re-runs whenever those hooks' data changes via `useMemo`. No new subscriptions needed — the existing realtime/refetch behavior already keeps members and event attendance fresh, so the table recalculates automatically.

### Navigation
Add a "Rank Changes" link to `AppLayout`'s sidebar/nav next to "Rankings", using a `TrendingUp` icon.

### Files
- New `src/routes/rank-changes.tsx` — the page (Route + component).
- New `src/hooks/use-prior-week-ranks.ts` — fetches `member_metrics_history` rows for the prior week (one query, keyed by `priorWeek.weekId`) and exposes `getPriorSnapshot(memberId)`.
- New `src/hooks/use-prior-week-event-points.ts` (or a small helper inside `use-event-scoring.ts`) — same shape as `useEventScoring`'s `getEventPoints` but for an arbitrary `weekId`, used for the prior-week bonus.
- Edit `src/components/AppLayout.tsx` — add the nav entry.

### Out of scope
- Persisting rank-change history or notifications.
- Showing score-only deltas (per the choice: tier change only).
- Backfilling prior-week snapshots that were never recorded.
