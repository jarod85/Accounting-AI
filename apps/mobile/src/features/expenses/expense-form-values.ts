/**
 * Converts between an Expense and the strings shown in the review form.
 * Users type "$1,234.50" and "15/08/2026"; the domain wants cents and ISO
 * dates. Keeping this pure makes the form's rules easy to test.
 */

import {
  type Assessment,
  assessExpense,
  type Category,
  type Expense,
  type ExpenseDetails,
  ExpenseDetailsSchema,
  formatAbn,
  formatAustralianDate,
  formatDecimal,
  parseAustralianDate,
  parseDollarsInput,
  type TaxProfile,
} from '@accounting-ai/core';

export interface ExpenseFormValues {
  merchantName: string;
  merchantAbn: string;
  /** Day first: DD/MM/YYYY. */
  purchaseDate: string;
  total: string;
  gst: string;
  category: Category | '';
  workUsePercent: string;
  isAsset: boolean;
  description: string;
  userNote: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

export type ParsedForm =
  { ok: true; details: ExpenseDetails } | { ok: false; errors: ExpenseFormErrors };

export function toFormValues(expense: Expense): ExpenseFormValues {
  return {
    merchantName: expense.merchantName ?? '',
    merchantAbn: expense.merchantAbn ? formatAbn(expense.merchantAbn) : '',
    purchaseDate: expense.purchaseDate ? formatAustralianDate(expense.purchaseDate) : '',
    total: expense.totalCents === null ? '' : formatDecimal(expense.totalCents),
    gst: expense.gstCents === null ? '' : formatDecimal(expense.gstCents),
    category: expense.category ?? '',
    workUsePercent: String(expense.workUsePercent),
    isAsset: expense.isAsset,
    description: expense.description,
    userNote: expense.userNote ?? '',
  };
}

/** Maps a details field (domain name) back to the form field the user edits. */
const FORM_FIELD_FOR: Record<keyof ExpenseDetails, keyof ExpenseFormValues | null> = {
  merchantName: 'merchantName',
  merchantAbn: 'merchantAbn',
  purchaseDate: 'purchaseDate',
  totalCents: 'total',
  gstCents: 'gst',
  currency: null,
  category: 'category',
  workUsePercent: 'workUsePercent',
  isAsset: 'isAsset',
  description: 'description',
  userNote: 'userNote',
};

/** Validates the form. On success returns details ready to save. */
export function parseFormValues(values: ExpenseFormValues, currency: string): ParsedForm {
  const errors: ExpenseFormErrors = {};
  const totalCents = parseDollarsInput(values.total);
  const gstCents = values.gst.trim() ? parseDollarsInput(values.gst) : null;
  const purchaseDate = parseAustralianDate(values.purchaseDate);
  const workUsePercent = /^\d{1,3}$/.test(values.workUsePercent.trim())
    ? Number(values.workUsePercent)
    : NaN;

  if (totalCents === null) errors.total = 'Enter the amount paid, e.g. 24.95';
  if (values.gst.trim() && gstCents === null) errors.gst = 'Enter GST as an amount, e.g. 2.27';
  if (purchaseDate === null) errors.purchaseDate = 'Enter the date as DD/MM/YYYY';
  if (Number.isNaN(workUsePercent)) errors.workUsePercent = 'Enter a whole number from 0 to 100';

  const result = ExpenseDetailsSchema.safeParse({
    merchantName: values.merchantName,
    merchantAbn: values.merchantAbn.trim() || null,
    purchaseDate: purchaseDate ?? '',
    totalCents: totalCents ?? 0,
    gstCents,
    currency,
    category: values.category || undefined,
    workUsePercent: Number.isNaN(workUsePercent) ? 0 : workUsePercent,
    isAsset: values.isAsset,
    description: values.description,
    userNote: values.userNote.trim() || null,
  });

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = FORM_FIELD_FOR[issue.path[0] as keyof ExpenseDetails];
      // Keep the friendlier message set above when there is one.
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }
  if (Object.keys(errors).length > 0 || !result.success) {
    return { ok: false, errors };
  }
  return { ok: true, details: result.data };
}

/** Live preview of the deduction while the user edits. Unparseable fields count as missing. */
export function previewAssessment(
  values: ExpenseFormValues,
  currency: string,
  profile: TaxProfile,
): Assessment {
  return assessExpense(
    {
      merchantName: values.merchantName,
      merchantAbn: values.merchantAbn.trim() || null,
      purchaseDate: parseAustralianDate(values.purchaseDate),
      totalCents: parseDollarsInput(values.total),
      gstCents: values.gst.trim() ? parseDollarsInput(values.gst) : null,
      currency,
      category: values.category || null,
      workUsePercent: Number(values.workUsePercent) || 0,
      isAsset: values.isAsset,
      description: values.description,
    },
    profile,
  );
}
