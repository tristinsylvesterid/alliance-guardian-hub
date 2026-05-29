## Goal

Extend the existing AvA screenshot importer into a generic "Import from screenshots" flow that works for any event on the Events page. Pick an event, upload one or more screenshots, AI parses the relevant data, you review and apply.

## Behavior per event input type

- **status events** (Ice Pit 1/2/3, Glory War, Canyon Clash, SvS): screenshots are participation lists / rally rosters / kill-event leaderboards. AI extracts a list of names. Each matched member gets `status: "x"` (attended) for that event in the selected week. For SvS, the existing SvS toggle is respected.
- **rank events** (AvA): same as today — AI extracts `{ rank, name, score }` rows; applying writes `value: rank` per member and also updates `avaWeeklyScore` on the member profile (current behavior).

## UI changes

- Replace the AvA-only "Import from screenshot" button in `src/routes/events.tsx` header with a single **Import from screenshots** button.
- New `ImportScreenshotsDialog` (generalized from `AvaImportDialog`):
  1. Step 1 — pick the event (dropdown of all `eventTypes`).
  2. Step 2 — upload 1–10 screenshots with previews.
  3. Step 3 — AI parse → review table:
     - rank events: rank | parsed name | matched member (Select) | score
     - status events: parsed name | matched member (Select) | ✓ attended toggle
  4. Apply writes through the same `handleStatusChange` / `handleRankChange` already in `events.tsx`.
- Keep fuzzy name matching (`src/lib/fuzzy-match.ts`) and the per-row "Skip" / "Start over" actions.

## Server function changes (`src/lib/ava-import.functions.ts` → rename to `screenshot-import.functions.ts`)

- One function `parseEventScreenshot({ images, eventKey, inputType })`.
- System prompt branches on `inputType`:
  - `rank` → return `{ rows: [{ rank, name, score }] }` (current AvA prompt).
  - `status` → return `{ rows: [{ name }] }` — extract every player/commander name visible in the screenshots (rally participants, kill-event leaderboard names, etc.), dedupe by name.
- Same Lovable AI Gateway model (`google/gemini-2.5-flash`), same 402/429 handling, same 10-image cap.

## Files

- edit `src/routes/events.tsx` — swap button + handler
- rename/edit `src/lib/ava-import.functions.ts` → `src/lib/screenshot-import.functions.ts` (generic)
- rename/edit `src/components/AvaImportDialog.tsx` → `src/components/ImportScreenshotsDialog.tsx`
- no DB changes, no new secrets (LOVABLE_API_KEY already set)

## Caveats

- Status-event screenshots vary a lot (rally lists, kill leaderboards, march queues). The AI extracts names; the review step is where you catch misses. Same model/cost profile as AvA today.
- Only names + (for AvA) rank/score are persisted. No power/kill counts unless you later add metrics for them.
