# Accounting AI

A personal AI accountant for iOS and Android. Version 1 does one job well: **keep a tidy, ATO-ready record of tax-deductible expenses.**

1. Photograph a receipt (or pick a photo or PDF invoice) and optionally say what it was for.
2. Claude reads it: supplier, ABN, date, total, GST and line items, and writes a plain-English description.
3. The app suggests the Australian tax category (D1–D10, side business, donation, not deductible) and applies ATO rules: work-use %, the $300 depreciation limit, the instant asset write-off, DGR gifts and GST.
4. You check and confirm. The receipt and record are stored securely in Supabase (Sydney region), totalled per financial year, and exported to CSV at tax time.

> Record-keeping aid, not tax advice. Check claims on [ato.gov.au](https://www.ato.gov.au) or with a registered tax agent. Volunteering costs (fuel, travel, uniforms) are generally **not** deductible in Australia. The app records them but flags them.

## Project layout

```
apps/mobile/        Expo (React Native) app: one TypeScript codebase for iOS and Android
packages/core/      Pure domain logic: money, financial years, ATO categories and rules, CSV export
supabase/
  migrations/       Database schema, row level security, private receipt storage
  tests/database/   pgTAP tests for security and constraints
  functions/extract-receipt/   Edge Function that reads receipts with Claude
scripts/sync-core.mjs          Copies packages/core into the Edge Function before tests or deploys
docs/ARCHITECTURE.md           How the pieces fit together, and how to extend them
```

## Getting started

You need Node.js 24+. Deno and the Supabase CLI are installed as npm dev dependencies, so run them with `npx`.

```bash
npm install
npm test                 # core + mobile unit tests
npm run test:functions   # Edge Function tests (Deno)
npm run lint && npm run typecheck
```

### 1. Create the Supabase backend

1. Create a project at [supabase.com](https://supabase.com) in the **Sydney (ap-southeast-2)** region.
2. Link it and apply the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. Set the Edge Function secrets and deploy:
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... ALLOWED_USER_EMAILS=you@example.com
   npm run functions:deploy
   ```
   `ALLOWED_USER_EMAILS` stops anyone else who signs up from spending your Anthropic credit. After you create your own account you can also turn off **Allow new users to sign up** under Authentication > Sign In / Providers.
4. Sign-in uses a 6-digit email code. In the dashboard under Authentication > Emails, edit the **Magic Link** and **Confirm signup** templates so they include `{{ .Token }}`. You can copy `supabase/templates/sign-in-code.html`, or run `npx supabase config push`.

### 2. Run the app on your phone

```bash
cp apps/mobile/.env.example apps/mobile/.env.local   # then fill in your project URL and publishable key
cd apps/mobile && npx expo start
```

Scan the QR code with **Expo Go** on Android or iPhone. If the phone can't connect (for example on a work network), use `npx expo start --tunnel`.

### 3. Install a standalone Android app (APK)

EAS builds the APK in the cloud, so you don't need Android Studio. `.env.local` is not uploaded, so the Supabase values go into the EAS `preview` environment instead. Run these from `apps/mobile`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:set --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:set --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_... --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

Open the link the build prints on your phone to download and install the APK. `eas init` and the first build add the project ID and Android package name to `app.json`, so commit that file afterwards.

iOS builds need an Apple Developer account and use `--platform ios`. Windows can't build iOS apps locally.

### 4. Check the AI against sample receipts

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run eval:receipts
```

This runs real Claude API calls (a few cents each) on six synthetic receipts. Each one targets a rule: a work cable, a part-private laptop with a day-first date, a charity donation, volunteering fuel, a business subscription and groceries. Run it whenever you change the prompt, schema or model.

## Testing

| Layer | Command | What it covers |
| --- | --- | --- |
| Domain rules | `npm test -w @accounting-ai/core` | Money, financial years, ABN checksum, every ATO rule and flag, CSV export, schema/database drift |
| Mobile app | `npm test -w @accounting-ai/mobile` | Screens with in-memory fake services: capture, review and confirm, list totals, export, settings, sign-in |
| Edge Function | `npm run test:functions` | Request handling, auth and allowlist, Claude request shape, refusal / truncation / API error handling |
| Database | `npm run db:start`, then `npm run db:test` (needs Docker) | Row level security between users, storage folder isolation, constraints, generated financial year |
| AI quality | `npm run eval:receipts` (costs money) | Real extraction accuracy on known receipts |

## How AI is used

- Model: `claude-opus-5-5` at medium effort, called **only from the Edge Function**. The API key never ships in the app.
- Structured outputs constrain Claude's reply to the `ReceiptExtraction` schema in `packages/core/src/extraction.ts`, and the reply is validated again in code.
- Server-side refusal fallback (`fallbacks: "default"`) is on. If a safety classifier wrongly declines a receipt, Anthropic retries it on its recommended fallback model.
- The AI only **reads and classifies**. Dollar thresholds and tax rules are plain, unit-tested code in `packages/core/src/tax/au/`.
- Every extraction stores the model, token usage and raw result on the expense for audit. Typical cost is a few US cents per receipt.

## Updating ATO thresholds

Thresholds change with legislation. Before each financial year (1 July), check the values in `packages/core/src/tax/au/thresholds.ts` against ato.gov.au. Then add an entry for the new year and update `verifiedOn`. Until that is done, expenses in the new year show a "Rules not yet updated for this year" note.
