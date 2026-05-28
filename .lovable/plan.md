## Problem

When you change a member's Leadership Rank from "R4 — Officer" back to "None (scored)" and save, the member still appears as R4 on the Members and Rankings pages.

## Root cause

In `src/components/MemberFormDialog.tsx`, the "None (scored)" option uses `value="none"` (Radix Select doesn't allow an empty string value). The dialog state therefore becomes the literal string `"none"`, not `""`. Then in `handleSave`:

```ts
leadershipRank: leadershipRank || undefined
```

`"none"` is truthy, so the saved member object carries `leadershipRank: "none"`. That string then flows through `useMembers.saveMember` (`member.leadershipRank || null` — also truthy) and gets persisted as text. Downstream, the value isn't `"R4"`/`"R5"` so the score-based path *should* take over, but because the field never round-trips back to `null`, the previous officer state isn't truly cleared, and any code path that does a truthy check (or that re-opens the dialog) treats the member as still flagged.

## Fix

1. **`src/components/MemberFormDialog.tsx`**
   - In `handleSave`, normalize: treat anything other than `"R4"` or `"R5"` as `undefined` before building the saved member.
   - Tighten the `leadershipRank` state type to `"" | "none" | "R4" | "R5"` so the sentinel is explicit.

2. **`src/hooks/use-members.ts`**
   - Defensive normalization in `saveMember`: only persist `leadership_rank` when the value is exactly `"R4"` or `"R5"`; otherwise write `null`.
   - In `rowToMember`, only treat `"R4"`/`"R5"` as a leadership rank; any other string becomes `undefined`.

3. **One-off data cleanup** (migration)
   - `UPDATE public.members SET leadership_rank = NULL WHERE leadership_rank IS NOT NULL AND leadership_rank NOT IN ('R4','R5');` to wipe any stale `"none"` rows already written.

No UI/visual changes, no schema changes.

## Files changed
- `src/components/MemberFormDialog.tsx`
- `src/hooks/use-members.ts`
- one cleanup migration
