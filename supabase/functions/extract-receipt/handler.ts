/**
 * HTTP handler for POST /extract-receipt { expenseId }.
 *
 * 1. Identify the caller from their JWT (and check the optional email allowlist).
 * 2. Load the expense and its receipt file, as that user (RLS applies).
 * 3. Ask the extractor to read it.
 * 4. Save the result: `needs_review` with the extracted fields, or `failed` with a reason.
 *
 * All I/O is injected through `HandlerDependencies`, so tests run without a
 * network, database or API key.
 */

import { z } from 'zod';

import {
  DEFAULT_USER_SETTINGS,
  type ExpenseStatus,
  type ExtractedFields,
  type IsoDate,
  normalizeExtraction,
  type ReceiptMimeType,
  type UserSettings,
} from '../_shared/core/index.ts';
import type { ExtractionAudit, ReceiptExtractor } from './claude-extractor.ts';

/** The expense columns the handler needs. */
export interface StoredReceipt {
  id: string;
  status: ExpenseStatus;
  receiptPath: string;
  receiptMimeType: ReceiptMimeType;
  userNote: string | null;
}

export type ExtractionResult =
  | { status: 'needs_review'; fields: ExtractedFields; audit: ExtractionAudit }
  | { status: 'failed'; failureReason: string; audit: ExtractionAudit | null };

/** Database and storage access, already scoped to the signed-in user. */
export interface ExpenseStore {
  findExpense(expenseId: string): Promise<StoredReceipt | null>;
  /** Null when the user has not saved settings yet. */
  findSettings(): Promise<UserSettings | null>;
  downloadReceipt(receiptPath: string): Promise<Uint8Array>;
  saveResult(expenseId: string, result: ExtractionResult): Promise<void>;
}

export interface SignedInUser {
  email: string | null;
  store: ExpenseStore;
}

export interface HandlerDependencies {
  /** Returns null when the token is missing, expired or invalid. */
  authenticate(authorizationHeader: string): Promise<SignedInUser | null>;
  extractor: ReceiptExtractor;
  /** When set, only these (lower-case) emails may use the function. Protects your API bill. */
  allowedEmails: ReadonlySet<string> | null;
  today(): IsoDate;
}

const RequestBodySchema = z.object({ expenseId: z.uuid() });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createHandler(deps: HandlerDependencies): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return jsonResponse(405, { error: 'Use POST.' });
    }

    try {
      const user = await deps.authenticate(request.headers.get('Authorization') ?? '');
      if (!user) {
        return jsonResponse(401, { error: 'Please sign in again.' });
      }
      if (deps.allowedEmails && !deps.allowedEmails.has(user.email?.toLowerCase() ?? '')) {
        return jsonResponse(403, { error: 'This account is not allowed to use receipt reading.' });
      }

      const body = RequestBodySchema.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return jsonResponse(400, { error: 'Send a JSON body like { "expenseId": "<uuid>" }.' });
      }

      const expense = await user.store.findExpense(body.data.expenseId);
      if (!expense) {
        return jsonResponse(404, { error: 'Expense not found.' });
      }
      if (expense.status === 'confirmed') {
        return jsonResponse(409, { error: 'This expense is already confirmed.' });
      }

      const result = await readReceipt(user.store, expense, deps);
      await user.store.saveResult(expense.id, result);
      return jsonResponse(200, {
        status: result.status,
        failureReason: result.status === 'failed' ? result.failureReason : null,
      });
    } catch (error) {
      console.error('extract-receipt failed', error);
      return jsonResponse(500, { error: 'Something went wrong. Try again.' });
    }
  };
}

async function readReceipt(
  store: ExpenseStore,
  expense: StoredReceipt,
  deps: HandlerDependencies,
): Promise<ExtractionResult> {
  let file: Uint8Array;
  try {
    file = await store.downloadReceipt(expense.receiptPath);
  } catch (error) {
    console.error('Could not download receipt', expense.receiptPath, error);
    return { status: 'failed', failureReason: 'Could not open the receipt file.', audit: null };
  }

  const outcome = await deps.extractor.extract({
    file,
    mimeType: expense.receiptMimeType,
    userNote: expense.userNote,
    settings: (await store.findSettings()) ?? DEFAULT_USER_SETTINGS,
    today: deps.today(),
  });

  if (!outcome.ok) {
    return { status: 'failed', failureReason: outcome.reason, audit: outcome.audit };
  }
  if (!outcome.extraction.isReceipt) {
    return {
      status: 'failed',
      failureReason: "This doesn't look like a receipt. Try a clearer photo or a different file.",
      audit: outcome.audit,
    };
  }
  return {
    status: 'needs_review',
    fields: normalizeExtraction(outcome.extraction),
    audit: outcome.audit,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
