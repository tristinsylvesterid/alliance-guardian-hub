## Goal

Let admins reset any user's password and delete user accounts directly from the User Management page (`/admin`).

## UI changes (`src/routes/admin.tsx`)

Add two action buttons to each row in the users table (next to the existing role/created columns):

- **Reset Password** (key icon) — opens a dialog with a new-password input (min 8 chars) + confirm field, then "Set Password" button.
- **Delete Account** (trash icon) — opens an AlertDialog confirming the user's display name, then "Delete Account" button. Hidden/disabled for the row matching the current signed-in admin (no self-delete).

Both show toast feedback on success/failure and refresh the user list.

## Backend (extend existing `create-officer` pattern)

Create two new edge functions following the same admin-verification pattern already used by `create-officer` (verify caller has `admin` role via service role client):

1. **`supabase/functions/reset-user-password/index.ts`**
   - Input: `{ userId: string, newPassword: string }`
   - Validates caller is admin, password ≥ 8 chars
   - Calls `adminClient.auth.admin.updateUserById(userId, { password })`

2. **`supabase/functions/delete-user/index.ts`**
   - Input: `{ userId: string }`
   - Validates caller is admin and `userId !== caller.id` (defense in depth against self-delete)
   - Calls `adminClient.auth.admin.deleteUser(userId)` — cascades to `profiles` and `user_roles` via existing FK `ON DELETE CASCADE`

Both return `{ success: true }` or `{ error }` with proper status codes and CORS headers matching the existing function.

## Out of scope

- No user self-service "forgot password" email flow (usernames here aren't real emails — `@nova.local`).
- No schema changes; existing cascade deletes handle profile/role cleanup.
- No changes to other routes.

## Files

- Edit: `src/routes/admin.tsx`
- Create: `supabase/functions/reset-user-password/index.ts`
- Create: `supabase/functions/delete-user/index.ts`
