

# Add Power (M) to Member Profiles with SvS Sync

## What Changes

1. **New `power` column on `members` table** — A dedicated numeric column (default 0) so Power is a first-class field on each member, separate from the scoring metrics.

2. **Member form gets a Power (M) input** — Add a number field to `MemberFormDialog.tsx` for viewing/editing power. It won't affect ranking scores.

3. **SvS plan creation auto-populates power** — `createPlan` in `use-svs-plans.ts` pulls each member's `power` value instead of defaulting to 0.

4. **Editing power in SvS syncs back to member profile** — When `updateEntry` is called with a power change, it also updates the member's `power` column in the `members` table.

## Implementation Steps

| Step | What |
|------|------|
| 1 | **Migration**: `ALTER TABLE public.members ADD COLUMN power numeric NOT NULL DEFAULT 0;` |
| 2 | **`src/lib/mock-data.ts`**: Add `power: number` to `Member` interface |
| 3 | **`src/hooks/use-members.ts`**: Map `power` in `rowToMember`, include in `saveMember` upsert |
| 4 | **`src/components/MemberFormDialog.tsx`**: Add Power (M) number input field |
| 5 | **`src/hooks/use-svs-plans.ts`**: In `createPlan`, use `m.power` instead of `0`. In `updateEntry`, when power changes, also update the `members` table |

## Technical Details

**Migration SQL:**
```sql
ALTER TABLE public.members ADD COLUMN power numeric NOT NULL DEFAULT 0;
```

**SvS → Member sync** (in `updateEntry`):
```typescript
if (updates.power !== undefined) {
  await supabase.from("members").update({ power: updates.power }).eq("id", memberId);
}
```

**Member form**: Power field placed near the location coordinates section, labeled "Power (M)", number input. Not part of `metrics` — stored directly on the member row.

