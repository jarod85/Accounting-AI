/**
 * Entry point: wires the handler to Supabase and Claude using environment variables.
 *
 * Secrets (set with `supabase secrets set NAME=value`, or supabase/functions/.env locally):
 * - ANTHROPIC_API_KEY      required
 * - ALLOWED_USER_EMAILS    optional, comma-separated; when set, only these accounts can call this function
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase automatically.
 */

import type { IsoDate } from '../_shared/core/index.ts';
import { createAnthropicMessageSender, createClaudeExtractor } from './claude-extractor.ts';
import { createHandler } from './handler.ts';
import { createSupabaseAuthenticator } from './supabase-store.ts';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

function parseAllowedEmails(value: string | undefined): ReadonlySet<string> | null {
  const emails = (value ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return emails.length > 0 ? new Set(emails) : null;
}

/** Receipts are Australian, so "today" is today in Sydney whatever the server's time zone. */
function todayInSydney(): IsoDate {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
}

const handler = createHandler({
  authenticate: createSupabaseAuthenticator(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_ANON_KEY'),
  ),
  extractor: createClaudeExtractor(createAnthropicMessageSender(requireEnv('ANTHROPIC_API_KEY'))),
  allowedEmails: parseAllowedEmails(Deno.env.get('ALLOWED_USER_EMAILS')),
  today: todayInSydney,
});

Deno.serve(handler);
