/**
 * CSV export of a financial year's confirmed expenses, ready to hand to a tax
 * agent or open in a spreadsheet.
 */

import { formatAbn } from '../abn.ts';
import type { Expense } from '../expense.ts';
import { formatFinancialYear, type FinancialYear } from '../financial-year.ts';
import { formatDecimal } from '../money.ts';
import { confirmedExpensesIn } from '../summary.ts';
import { assessExpense, type TaxProfile } from '../tax/au/assess.ts';
import { CATEGORIES, CLAIM_TYPE_LABELS } from '../tax/au/categories.ts';
import { FLAG_INFO } from '../tax/au/flags.ts';

const COLUMNS = [
  'Date',
  'Financial year',
  'Supplier',
  'ABN',
  'Description',
  'Claim type',
  'Category',
  'Tax return label',
  'Total (AUD)',
  'GST (AUD)',
  'Work use %',
  'Deductible (AUD)',
  'Deduction method',
  'Review notes',
  'Your notes',
  'Receipt file',
] as const;

/** Tells Excel the file is UTF-8, so characters like the "–" in "2026–27" display correctly. */
const UTF8_BOM = String.fromCharCode(0xfeff);

export function expensesToCsv(
  expenses: readonly Expense[],
  financialYear: FinancialYear,
  profile: TaxProfile,
): string {
  const rows = confirmedExpensesIn(expenses, financialYear).map((expense) => {
    const assessment = assessExpense(expense, profile);
    const category = expense.category ? CATEGORIES[expense.category] : null;
    return [
      expense.purchaseDate ?? '',
      formatFinancialYear(financialYear),
      expense.merchantName ?? '',
      expense.merchantAbn ? formatAbn(expense.merchantAbn) : '',
      expense.description,
      assessment.claimType ? CLAIM_TYPE_LABELS[assessment.claimType] : '',
      category?.label ?? '',
      category?.taxReturnLabel ?? '',
      expense.totalCents === null ? '' : formatDecimal(expense.totalCents),
      expense.gstCents === null ? '' : formatDecimal(expense.gstCents),
      String(expense.workUsePercent),
      formatDecimal(assessment.claimableCents),
      assessment.method,
      assessment.flags.map((flag) => FLAG_INFO[flag].title).join('; '),
      expense.userNote ?? '',
      expense.receiptPath,
    ];
  });
  const lines = [COLUMNS, ...rows].map((row) => row.map(toCsvCell).join(','));
  return UTF8_BOM + lines.join('\r\n') + '\r\n';
}

/**
 * Quotes a cell when needed. Text starting with = + - @ is prefixed with an
 * apostrophe so spreadsheet apps do not run it as a formula (CSV injection).
 */
export function toCsvCell(value: string): string {
  const isNumber = /^-?\d+(\.\d+)?$/.test(value);
  const safe = !isNumber && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
