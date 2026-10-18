/**
 * The contract between the AI and the rest of the app.
 *
 * `ReceiptExtractionSchema` is sent to Claude as a structured-output schema, so
 * Claude's reply always has this shape. The schema stays simple (no numeric
 * ranges or string patterns) because structured outputs support only part of
 * JSON Schema. `normalizeExtraction` then enforces the finer rules in code.
 */

import { z } from 'zod';

import { isValidAbn, normalizeAbn } from './abn.ts';
import type { ReviewableField } from './expense.ts';
import { isIsoDate, type IsoDate } from './financial-year.ts';
import type { Cents } from './money.ts';
import { CATEGORY_CODES, type Category } from './tax/au/categories.ts';

const ConfidenceSchema = z.enum(['low', 'medium', 'high']);

export const ReceiptExtractionSchema = z.object({
  isReceipt: z
    .boolean()
    .describe('False when the file is not a receipt, invoice or other proof of purchase.'),
  merchantName: z.string().nullable().describe('Business that was paid, as printed.'),
  merchantAbn: z.string().nullable().describe('ABN printed on the receipt (11 digits), else null.'),
  purchaseDate: z.string().nullable().describe('Date of purchase as YYYY-MM-DD, else null.'),
  currency: z.string().describe('ISO 4217 currency code. Use AUD unless another is shown.'),
  totalCents: z.number().int().nullable().describe('Total paid including GST, in cents.'),
  gstCents: z.number().int().nullable().describe('GST amount in cents if shown, else null.'),
  lineItems: z.array(
    z.object({
      description: z.string(),
      amountCents: z.number().int().nullable(),
    }),
  ),
  suggestedCategory: z.enum(CATEGORY_CODES),
  suggestedWorkUsePercent: z
    .number()
    .int()
    .describe('Estimated share of use for work or business, 0 to 100.'),
  isAsset: z
    .boolean()
    .describe('True for durable items used over time (laptop, tools, furniture, phone).'),
  description: z
    .string()
    .describe('One or two plain sentences: what was bought and how it relates to earning income.'),
  rationale: z.string().describe('Why this category was chosen, in one or two sentences.'),
  confidence: z.object({
    merchantName: ConfidenceSchema,
    purchaseDate: ConfidenceSchema,
    totalCents: ConfidenceSchema,
    category: ConfidenceSchema,
  }),
});

export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

/** Extraction results cleaned up and mapped onto Expense field names. */
export interface ExtractedFields {
  merchantName: string | null;
  merchantAbn: string | null;
  purchaseDate: IsoDate | null;
  totalCents: Cents | null;
  gstCents: Cents | null;
  currency: string;
  category: Category;
  workUsePercent: number;
  isAsset: boolean;
  description: string;
  aiRationale: string;
  lowConfidenceFields: ReviewableField[];
}

/**
 * Applies the rules the schema cannot express. Anything implausible becomes
 * null (and is flagged for review) rather than being stored as a wrong value.
 */
export function normalizeExtraction(extraction: ReceiptExtraction): ExtractedFields {
  const totalCents = isNonNegativeInteger(extraction.totalCents) ? extraction.totalCents : null;
  const gstCents =
    isNonNegativeInteger(extraction.gstCents) &&
    (totalCents === null || extraction.gstCents <= totalCents)
      ? extraction.gstCents
      : null;
  const abnDigits = extraction.merchantAbn ? normalizeAbn(extraction.merchantAbn) : '';
  const purchaseDate =
    extraction.purchaseDate && isIsoDate(extraction.purchaseDate) ? extraction.purchaseDate : null;
  const currency = /^[A-Za-z]{3}$/.test(extraction.currency.trim())
    ? extraction.currency.trim().toUpperCase()
    : 'AUD';

  const values: Record<ReviewableField, unknown> = {
    merchantName: extraction.merchantName,
    purchaseDate,
    totalCents,
    category: extraction.suggestedCategory,
  };
  const lowConfidenceFields = (Object.keys(values) as ReviewableField[]).filter(
    (field) => values[field] === null || extraction.confidence[field] === 'low',
  );

  return {
    merchantName: extraction.merchantName?.trim() || null,
    merchantAbn: isValidAbn(abnDigits) ? abnDigits : null,
    purchaseDate,
    totalCents,
    gstCents,
    currency,
    category: extraction.suggestedCategory,
    workUsePercent: Math.min(100, Math.max(0, Math.round(extraction.suggestedWorkUsePercent))),
    isAsset: extraction.isAsset,
    description: extraction.description.trim(),
    aiRationale: extraction.rationale.trim(),
    lowConfidenceFields,
  };
}

function isNonNegativeInteger(value: number | null): value is number {
  return value !== null && Number.isInteger(value) && value >= 0;
}
