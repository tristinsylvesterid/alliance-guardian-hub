## Goal
New `/at-risk` page that surfaces members showing signs of low performance, with each risk flag clearly labeled so officers know why someone landed on the list.

## Risk indicators (initial set)
For each member, evaluate these flags against current metrics + the most recent event week:

1. **Incomplete Alliance Recognition** — `allianceRecognition < 100`
2. **Weak AvA rank** — `avaWeeklyScore === 0` (no rank entered / didn't participate) OR `avaWeeklyScore >= 50` (placed 50th or worse)
3. **Zero weekly participation** — across the current week, member earned 0 attendance/poll points (no events attended, no polls answered, no AvA rank)
4. **Missed SvS** — current week's SvS toggle is on AND member is marked absent (`svsParticipation = false`)
5. **Low overall score** — total weighted score < 50% of max (R1 territory)
6. **Low troop tier** — `troops` is T8 or lower
7. **Low HQ** — `hqLevel <= 27`
8. **No engagement** — `engagement = false`

R4/R5 leadership are excluded from the at-risk list (they don't get ranked the same way).

## Page layout (`/at-risk`)
- Header: "Members at Risk" + subtitle explaining the page reflects current week + current profile metrics
- Summary strip: small tile per indicator showing count of flagged members (clickable to filter the table by that flag)
- Main table, sorted by flag count descending then name:
  - Member name + current rank badge
  - Flag count (e.g. "3 flags")
  - Flag chips inline (compact gold-bordered pills with the indicator label)
  - This week's points + total score / max
- Empty state when nobody is flagged

## Files
- `src/lib/at-risk.ts` — pure function `evaluateMemberRisk(member, weekContext)` returning `{ flags: { key, label, severity }[] }`. Centralizes thresholds so they're easy to tune.
- `src/routes/at-risk.tsx` — new route, uses existing `useMembers`, `useWeeklyEvents`, `useWeeklyPolls`, `useRankThresholds` hooks (no new backend, no new tables).
- `src/components/AppLayout.tsx` — add "At Risk" nav link between Members and Rankings (verify exact location during implementation).

## Notes
- No DB / migration changes — all data already exists.
- Thresholds for each flag live in one place (`at-risk.ts`) as named constants so they're easy to revisit when the meta shifts.
- "Current week" = first entry from `activeWeeks` (same convention as `/events`).
