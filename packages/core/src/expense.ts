/**
 * The Expense entity and the validation a user's edits must pass before an
 * expense is confirmed.
 */

import { z } from 'zod';

import { isValidAbn, normalizeAbn } from './abn.ts';
import { isIsoDate, type FinancialYear } from './financial-year.ts';
import type { AssessableExpense } from './tax/au/assess.ts';
import { CATEGORY_CODES } from './tax/au/categories.ts';

/**
 * Lifecycle: an expense is created as `processing` when its receipt is uploaded,
 * moves to `needs_review` once the AI has read it (or `failed`), and becomes
 * `confirmed` when the user has checked the details.
 */
export const EXPENSE_STATUSES = ['processing', 'needs_review', 'confirmed', 'failed'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** File types Claude can read. Phone photos are converted to JPEG before upload. */
export const RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

/** Fields the AI could not read confidently; the review screen highlights them. */
export const REVIEWABLE_FIELDS = [
  'merchantName',
  'purchaseDate',
  'totalCents',
  'category',
] as const;
export type ReviewableField = (typeof REVIEWABLE_FIELDS)[number];

export interface Expense extends AssessableExpense {
  id: string;
  status: ExpenseStatus;
  /** Derived from `purchaseDate` by the database. */
  financialYear: FinancialYear | null;
  userNote: string | null;
  aiRationale: string | null;
  lowConfidenceFields: ReviewableField[];
  receiptPath: string;
  receiptMimeType: ReceiptMimeType;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The details a user confirms on the review screen. */
export const ExpenseDetailsSchema = z
  .object({
    merchantName: z.string().trim().min(1, 'Enter who you paid'),
    merchantAbn: z
      .string()
      .nullable()
      .refine((abn) => abn === null || isValidAbn(abn), 'Not a valid ABN')
      .transform((abn) => (abn === null ? null : normalizeAbn(abn))),
    purchaseDate: z.string().refine(isIsoDate, 'Enter a valid date'),
    totalCents: z.number().int().positive('Enter the amount paid'),
    gstCents: z.number().int().nonnegative().nullable(),
    currency: z.string().length(3),
    category: z.enum(CATEGORY_CODES, { error: 'Choose a category' }),
    workUsePercent: z.number().int().min(0).max(100),
    isAsset: z.boolean(),
    description: z.string().trim().min(1, 'Describe what was bought and why'),
    userNote: z.string().nullable(),
  })
  .refine((details) => details.gstCents === null || details.gstCents <= details.totalCents, {
    path: ['gstCents'],
    message: 'GST cannot be more than the total',
  });

export type ExpenseDetails = z.output<typeof ExpenseDetailsSchema>;
