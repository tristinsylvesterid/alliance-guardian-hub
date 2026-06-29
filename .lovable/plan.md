## Goal

Two unrelated tweaks:
1. **Events page** — add an on/off toggle for the **Capital** event (same UX as Glory War / SvS) since capital isn't run every week.
2. **Members page** — color-code the **Last Updated** column to flag stale data: amber at 15+ days, red at 30+ days, with colors chosen for strong contrast on the dark card background so the date stays easily readable.

## 1. Capital toggle

The events page already renders a toggle for any event type where `hasSvsToggle || isOptional` is true (`src/routes/events.tsx`). Glory War uses `is_optional = true`. Capital currently has both flags false, so no toggle shows.

**Change:** flip `is_optional = true` for the `capital` event type via a one-line migration:

```sql
UPDATE public.event_types SET is_optional = true WHERE key = 'capital';
```

No code changes needed — the existing toggle UI, the `setEventActive` / `isEventActive` plumbing, and the archive logic (which already treats `isOptional` events as gated by their toggle) pick it up automatically.

## 2. Stale "Last Updated" indicator

In `src/routes/members.tsx` (~lines 188–199) the Last Updated cell currently colors text orange only when `daysSince > 30`. Replace with a three-tier scheme using semantic tokens so the colors stay readable on the dark card:

- `daysSince >= 30` → **red, high contrast**: add a new `--color-warn-stale` token in `src/styles.css` at roughly `oklch(0.78 0.18 25)` (bright coral-red, similar lightness to existing `--gold`) and apply via `text-warn-stale font-semibold`. The existing `--destructive` token sits at `oklch(0.60 …)` which is too dark on the card surface (`oklch(0.17 …)`) for small numerals — we want lightness ≥ 0.75 for body text on this background.
- `daysSince >= 15` → **amber, high contrast**: add `--color-warn-aging` at roughly `oklch(0.82 0.16 85)` (warm amber, lightness matched to gold) and apply via `text-warn-aging font-medium`.
- otherwise → keep existing `text-muted-foreground`.

Both new tokens added under `@theme inline` in `src/styles.css` so the Tailwind utilities (`text-warn-stale`, `text-warn-aging`) compile. No font-size change; `font-semibold` / `font-medium` adds emphasis without shouting.

## Out of Scope

- No changes to other events, no rename of "Capital", no archive/snapshot logic changes.
- No new columns, filters, sort, or tooltip on the members page — only the existing Last Updated cell's color/weight changes.
- No light-mode tuning (app is dark-only).
