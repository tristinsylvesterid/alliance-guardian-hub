

# Making Your App Operational and Shareable

Your app is already published at **https://alliance-guardian-hub.lovable.app** and publicly accessible. Here's what needs to be done to make it fully operational for your officers:

## What's Already Working
- Login system with username/password
- Your admin account (Kitty / Maroneal1)
- Admin can create officer accounts
- Database persistence for all data
- App is published and publicly accessible

## What Needs to Be Done

### 1. Fix the "Loading..." Screen Issue
The app currently appears stuck on "Loading..." in the preview. This needs to be debugged and resolved so users can actually reach the login page. This is the top priority — nothing else matters if people can't get past this screen.

### 2. Bootstrap Your Admin Account
The admin account (Kitty) was set up via an edge function, but we need to verify it actually exists in the database. If not, we'll trigger the bootstrap function to create it. Without this, you can't log in or create officer accounts.

### 3. Tighten Security (RLS Policies)
Currently all database tables have overly permissive policies (`USING (true)`) — meaning anyone with the database URL could read/write data without being logged in. We need to replace these with proper policies that require authentication:
- All tables: require `authenticated` role for SELECT/INSERT/UPDATE/DELETE
- `user_roles` and `profiles`: restrict to own records (or admin access)
- `admin`-only tables (scoring_config, event_types): restrict writes to admins

### 4. Create Officer Accounts
Once you can log in as Kitty, you'll use the Admin > User Management page to create accounts for your 5+ officers with usernames and passwords you assign.

### 5. Test the Full Flow
- Log in as Kitty
- Create an officer account
- Log out, log in as the officer
- Verify the officer can access events, members, rankings but NOT admin/settings pages
- Verify AvA rank input works and updates scores

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | Debug and fix Loading screen | Medium |
| 2 | Verify/bootstrap admin account | Small |
| 3 | Tighten RLS policies (migration) | Medium |
| 4 | Test end-to-end | Manual |

## How to Share With Officers

Once the above is done, you simply:
1. Give each officer the URL: **https://alliance-guardian-hub.lovable.app**
2. Give them the username and password you created for them
3. They open the link in any browser and log in

No app store, no install — it's a web app that works on phone and desktop browsers.

## Technical Details

**RLS Migration** — Replace all `USING (true)` / `WITH CHECK (true)` policies with:
```sql
-- Example: members table
CREATE POLICY "Authenticated users can read members"
ON public.members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and officers can modify members"
ON public.members FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'officer'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'officer'));
```

**Loading screen fix** — Will investigate the SSR/auth initialization flow to ensure the login page renders immediately for unauthenticated users.

