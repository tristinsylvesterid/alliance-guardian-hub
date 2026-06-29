## Goal

New events should be toggleable on/off by default, like Glory War and (now) Capital.

## Changes

1. **`src/hooks/use-event-types.ts`** — flip the `addEventType` default and the insert in the seed-defaults path so newly created events are optional:
   - line 26 (seed insert): `is_optional: false` → `is_optional: true`
   - line 69: `addEventType(name: string, isOptional = false)` → `isOptional = true`

2. **Schema default** — change the `event_types.is_optional` column default to `true` via migration, so any insert that omits the column also gets a toggle:
   ```sql
   ALTER TABLE public.event_types ALTER COLUMN is_optional SET DEFAULT true;
   ```
   Existing rows are unchanged — only Capital and Glory War remain optional. Core events (SvS, AvA, etc.) keep their current `is_optional = false`.

## Out of Scope

- No change to existing event rows' optional status.
- No UI changes — the toggle already renders automatically when `is_optional = true`.
