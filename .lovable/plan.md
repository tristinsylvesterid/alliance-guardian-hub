

# Add "Last Updated" Column to Member Roster

## What Changes

A new "Last Updated" date column on the members table, showing when each member's profile was last modified. This helps officers spot stale profiles at a glance.

## Implementation

The `members` table already has an `updated_at` column, and an `update_updated_at_column()` trigger function exists — but the trigger is not currently attached to the `members` table.

### 1. Attach the update trigger (migration)
```sql
CREATE TRIGGER set_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 2. Add `updatedAt` to the Member type
In `src/lib/mock-data.ts`, add `updatedAt?: string` to the `Member` interface.

### 3. Pass `updated_at` through in the hook
In `src/hooks/use-members.ts`, add `updated_at` to `rowToMember` and map it to `updatedAt`.

### 4. Show "Last Updated" column in the roster
In `src/routes/members.tsx`, add a column after Score (before metrics) that displays the date formatted as a short date (e.g., "Apr 14, 2026"). Stale profiles (e.g., >30 days) could be shown in a dimmer/warning color for quick visual identification.

## Scope
- 1 migration (attach trigger)
- 3 files edited: `mock-data.ts`, `use-members.ts`, `members.tsx`

