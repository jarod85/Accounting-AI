/**
 * Deterministic ATO deduction rules.
 *
 * The AI reads a receipt and suggests a category. This module then applies the
 * dollar thresholds in plain code, so the tax rules are predictable and covered
 * by unit tests. The result is advice for record keeping, not tax advice.
 */

import { isValidAbn } from '../../abn.ts';
import { financialYearOf, isIsoDate, type IsoDate } from '../../financial-year.ts';
import { applyPercent, type Cents } from '../../money.ts';
import { claimTypeOf, type Category, type ClaimType } from './categories.ts';
import type { ExpenseFlag } from './flags.ts';
import { THRESHOLDS_BY_FINANCIAL_YEAR, thresholdsFor, type AtoThresholds } from './thresholds.ts';

/** The expense fields the rules look at. */
export interface AssessableExpense {
  merchantName: string | null;
  merchantAbn: string | null;
  purchaseDate: IsoDate | null;
  totalCents: Cents | null;
  gstCents: Cents | null;
  currency: string;
  category: Category | null;
  workUsePercent: number;
  /** A durable item used over time (laptop, tools, desk), as opposed to a consumable or service. */
  isAsset: boolean;
  description: string;
}

/** The user's tax situation that changes how rules apply. */
export interface TaxProfile {
  gstRegistered: boolean;
}

/** How the deductible amount is claimed. */
export type DeductionMethod = 'immediate' | 'depreciate' | 'none';

export interface Assessment {
  claimType: ClaimType | null;
  /** The deductible amount: claimed this year when `method` is "immediate", over several years when "depreciate". */
  claimableCents: Cents;
  method: DeductionMethod;
  flags: ExpenseFlag[];
}

export function assessExpense(expense: AssessableExpense, profile: TaxProfile): Assessment {
  const flags: ExpenseFlag[] = [];

  if (hasMissingRequiredFields(expense)) {
    flags.push('MISSING_REQUIRED_FIELDS');
  }
  if (expense.currency !== 'AUD') {
    flags.push('NON_AUD_CURRENCY');
  }

  const { category, totalCents } = expense;
  if (category === null || totalCents === null) {
    return {
      claimType: category && claimTypeOf(category),
      claimableCents: 0,
      method: 'none',
      flags,
    };
  }

  const thresholds = resolveThresholds(expense.purchaseDate, flags);
  const claimType = claimTypeOf(category);
  const rules: Record<ClaimType, () => Omit<Assessment, 'claimType' | 'flags'>> = {
    not_deductible: () => assessNotDeductible(category, flags),
    gift_donation: () => assessGift(totalCents, thresholds, flags),
    tax_affairs: () => ({ claimableCents: totalCents, method: 'immediate' }),
    work_related: () => assessWorkRelated(expense, totalCents, thresholds, flags),
    business: () => assessBusiness(expense, totalCents, thresholds, profile, flags),
  };
  const { claimableCents, method } = rules[claimType]();

  return {
    claimType,
    claimableCents,
    method: claimableCents === 0 ? 'none' : method,
    flags,
  };
}

function hasMissingRequiredFields(expense: AssessableExpense): boolean {
  return (
    !expense.merchantName?.trim() ||
    expense.purchaseDate === null ||
    expense.totalCents === null ||
    expense.category === null ||
    !expense.description.trim()
  );
}

function resolveThresholds(purchaseDate: IsoDate | null, flags: ExpenseFlag[]): AtoThresholds {
  if (purchaseDate === null || !isIsoDate(purchaseDate)) {
    const latestKnownYear = Math.max(...Object.keys(THRESHOLDS_BY_FINANCIAL_YEAR).map(Number));
    return thresholdsFor(latestKnownYear).thresholds;
  }
  const { thresholds, isVerified } = thresholdsFor(financialYearOf(purchaseDate));
  if (!isVerified) {
    flags.push('THRESHOLDS_UNVERIFIED');
  }
  return thresholds;
}

function clampPercent(percent: number): number {
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function assessNotDeductible(category: Category, flags: ExpenseFlag[]) {
  if (category === 'volunteering') {
    flags.push('VOLUNTEER_EXPENSE_NOT_DEDUCTIBLE');
  }
  return { claimableCents: 0, method: 'none' as const };
}

function assessGift(totalCents: Cents, thresholds: AtoThresholds, flags: ExpenseFlag[]) {
  flags.push('VERIFY_DGR_STATUS');
  if (totalCents < thresholds.minimumGiftCents) {
    flags.push('DONATION_BELOW_MINIMUM');
    return { claimableCents: 0, method: 'none' as const };
  }
  return { claimableCents: totalCents, method: 'immediate' as const };
}

/** Employee deductions: GST-inclusive cost, work-use share, $300 immediate-claim limit for assets. */
function assessWorkRelated(
  expense: AssessableExpense,
  totalCents: Cents,
  thresholds: AtoThresholds,
  flags: ExpenseFlag[],
) {
  const workUsePercent = clampPercent(expense.workUsePercent);
  if (workUsePercent < 100) {
    flags.push('MIXED_USE_APPORTIONED');
  }
  const claimableCents = applyPercent(totalCents, workUsePercent);

  // The $300 test uses the item's full cost, not the work-use share.
  if (expense.isAsset && totalCents > thresholds.immediateDeductionLimitCents) {
    flags.push('DEPRECIATING_ASSET');
    return { claimableCents, method: 'depreciate' as const };
  }
  return { claimableCents, method: 'immediate' as const };
}

/**
 * Sole-trader deductions. A GST-registered business claims the GST back as a
 * credit, so its deduction (and the write-off test) uses the GST-exclusive cost.
 */
function assessBusiness(
  expense: AssessableExpense,
  totalCents: Cents,
  thresholds: AtoThresholds,
  profile: TaxProfile,
  flags: ExpenseFlag[],
) {
  const workUsePercent = clampPercent(expense.workUsePercent);
  if (workUsePercent < 100) {
    flags.push('MIXED_USE_APPORTIONED');
  }

  const costBasisCents = profile.gstRegistered ? totalCents - (expense.gstCents ?? 0) : totalCents;
  if (
    profile.gstRegistered &&
    totalCents > thresholds.taxInvoiceThresholdCents &&
    !(expense.merchantAbn && isValidAbn(expense.merchantAbn))
  ) {
    flags.push('TAX_INVOICE_REQUIRED');
  }

  const claimableCents = applyPercent(costBasisCents, workUsePercent);
  if (!expense.isAsset) {
    return { claimableCents, method: 'immediate' as const };
  }
  if (costBasisCents < thresholds.instantAssetWriteOffLimitCents) {
    flags.push('INSTANT_ASSET_WRITE_OFF_ELIGIBLE');
    return { claimableCents, method: 'immediate' as const };
  }
  flags.push('ASSET_ABOVE_WRITE_OFF_LIMIT');
  return { claimableCents, method: 'depreciate' as const };
}
