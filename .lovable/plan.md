## Goal

Track four new seasonal events plus a multi-poll response tracker, and give every event a **point weight** so each member earns a **Weekly Participation Score** that displays on the Events page and feeds into rank calculations.

## Point weights

| Weight | Events |
|---|---|
| 1 pt | Level 1 Ice Pit, Poll responses (each poll = 1 pt) |
| 2 pt | Level 2 Ice Pit, Canyon Clash |
| 3 pt | Level 3 Ice Pit, SvS (when active), Glory War |

All weights editable in Settings later.

## What the user will see

**Events page**
- New "Weekly Participation" card at the top: bar showing total points earned across all members vs. total possible.
- Each event card shows its **point weight** (e.g. "Glory War · 3 pt").
- New **Polls** section under the event cards: officers click "+ Add Poll", name it (e.g. "SvS strategy"), and mark members yes/no. Each poll counts as 1 pt.
- Attendance roster table gets a new rightmost column: **"Week Score"** showing `earned / possible` per member (e.g. `7 / 12`).
- Optional toggles (existing feature) zero out that event's contribution to "possible" when off.

**Settings → Tracked Events**
- Each event row gets a **point weight** input (1/2/3, editable).
- Add the four new events seeded as Optional with their weights.
- Add a "Polls" event type seeded as Optional (handled via the polls section, not a card).

**Rankings**
- New ranking metric: **Weekly Participation Avg** — averages each member's `earned / possible` ratio across the last N weeks (default 4 = same horizon as active weeks).
- Editable scoring brackets in Settings, e.g. 90%+ = 5 pts, 75% = 3 pts, 50% = 1 pt, <50% = 0 pts.

## Technical details

**Database migration**
- `event_types`: add `point_weight integer NOT NULL DEFAULT 1`.
- New table `weekly_polls(id, weekly_event_id, name, created_at)` — officers/admins write, all authed read.
- New table `poll_responses(id, poll_id, member_id, responded boolean)` with unique `(poll_id, member_id)` — same RLS pattern.
- Seed rows: insert Level 1/2/3 Ice Pit (weights 1/2/3), Glory War (3), and a "Polls" placeholder if needed. Update existing Canyon Clash to weight 2, SvS to weight 3.
- Insert one new `scoring_config` row `weeklyParticipationAvg` with default brackets.

**Code**
- `use-event-types.ts`: surface `pointWeight`; add `setWeight(key, n)`.
- New `use-weekly-polls.ts`: CRUD for polls and responses; per-week cache.
- `lib/scoring.ts`: add helper `calculateWeeklyParticipation(memberId, weekId, eventTypes, getStatus, polls, pollResponses)` → `{earned, possible}`. Add a `weeklyParticipationAvg` metric to `METRIC_DEFINITIONS` reading from a new numeric field on members (computed and cached) — OR compute on the fly each render and feed `getRank`.
- `members.metrics`: new optional field `weeklyParticipationAvg` (auto-recalculated when attendance changes; written via the existing `updateMemberMetrics` flow).
- `routes/events.tsx`: render Weekly Participation card, Polls section, Week Score column, weight badges.
- `routes/settings.tsx`: weight input column for events; new metric automatically appears in the existing brackets editor.

## Files to change

| File | Change |
|---|---|
| `supabase/migrations/...` | Add column + 2 new tables + seed data |
| `src/hooks/use-event-types.ts` | Expose & edit pointWeight |
| `src/hooks/use-weekly-polls.ts` | New — polls CRUD |
| `src/hooks/use-weekly-events.ts` | Recompute weekly score on attendance write |
| `src/lib/scoring.ts` | Weekly participation calc + new metric definition |
| `src/routes/events.tsx` | Participation card, Polls section, Week Score column |
| `src/routes/settings.tsx` | Point weight input per event row |
| `src/routes/rankings.tsx` | Display new metric (auto via existing loop) |

## Out of scope (for this round)
- Backfilling weekly participation for archived weeks (will compute going forward; archived weeks still display correctly from their stored attendance).
- Per-poll point weights (every poll = 1 pt).