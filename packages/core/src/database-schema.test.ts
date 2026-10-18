/**
 * Guards against drift between this package's enums and the CHECK constraints
 * in the database migrations. If you add a category, status or file type,
 * write a migration that updates the matching constraint.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EXPENSE_STATUSES, RECEIPT_MIME_TYPES, REVIEWABLE_FIELDS } from './expense.ts';
import { CATEGORY_CODES } from './tax/au/categories.ts';

const MIGRATIONS_DIR = join(__dirname, '../../../supabase/migrations');

function allMigrationsSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
    .join('\n');
}

/** Returns the quoted values in the last `check (<column> in (...))` or `<@ array[...]` for a column. */
function allowedValuesFor(column: string): string[] {
  const pattern = new RegExp(`check \\(${column} (?:in \\(|<@ array\\[)([^)\\]]*)[)\\]]`, 'g');
  const matches = [...allMigrationsSql().matchAll(pattern)];
  const lastMatch = matches.at(-1);
  if (!lastMatch?.[1]) {
    throw new Error(`No CHECK constraint found for column "${column}"`);
  }
  return [...lastMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1] as string).sort();
}

describe('database schema matches core enums', () => {
  it.each([
    ['category', CATEGORY_CODES],
    ['status', EXPENSE_STATUSES],
    ['receipt_mime_type', RECEIPT_MIME_TYPES],
    ['low_confidence_fields', REVIEWABLE_FIELDS],
  ])('%s', (column, values) => {
    expect(allowedValuesFor(column)).toEqual([...values].sort());
  });
});
