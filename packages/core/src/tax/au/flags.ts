/**
 * Review flags: plain-English warnings shown on an expense so the user can
 * check it before lodging. Flags are always recomputed from the expense's
 * fields by `assessExpense`, never stored, so they cannot go stale.
 */

export const EXPENSE_FLAGS = [
  'MISSING_REQUIRED_FIELDS',
  'NON_AUD_CURRENCY',
  'THRESHOLDS_UNVERIFIED',
  'MIXED_USE_APPORTIONED',
  'DEPRECIATING_ASSET',
  'INSTANT_ASSET_WRITE_OFF_ELIGIBLE',
  'ASSET_ABOVE_WRITE_OFF_LIMIT',
  'TAX_INVOICE_REQUIRED',
  'VERIFY_DGR_STATUS',
  'DONATION_BELOW_MINIMUM',
  'VOLUNTEER_EXPENSE_NOT_DEDUCTIBLE',
] as const;
export type ExpenseFlag = (typeof EXPENSE_FLAGS)[number];

export type FlagSeverity = 'info' | 'warning';

export interface FlagInfo {
  severity: FlagSeverity;
  title: string;
  detail: string;
}

export const FLAG_INFO: Record<ExpenseFlag, FlagInfo> = {
  MISSING_REQUIRED_FIELDS: {
    severity: 'warning',
    title: 'Missing details',
    detail:
      'The ATO expects the supplier, date, amount and what was bought. Fill in the missing fields.',
  },
  NON_AUD_CURRENCY: {
    severity: 'warning',
    title: 'Foreign currency',
    detail: 'Enter the amount in Australian dollars, using the rate on the day you paid.',
  },
  THRESHOLDS_UNVERIFIED: {
    severity: 'info',
    title: 'Rules not yet updated for this year',
    detail: "This year's ATO limits have not been checked yet, so last year's limits were used.",
  },
  MIXED_USE_APPORTIONED: {
    severity: 'info',
    title: 'Part private use',
    detail: 'Only the work-use share is claimable. Keep a note of how you worked out the %.',
  },
  DEPRECIATING_ASSET: {
    severity: 'info',
    title: 'Claimed over several years',
    detail:
      'Work items costing more than $300 are depreciated over their effective life instead of claimed at once.',
  },
  INSTANT_ASSET_WRITE_OFF_ELIGIBLE: {
    severity: 'info',
    title: 'Instant asset write-off',
    detail:
      'This business asset is under the instant asset write-off limit, so it can be claimed in full this year.',
  },
  ASSET_ABOVE_WRITE_OFF_LIMIT: {
    severity: 'info',
    title: 'Above write-off limit',
    detail:
      'This business asset costs too much for an instant write-off and is depreciated instead.',
  },
  TAX_INVOICE_REQUIRED: {
    severity: 'warning',
    title: 'Tax invoice needed',
    detail:
      "To claim the GST credit on a purchase over $82.50 you need a tax invoice showing the supplier's ABN.",
  },
  VERIFY_DGR_STATUS: {
    severity: 'info',
    title: 'Check charity status',
    detail:
      'Gifts are only deductible to a deductible gift recipient (DGR). Check the charity on ABN Lookup.',
  },
  DONATION_BELOW_MINIMUM: {
    severity: 'warning',
    title: 'Below $2',
    detail: 'Gifts under $2 are not deductible.',
  },
  VOLUNTEER_EXPENSE_NOT_DEDUCTIBLE: {
    severity: 'warning',
    title: 'Volunteering costs not deductible',
    detail:
      'The ATO generally does not allow out-of-pocket volunteering costs as a deduction. Kept for your records only.',
  },
};
