# Refine At-Risk Flags

Update `src/lib/at-risk.ts` (and pass the needed context from `src/routes/at-risk.tsx`) so flags only fire when the data is actually meaningful.

## Changes

### 1. AvA flag — drop the "no rank" case
In `evaluateMemberRisk`, remove the `ava === 0` branch. Only flag when an AvA rank is entered and is ≥ 50:
- 50–70 → medium severity
- 71+ → high severity
- 0 / empty → no flag (it just means the week's rank hasn't been entered yet)

### 2. Missed SvS — only flag once attendance has started being recorded
Add a new field to `WeekContext`:
- `svsAttendanceRecorded: boolean` — true if at least one member has a `check` status for the SvS event this week.

Flag `missed_svs` only when `ctx.svsActive && ctx.svsAttendanceRecorded && !ctx.svsAttended`. This way the flag stays dormant before SvS happens and lights up only after officers start marking attendance.

In `src/routes/at-risk.tsx`, compute `svsAttendanceRecorded` once for the week (any `event_attendance` row for the SvS event_type_key with `status === 'check'`) and pass it into every `evaluateMemberRisk` call.

### 3. Keep the rest unchanged
- `alliance_recognition`, `zero_participation`, `low_score`, `low_troops`, `low_hq` stay exactly as they are.

## Updated flag list (after changes)

| Key | Trigger |
|---|---|
| `alliance_recognition` | AR < 100% |
| `ava_weak` | AvA rank entered AND ≥ 50 |
| `zero_participation` | Events/polls open, member did 0 of either |
| `missed_svs` | SvS active, at least one check recorded for SvS, this member not checked |
| `low_score` | Total score < 50% |
| `low_troops` | Troops below T9 |
| `low_hq` | HQ between 1 and 27 |

## Out of scope
- The `RISK_INDICATORS` constant label for `ava_weak` ("AvA missing or ≥50") will be updated to "AvA rank ≥50" for accuracy, but no new flag types are added.
- No DB schema changes.
