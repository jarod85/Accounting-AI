/**
 * Converts between database rows (snake_case) and the core Expense type (camelCase).
 * Kept separate from the repository so it can be unit tested on its own.
 */

import type { Expense, ExpenseDetails } from '@accounting-ai/core';

export const EXPENSE_COLUMNS =
  'id, status, merchant_name, merchant_abn, purchase_date, financial_year, total_cents, gst_cents, ' +
  'currency, category, work_use_percent, is_asset, description, user_note, ai_rationale, ' +
  'low_confidence_fields, receipt_path, receipt_mime_type, failure_reason, created_at, updated_at';

export interface ExpenseRow {
  id: string;
  status: Expense['status'];
  merchant_name: string | null;
  merchant_abn: string | null;
  purchase_date: string | null;
  financial_year: number | null;
  total_cents: number | null;
  gst_cents: number | null;
  currency: string;
  category: Expense['category'];
  work_use_percent: number;
  is_asset: boolean;
  description: string;
  user_note: string | null;
  ai_rationale: string | null;
  low_confidence_fields: Expense['lowConfidenceFields'];
  receipt_path: string;
  receipt_mime_type: Expense['receiptMimeType'];
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function expenseFromRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    status: row.status,
    merchantName: row.merchant_name,
    merchantAbn: row.merchant_abn,
    purchaseDate: row.purchase_date,
    financialYear: row.financial_year,
    totalCents: row.total_cents,
    gstCents: row.gst_cents,
    currency: row.currency,
    category: row.category,
    workUsePercent: row.work_use_percent,
    isAsset: row.is_asset,
    description: row.description,
    userNote: row.user_note,
    aiRationale: row.ai_rationale,
    lowConfidenceFields: row.low_confidence_fields,
    receiptPath: row.receipt_path,
    receiptMimeType: row.receipt_mime_type,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function detailsToRow(details: ExpenseDetails) {
  return {
    merchant_name: details.merchantName,
    merchant_abn: details.merchantAbn,
    purchase_date: details.purchaseDate,
    total_cents: details.totalCents,
    gst_cents: details.gstCents,
    currency: details.currency,
    category: details.category,
    work_use_percent: details.workUsePercent,
    is_asset: details.isAsset,
    description: details.description,
    user_note: details.userNote,
    // The user has checked every field, so nothing is "low confidence" any more.
    low_confidence_fields: [],
  };
}
