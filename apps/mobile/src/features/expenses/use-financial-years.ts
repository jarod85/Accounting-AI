import {
  currentFinancialYear,
  financialYearsWithExpenses,
  type Expense,
  type FinancialYear,
} from '@accounting-ai/core';
import { useState } from 'react';

/**
 * The financial years worth showing (the current one plus any with expenses,
 * newest first) and which one is selected. Defaults to the current year.
 */
export function useFinancialYears(expenses: readonly Expense[]) {
  const current = currentFinancialYear();
  const years = [...new Set([current, ...financialYearsWithExpenses(expenses)])].sort(
    (a, b) => b - a,
  );
  const [selected, setSelected] = useState<FinancialYear>(current);
  return { years, selected, setSelected };
}
