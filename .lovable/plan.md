## Goal
Track a member's previous in-game names without archiving them, so officers can recognize players who renamed themselves.

## How it works

- When an officer edits a member's name in the existing Member dialog, the old name is automatically saved as a "previous name" (with the date it was changed).
- On the Members page, a member row with prior names shows a small "aka" indicator next to the current name. Hovering (or tapping) reveals the full list with timestamps.
- In the Member edit dialog, a new "Previous Names" section lists past names. Officers can manually add or remove entries (in case a rename happened before this feature existed, or one was recorded incorrectly).
- Past names are searchable on the Members page — typing an old name into the existing search finds the current member.

## Out of scope
- No separate page or report for name history.
- Archived members' name history is not tracked.

## Technical details

**Database** (migration)
- New table `member_name_history(id, member_id, previous_name, changed_at)` with RLS: all authed read, officers/admins write. Indexed on `member_id` and `previous_name` (for search).
- Postgres trigger on `members`: when `name` changes via UPDATE, insert the OLD name into `member_name_history` automatically. This guarantees history captures every rename regardless of which client did it.

**Code**
- New hook `src/hooks/use-member-name-history.ts` — fetch + cache history per member, expose `addPreviousName(memberId, name)` and `removePreviousName(id)` for manual edits.
- `src/components/MemberFormDialog.tsx` — add a "Previous Names" section showing the list, with an add-name input and a delete button per entry.
- `src/routes/members.tsx` — show an "aka" tooltip/badge next to names with history; extend the search filter to also match previous names.

## Files to change
| File | Change |
|---|---|
| `supabase/migrations/...` | New `member_name_history` table + auto-capture trigger on `members` |
| `src/hooks/use-member-name-history.ts` | New — CRUD + cache |
| `src/components/MemberFormDialog.tsx` | Previous Names section |
| `src/routes/members.tsx` | "aka" indicator + search includes past names |
