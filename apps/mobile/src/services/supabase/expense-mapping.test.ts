import { makeExpense } from '@accounting-ai/core/testing';

import { detailsToRow, expenseFromRow, type ExpenseRow } from './expense-mapping';

const row: ExpenseRow = {
  id: 'expense-1',
  status: 'confirmed',
  merchant_name: 'Officeworks',
  merchant_abn: '51824753556',
  purchase_date: '2026-08-15',
  financial_year: 2027,
  total_cents: 2500,
  gst_cents: 227,
  currency: 'AUD',
  category: 'work_other',
  work_use_percent: 100,
  is_asset: true,
  description: 'USB-C cable to connect work laptop to office monitor.',
  user_note: null,
  ai_rationale: 'Computer accessory used for work.',
  low_confidence_fields: [],
  receipt_path: 'user-1/expense-1.jpg',
  receipt_mime_type: 'image/jpeg',
  failure_reason: null,
  created_at: '2026-08-15T01:00:00.000Z',
  updated_at: '2026-08-15T01:00:00.000Z',
};

describe('expense mapping', () => {
  it('maps a database row onto the Expense type', () => {
    expect(expenseFromRow(row)).toEqual(makeExpense());
  });

  it('maps confirmed details back to columns and clears low-confidence markers', () => {
    expect(
      detailsToRow({
        merchantName: 'Officeworks',
        merchantAbn: null,
        purchaseDate: '2026-08-15',
        totalCents: 2500,
        gstCents: null,
        currency: 'AUD',
        category: 'work_other',
        workUsePercent: 80,
        isAsset: false,
        description: 'Cable',
        userNote: 'note',
      }),
    ).toEqual({
      merchant_name: 'Officeworks',
      merchant_abn: null,
      purchase_date: '2026-08-15',
      total_cents: 2500,
      gst_cents: null,
      currency: 'AUD',
      category: 'work_other',
      work_use_percent: 80,
      is_asset: false,
      description: 'Cable',
      user_note: 'note',
      low_confidence_fields: [],
    });
  });
});
