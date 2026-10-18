# Accounting AI: notes for contributors and AI agents

Read `docs/ARCHITECTURE.md` first. `apps/mobile/AGENTS.md` has Expo-specific rules. Always use `npx expo install` for app dependencies.

## Conventions

- TypeScript strict everywhere, with `noUncheckedIndexedAccess`. Don't use `any`.
- Money is always integer cents (`Cents`). Dates are ISO `YYYY-MM-DD` strings (`IsoDate`). Format them only at the UI edge, with `formatAud` and `formatAustralianDate`.
- Financial years are named by their ending year: 2027 means 2026–27.
- Tax rules belong in `packages/core/src/tax/au/`, never in screens, the Edge Function or the prompt.
- Files are kebab-case, use named exports and hold one component per file. Route files in `src/app/` are the only default exports.
- Features import each other only via `@/features/<name>` (their `index.ts`). Only `src/services/supabase/` may import Supabase.
- Comments explain *why*, in plain English. Keep them short.

## Before you finish

```bash
npm run lint && npm run typecheck && npm test && npm run test:functions && npm run lint:functions
npm run format   # Prettier (TS workspaces); npm run format:functions for the Deno code
```

- When you change the prompt, AI schema or model, also run `npm run eval:receipts`. It needs `ANTHROPIC_API_KEY` and costs a few cents.
- When you change the database, also run `npm run db:test`. It needs Docker and `npx supabase start`.
- Never edit `supabase/functions/_shared/core/`. It is generated from `packages/core` by `npm run sync-core`.
