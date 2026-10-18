# Architecture

## Layers

```
┌──────────────────────────── apps/mobile ─────────────────────────────┐
│ src/app/            Routes (expo-router). Thin: read params, navigate │
│ src/features/*      Screens + hooks per feature (auth, capture,       │
│                     expenses, export, settings). Public API = index.ts│
│ src/components/     Shared presentational components                  │
│ src/providers/      ServicesProvider (dependency injection), Session  │
│ src/services/       ports.ts (interfaces) + supabase/ (adapters)      │
└───────────────┬───────────────────────────────────────┬──────────────┘
                │ imports                                │ HTTPS (user JWT)
┌───────────────▼──────────────┐       ┌─────────────────▼──────────────┐
│ packages/core                │◄──────│ supabase/functions/            │
│ Pure TypeScript, no I/O:     │ copied│   extract-receipt (Deno)       │
│ money, financial years, ABN, │ by    │ handler → store (RLS) +        │
│ categories, ATO rules, CSV,  │ sync- │ claude-extractor → Claude API  │
│ AI output schema             │ core  └─────────────────┬──────────────┘
└──────────────────────────────┘                         │
                                       ┌─────────────────▼──────────────┐
                                       │ Postgres + Storage (Supabase)  │
                                       │ RLS: each user sees own rows   │
                                       └────────────────────────────────┘
```

Rules that keep it modular. ESLint enforces the first three:

- `packages/core` imports nothing from React, Expo, Supabase or Node. It runs unchanged in the app (Metro), in Jest and in the Edge Function (Deno).
- Only `apps/mobile/src/services/supabase/` imports `@supabase/supabase-js`. Everything else uses the interfaces in `services/ports.ts`, so swapping the backend means writing new adapters.
- Features import each other only through their `index.ts`.
- Screens take callbacks (`onDone`, `onOpenExpense`) instead of using the router, so they can be tested without navigation. Route files connect them to expo-router.
- The AI reads and classifies. Deterministic code (`tax/au/assess.ts`) applies thresholds. Flags are always recomputed from fields and never stored, so they can't go stale.

## Receipt lifecycle

1. **Capture** (`features/capture`)
   - The photo is re-encoded as JPEG, which also converts HEIC, and shrunk to 2000 px.
   - It is uploaded to `receipts/<userId>/<expenseId>.jpg`.
   - An expense row is inserted with status `processing`.
2. **Read**
   - The app calls the `extract-receipt` Edge Function.
   - The function uses the caller's JWT, so RLS applies. It loads the row and file, then calls Claude with a structured-output schema.
   - It validates and normalizes the reply (`normalizeExtraction`), then saves the fields with status `needs_review`. On failure it saves `failed` with a reason the user can act on.
3. **Review** (`features/expenses`)
   - The form is pre-filled. Fields the AI was unsure of say "please check".
   - A live deduction preview runs `assessExpense` as the user edits.
   - **Confirm** sets status `confirmed`.
4. **Report**
   - The list totals confirmed expenses per financial year and claim type.
   - Export writes a CSV with a UTF-8 BOM and CSV-injection guards, then opens the share sheet.

Confirmed expenses cannot be deleted. This is enforced by an RLS policy, and supports the ATO's five-year record keeping rule.

## Common changes

**Add an expense category**

1. Add the code and its `CATEGORIES` entry in `packages/core/src/tax/au/categories.ts`.
2. Add a migration that updates the `expenses.category` CHECK constraint.

`database-schema.test.ts` fails until both are done. The AI prompt, category picker, list and CSV pick the new category up automatically.

**Change a tax rule or threshold.** Edit `packages/core/src/tax/au/assess.ts` or `thresholds.ts`, and add a case to `assess.test.ts`.

**Change what the AI extracts**

1. Edit `ReceiptExtractionSchema` and `normalizeExtraction` in `packages/core/src/extraction.ts`.
2. Update the prompt in `supabase/functions/extract-receipt/prompt.ts`.
3. Map any new field in `supabase-store.ts`, and add a migration if it is stored.
4. Run `npm run eval:receipts`.

**Swap the AI model or provider.** Only `supabase/functions/extract-receipt/claude-extractor.ts` knows about the Anthropic SDK. It implements the `ReceiptExtractor` interface.

**Support another tax country.** Add `packages/core/src/tax/<country>/` alongside `au/` with its own categories, thresholds and assess function, then choose the module from user settings.

## Security notes

- The Anthropic key lives only in Edge Function secrets. The app ships only the Supabase publishable key.
- RLS is on for every table, and storage policies restrict each user to their own folder. Receipts are never overwritten (there is no update policy).
- `ALLOWED_USER_EMAILS` limits who can trigger paid AI calls.
- Receipt text is treated as data. The prompt tells Claude to ignore instructions inside it, structured outputs constrain the reply, and nothing from the reply is executed.
