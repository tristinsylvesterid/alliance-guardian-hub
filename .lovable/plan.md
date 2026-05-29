## Problem

Uploading ~9 AvA ranking screenshots and clicking **Parse** appears to do nothing — no toast, no result. Boolean-event parsing works because it usually involves fewer/smaller images and a trivial JSON shape.

Root cause: `ImportScreenshotsDialog.handleParse` sends **all** images in one `parseEventScreenshot` server-fn call. Nine ~880×1900 PNGs base64-encoded into a single JSON-RPC body is ~15–25 MB, and asking Gemini to reason over 9 images at once is slow. The call hits a size/timeout limit at the worker or gateway and never resolves — the `try/catch` never fires because the promise just hangs, leaving the spinner spinning with no log on the server side (confirmed: no server-function logs for `parseEventScreenshot` at all).

## Fix

Process images **one at a time** on the client, calling `parseEventScreenshot` per image, then merge + dedupe rows. This:
- keeps each request small and fast
- gives the user visible progress ("Parsing 3 / 9…")
- lets one bad image fail without killing the whole batch
- surfaces real errors (the existing 402/429/gateway error messages will actually reach a toast)

### Changes

**`src/components/ImportScreenshotsDialog.tsx`**
- Replace single-shot `handleParse` with a loop over `files`, calling `parseFn` with one image at a time.
- Track progress in state (`parsedCount` / `totalCount`) and show it in the Parse button label.
- Collect rows across calls, then dedupe:
  - rank mode: keep first occurrence per `rank`, sort ascending
  - status mode: keep first occurrence per lowercased `name`
- If a single image fails, `console.error` it, show a non-blocking warning toast, and continue with the rest. Only show a hard error if **every** image fails.
- Run the AI matching pass once at the end on the merged rows (unchanged logic).

**`src/lib/screenshot-import.functions.ts`**
- Lower the `images` cap from 10 → 3 as a defensive guard (we'll only ever send 1 from the new client, but keeping a small ceiling prevents accidental regressions).
- Add a `console.log` at handler entry with `inputType` and image count so future failures show up in server logs.

No DB, route, or schema changes. No UI restructuring beyond the progress label.

### Out of scope

- Client-side image downscaling (could add later if individual screenshots are still too large, but the originals here are ~1 MB each and Gemini handles them fine one-by-one).
- Parallelizing the per-image calls (sequential is fine for ≤10 images and avoids rate-limit 429s).