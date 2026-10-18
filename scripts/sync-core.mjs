// Copies packages/core/src into supabase/functions/_shared/core so the Deno Edge
// Function can import it. Supabase only deploys files inside supabase/functions,
// so the shared domain code has to live there at deploy time.
//
// The copy is generated (and gitignored): always edit packages/core, never the copy.
// Runs automatically before `npm run test:functions`, `functions:serve` and `functions:deploy`.

import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'packages', 'core', 'src');
const target = join(root, 'supabase', 'functions', '_shared', 'core');

rmSync(target, { recursive: true, force: true });
cpSync(source, target, {
  recursive: true,
  // Tests stay in packages/core; testing.ts is copied for the function tests.
  filter: (path) => !/\.test\.ts$|__snapshots__/.test(path),
});
writeFileSync(
  join(target, 'README.md'),
  '# Generated copy\n\nThis folder is copied from `packages/core/src` by `npm run sync-core`. Do not edit it.\n',
);
console.log(`Synced packages/core/src -> supabase/functions/_shared/core`);
