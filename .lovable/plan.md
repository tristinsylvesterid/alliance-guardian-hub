## SvS as a regular event + per-event attendance scoring

### Scoring model
- Each event_type contributes its `point_weight` to a member's score (SvS 3, Glory War 3, Ice Pit 3 = 3, Ice Pit 2 = 2, Ice Pit 1 = 1, Capital 1, Canyon Clash 1). AvA stays bracket-scored on rank #.
- Source of truth = current week's `event_attendance` (no per-event mirror on `member.metrics`).
- Status events: `point_weight` if `status === "check"`, else 0.
- Events toggled **off** for the current week contribute 0 to both earned and max — fair denominator.

### Database
- Delete `svsParticipation` row from `scoring_config` (no longer a member metric).
- Delete orphaned `weeklyParticipationAvg` row from `scoring_config`.
- `event_types.point_weight` is already populated correctly — no schema change.

### Code

**`src/lib/scoring.ts`**
- Remove `svsParticipation` from hardcoded `METRIC_DEFINITIONS`.
- Add helper `calculateEventPoints({ eventTypes, currentWeekId, memberId, isEventActive, getStatus, getValue, avaMetric }) => { earned, max }`:
  - Skip events where `isEventActive === false`.
  - `inputType === "rank"` (AvA): reuse `calculateMetricPoints(avaMetric, rank)`, `max = avaMetric.maxPoints`.
  - `inputType === "status"`: `earned = status === "check" ? point_weight : 0`, `max = point_weight`.

**`src/hooks/use-event-types.ts`** — expose `pointWeight: r.point_weight ?? 1` on the `EventType` shape.

**Score-consuming pages** (`members.tsx`, `rankings.tsx`, `index.tsx`, `at-risk.tsx`, `events.tsx`, `analytics.tsx`) — combine:

```text
baseScore = calculateTotalScore(m.metrics)
events    = calculateEventPoints(currentWeekCtx, m.id)
total     = baseScore + events.earned
max       = MAX_BASE_POINTS + events.max
rank      = getRank(total, m.leadershipRank, thresholds, max)
```

- `archive.tsx` / `event-archive.tsx`: archived members have no current-week context → keep using just `calculateTotalScore(metrics)`.

**`src/routes/events.tsx`**
- Drop `EVENT_TO_METRIC.svs` and the SvS mirror-write in `handleStatusChange`.
- Drop AvA's `avaWeeklyScore` mirror-write too — AvA now reads from `event_attendance` directly (single source of truth).
- Remove unused `handleSvsToggle`.

**`src/components/MemberFormDialog.tsx`** — no edit needed; `svsParticipation` field disappears automatically.

**`src/lib/metrics-history.ts`** — snapshots compute `total_score` as `baseScore + currentWeekEventPoints` so the analytics timeline matches live pages.

**`src/lib/at-risk.ts`** — keep `svsActive`/`svsAttended` logic; update score recomputation to include event points.

### Backwards-compat
- Old `member.metrics.svsParticipation` and `avaWeeklyScore` JSON values become unused — harmless leftovers, ignored by scoring.

### Out of scope
- Multi-week rolling attendance average.
- The deleted `weeklyParticipationAvg` consolidated metric.
