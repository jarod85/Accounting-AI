/**
 * Totals for the expense list: per financial year, then per claim type and
 * category. Only confirmed expenses count towards totals.
 */

import type { Expense } from './expense.ts';
import type { FinancialYear } from './financial-year.ts';
import type { Cents } from './money.ts';
import { assessExpense, type TaxProfile } from './tax/au/assess.ts';
import {
  CATEGORY_CODES,
  CLAIM_TYPES,
  claimTypeOf,
  type Category,
  type ClaimType,
} from './tax/au/categories.ts';

export interface CategoryTotal {
  category: Category;
  count: number;
  totalCents: Cents;
  claimableCents: Cents;
}

export interface ClaimTypeTotal {
  claimType: ClaimType;
  claimableCents: Cents;
  categories: CategoryTotal[];
}

export interface FinancialYearSummary {
  financialYear: FinancialYear;
  count: number;
  totalCents: Cents;
  claimableCents: Cents;
  /** Only claim types that have at least one expense, in display order. */
  byClaimType: ClaimTypeTotal[];
}

/** Financial years that have at least one expense, newest first. */
export function financialYearsWithExpenses(expenses: readonly Expense[]): FinancialYear[] {
  const years = new Set<FinancialYear>();
  for (const expense of expenses) {
    if (expense.financialYear !== null) {
      years.add(expense.financialYear);
    }
  }
  return [...years].sort((a, b) => b - a);
}

/** Confirmed expenses in a financial year, oldest first. */
export function confirmedExpensesIn(
  expenses: readonly Expense[],
  financialYear: FinancialYear,
): Expense[] {
  return expenses
    .filter((expense) => expense.status === 'confirmed' && expense.financialYear === financialYear)
    .sort((a, b) => (a.purchaseDate ?? '').localeCompare(b.purchaseDate ?? ''));
}

export function summarizeFinancialYear(
  expenses: readonly Expense[],
  financialYear: FinancialYear,
  profile: TaxProfile,
): FinancialYearSummary {
  const totals = new Map<Category, CategoryTotal>();
  for (const expense of confirmedExpensesIn(expenses, financialYear)) {
    if (expense.category === null) {
      continue;
    }
    const total = totals.get(expense.category) ?? {
      category: expense.category,
      count: 0,
      totalCents: 0,
      claimableCents: 0,
    };
    total.count += 1;
    total.totalCents += expense.totalCents ?? 0;
    total.claimableCents += assessExpense(expense, profile).claimableCents;
    totals.set(expense.category, total);
  }

  const categoryTotals = CATEGORY_CODES.flatMap((code) => totals.get(code) ?? []);
  const byClaimType = CLAIM_TYPES.map((claimType) => {
    const categories = categoryTotals.filter((total) => claimTypeOf(total.category) === claimType);
    return { claimType, categories, claimableCents: sum(categories.map((c) => c.claimableCents)) };
  }).filter((group) => group.categories.length > 0);

  return {
    financialYear,
    count: sum(categoryTotals.map((total) => total.count)),
    totalCents: sum(categoryTotals.map((total) => total.totalCents)),
    claimableCents: sum(byClaimType.map((group) => group.claimableCents)),
    byClaimType,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
