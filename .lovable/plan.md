

# Change Log / Audit Trail

## What It Does

Every time an officer or admin creates, updates, or deletes data anywhere in the app (members, events, scores, SvS plans, settings), a log entry is automatically recorded with:
- **Who** made the change (user display name)
- **When** it happened
- **What table** was affected (members, event_attendance, etc.)
- **What action** was taken (insert, update, delete)
- **What changed** (before/after values stored as JSON)

Admins get a new "Change Log" page accessible from the sidebar to browse and search the history.

## How It Works

### 1. Database: `audit_log` table + trigger function

Create a new `audit_log` table:
- `id` (uuid), `created_at` (timestamp), `user_id` (uuid), `user_display_name` (text), `table_name` (text), `action` (text: INSERT/UPDATE/DELETE), `record_id` (text), `old_data` (jsonb, nullable), `new_data` (jsonb, nullable)

Create a PostgreSQL trigger function that fires AFTER INSERT/UPDATE/DELETE on all tracked tables (`members`, `event_attendance`, `weekly_events`, `archived_members`, `svs_plans`, `svs_plan_entries`, `scoring_config`, `event_types`). The function captures the old/new row data and the current authenticated user via `auth.uid()`.

RLS: Admins can read all logs. No one can insert/update/delete via the API (only the trigger writes rows, using `SECURITY DEFINER`).

### 2. New route: `/changelog`

A simple admin-only page showing a table of recent changes with:
- Timestamp, user name, table, action, and a collapsible detail showing old/new JSON
- Search/filter by table name or user
- Paginated (most recent first, 50 per page)

### 3. Sidebar update

Add "Change Log" to the nav items in `AppLayout.tsx` as an admin-only link.

## Technical Details

**Trigger approach** (vs. app-level logging): Using a database trigger means every change is captured automatically, even if we add new features later. No need to modify every hook or function.

**User identification**: The trigger reads `auth.uid()` to get the user ID, and joins to `profiles` to store the display name at the time of the change.

**Tables tracked**: members, event_attendance, weekly_events, archived_members, svs_plans, svs_plan_entries, scoring_config, event_types

**Migration SQL (summary)**:
```sql
-- audit_log table
CREATE TABLE public.audit_log (...);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Admin-only read policy
CREATE POLICY "Admins can read audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Generic trigger function (SECURITY DEFINER)
CREATE FUNCTION public.audit_trigger_fn() RETURNS trigger ...
  -- captures TG_TABLE_NAME, TG_OP, OLD, NEW, auth.uid(), profile lookup

-- Attach trigger to each tracked table
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.members FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
-- (repeated for each table)
```

## Implementation Steps

| Step | What |
|------|------|
| 1 | Create migration: `audit_log` table, trigger function, triggers on 8 tables, RLS policy |
| 2 | Create `src/routes/changelog.tsx` — admin-only page with searchable log table |
| 3 | Add "Change Log" to sidebar nav in `AppLayout.tsx` |

