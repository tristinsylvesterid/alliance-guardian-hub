## Goal
On the `/events` page (or a dedicated importer), let officers upload one or more AvA rankings screenshots. The app sends them to a vision model, parses out `{rank, name, score}` rows, matches each row to an existing member, and lets the officer confirm before writing `avaWeeklyScore` (the rank number) to each member's metrics.

## How it works

1. **Upload UI** — new "Import AvA from screenshot" button (on `/events`, in the AvA section). Accepts multiple images at once so a full ladder spanning several screenshots can be imported in one go.
2. **Vision parsing** — a new server function `parseAvaScreenshot` calls the Lovable AI Gateway (`google/gemini-2.5-flash`, vision-capable, cheap) with a tool-call schema that forces structured JSON:
   ```
   { rows: [{ rank: number, name: string, score: number }] }
   ```
   The prompt tells the model: ignore the `[nOva]Bright mf Star` alliance tag line, read only the bold player name + rank badge + big number on the right. Multiple images = rows merged and deduped by rank.
3. **Member matching** — client-side fuzzy match each parsed `name` against `useMembers()`:
   - exact (case-insensitive) → auto-matched
   - close match (Levenshtein ≤ 2 or substring) → suggested, needs confirm
   - no match → dropdown to pick a member or skip
4. **Review table** — modal showing every parsed row with: rank, parsed name, matched member dropdown, current AvA value → new AvA value. Officer can edit/skip rows.
5. **Apply** — on confirm, updates each matched member's `metrics.avaWeeklyScore` to the parsed rank via existing `updateMemberMetrics`. The big "score" number from the screenshot is shown for reference only (we don't have a metric for it today).

## Files

- `src/lib/ava-import.functions.ts` (new) — `parseAvaScreenshot` server function. Accepts `{ images: string[] }` (base64 data URLs), calls Lovable AI with `tool_choice` forcing the structured-output schema, returns `{ rows: [...] }`. Handles 402/429 with friendly errors.
- `src/components/AvaImportDialog.tsx` (new) — dialog with file picker (multi-image), preview thumbnails, loading state, review table with member matching, confirm button.
- `src/lib/fuzzy-match.ts` (new) — small Levenshtein helper for name matching.
- `src/routes/events.tsx` (edit) — add "Import from screenshot" button next to the AvA card.

## Notes / assumptions

- Uses **Lovable AI Gateway** (no extra API keys needed). Gemini 2.5 Flash is multimodal and cheap; one screenshot ≈ a few cents.
- We store **only the rank** (`avaWeeklyScore`), since that's what the scoring system uses. The score number is shown in the review table for context but not persisted (no metric exists for it).
- Names in screenshots may not match member names exactly — that's why we keep a confirm step rather than auto-writing.
- No DB changes.
- If the user later wants to also feed the parser screenshots from other ranking screens (Daily, Ranking tab), the same server function works — just update the prompt.
