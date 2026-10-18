/**
 * ATO dollar thresholds, per financial year.
 *
 * These change with legislation. Before each financial year, check every value
 * against ato.gov.au, add a new entry and update `verifiedOn`. Years without an
 * entry fall back to the closest earlier year and are flagged as unverified.
 */

import type { FinancialYear, IsoDate } from '../../financial-year.ts';
import type { Cents } from '../../money.ts';

export interface AtoThresholds {
  /** Employees can claim a work item costing this much or less straight away; dearer assets are depreciated. */
  immediateDeductionLimitCents: Cents;
  /** Small business instant asset write-off: each asset costing LESS than this is deducted in full. */
  instantAssetWriteOffLimitCents: Cents;
  /** Smallest gift to a DGR that can be claimed. */
  minimumGiftCents: Cents;
  /** Claiming a GST credit on a purchase above this (GST-inclusive) needs a tax invoice. */
  taxInvoiceThresholdCents: Cents;
  /** When a person last checked these values against ato.gov.au. */
  verifiedOn: IsoDate;
}

export const THRESHOLDS_BY_FINANCIAL_YEAR: Readonly<Record<FinancialYear, AtoThresholds>> = {
  // 2025–26: $20,000 instant asset write-off extended to 30 June 2026.
  2026: {
    immediateDeductionLimitCents: 300_00,
    instantAssetWriteOffLimitCents: 20_000_00,
    minimumGiftCents: 2_00,
    taxInvoiceThresholdCents: 82_50,
    verifiedOn: '2026-10-18',
  },
  // 2026–27: $20,000 instant asset write-off made permanent from 1 July 2026.
  2027: {
    immediateDeductionLimitCents: 300_00,
    instantAssetWriteOffLimitCents: 20_000_00,
    minimumGiftCents: 2_00,
    taxInvoiceThresholdCents: 82_50,
    verifiedOn: '2026-10-18',
  },
};

/**
 * Thresholds for a financial year. `isVerified` is false when the year has no
 * entry of its own and the closest earlier (or earliest known) year was used.
 */
export function thresholdsFor(financialYear: FinancialYear): {
  thresholds: AtoThresholds;
  isVerified: boolean;
} {
  const exact = THRESHOLDS_BY_FINANCIAL_YEAR[financialYear];
  if (exact) {
    return { thresholds: exact, isVerified: true };
  }
  const knownYears = Object.keys(THRESHOLDS_BY_FINANCIAL_YEAR)
    .map(Number)
    .sort((a, b) => a - b);
  const closestEarlier = knownYears.filter((year) => year < financialYear).pop();
  const fallbackYear = closestEarlier ?? (knownYears[0] as FinancialYear);
  return {
    thresholds: THRESHOLDS_BY_FINANCIAL_YEAR[fallbackYear] as AtoThresholds,
    isVerified: false,
  };
}
