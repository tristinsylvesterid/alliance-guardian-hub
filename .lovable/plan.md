## Why Vicomte NeoBaD's score/rank isn't updating

Every "display" surface (Members, Rankings, Dashboard, At-Risk) reads score and rank from `latestByMember` in `useArchivedSnapshot`. That hook queries `member_metrics_history` **filtered to `source = 'auto_weekly'`** — i.e. only the rows written by the weekly archive job.

When you edit a member, `useMembers.saveMember` does write a new history row, but with `source = 'edit'`. The display query ignores those rows, so the UI keeps showing last week's archived total_score and rank until the next weekly archive runs. The interim path only triggers when a member has **no** snapshot at all, so an existing member like Vicomte NeoBaD (who has an `auto_weekly` snapshot from a prior week) stays frozen after a stat edit.

Net effect: stat edits update the raw `members.metrics` row, but not the archived snapshot the UI reads from.

## Fix

Make the display recompute live from current metrics whenever they've moved past the last archive, while keeping archived snapshots as the source of truth for historical/rank-change views.

In `useArchivedSnapshot`, for each member:
- Keep the archived snapshot's **event bonus** (archived `total_score` minus the recomputed fixed-metric score from that snapshot's metrics) — this preserves last week's AvA/event points.
- Recompute the fixed portion from the member's **current** `members.metrics` using `calculateTotalScore`.
- Display score = live fixed score + archived event bonus, capped at `latestMax`.
- Rank = `getRank(displayScore, leadershipRank, thresholds, latestMax)`.

To do this cleanly, extend `useArchivedSnapshot` to accept the current members list (or expose a helper `getDisplayScore(member)`), so Members / Rankings / Dashboard / At-Risk all get the recomputed values without each page duplicating the math.

### Files

- `src/hooks/use-archived-snapshot.ts` — add live recompute using current member metrics + archived event bonus; expose per-member display score + rank.
- `src/routes/members.tsx`, `src/routes/rankings.tsx`, `src/routes/index.tsx`, `src/routes/at-risk.tsx` — read the new display score/rank instead of raw `snap.totalScore` / `snap.rank`.

### Out of scope

- No change to the weekly archive job, `source = 'edit'` history rows, or the Rank Changes page (still uses archived snapshots as-is).
- No schema changes.
- Interim-ranking path for brand-new members stays as-is.
