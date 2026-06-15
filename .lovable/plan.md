## Goal
Change Rank Changes to compare the **rolling average of the last 4 archived weeks** against the **average of the 4 archived weeks before that**, instead of comparing two single weeks. Requires 8 archived weeks; otherwise show a placeholder.

## Hook: `use-archived-snapshot.ts`
Add a new export `useArchivedWindowAverages(windowSize = 4)`:

- Takes `archivedWeeks` (newest first) from `useWeeklyEvents`.
- `recentWindow` = first 4 (latest), `priorWindow` = next 4.
- Fetches `member_metrics_history` rows for all 8 `week_id`s in two parallel queries, filtered to `source='auto_weekly'`. Dedupe per (member, week) keeping the most recent `recorded_at`.
- For each member, compute:
  - `recentAvgScore` = mean of `total_score` across the 4 recent weeks that have a snapshot for that member (skip missing weeks; member must appear in at least 1 of the 4 to be included in that window).
  - `priorAvgScore` = same for prior window.
  - `recentMaxAvg` / `priorMaxAvg` = mean of per-week `BASE_MAX + getEventMaxForWeek(weekId)` across the same weeks (so rank thresholds line up with that window's effective max).
  - `recentRank` = `getRank(recentAvgScore, leadershipRank, thresholds, recentMaxAvg)`
  - `priorRank` = same for prior window.
- Returns:
  - `recentWindow`, `priorWindow` (the WeeklyEventData arrays for labelling)
  - `byMember: Record<memberId, { recentAvgScore, priorAvgScore, recentRank, priorRank, recentCount, priorCount, leadershipRank }>`
  - `hasFullWindows: boolean` (true when `archivedWeeks.length >= 8`)
  - `loading`

Leadership rank: take from the most recent snapshot in the recent window (falls back to prior, falls back to null).

The existing `useArchivedSnapshot()` stays for Rankings / Dashboard / Members / At-Risk — unchanged.

## Page: `rank-changes.tsx`
- Swap `useArchivedSnapshot` for `useArchivedWindowAverages(4)`.
- Header: "Comparing avg of `<oldest of recent>` – `<newest of recent>` vs `<oldest of prior>` – `<newest of prior>`" with arrow.
- Placeholder block (replaces current "need 2 archives" message): "Need at least 8 archived weeks to compare rolling 4-week averages. You have X."
- Row generation: same as today but uses `priorRank` → `recentRank`, only emitting members where the tier actually changes.
- Counts (Promotions/Demotions) and table stay the same.

## Out of scope
- Changing what other pages (Rankings, Dashboard, Members, At-Risk) display — they still show the latest single archived week.
- Configurable window size in the UI (hardcoded 4; easy to expose later).
- Backfilling old snapshots that lack event bonus.

## Technical notes
- All 8 week snapshots fetch in a single `in('week_id', [...])` call, then bucket client-side — keeps it to one round trip instead of 8.
- Reuses `getRank` from `@/lib/scoring` with the per-window averaged max so a member's average score is graded against an apples-to-apples max.
- Members missing from both windows are skipped; members present in one window only are skipped (no fair comparison).
