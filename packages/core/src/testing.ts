/**
 * Test builders shared by every package's tests. Import from
 * "@accounting-ai/core/testing"; never from app code.
 */

import type { Expense } from './expense.ts';
import { financialYearOf } from './financial-year.ts';
import type { ReceiptExtraction } from './extraction.ts';

/** A confirmed, fully filled-in work expense. Override only what a test cares about. */
export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  const purchaseDate = overrides.purchaseDate === undefined ? '2026-08-15' : overrides.purchaseDate;
  return {
    id: 'expense-1',
    status: 'confirmed',
    merchantName: 'Officeworks',
    merchantAbn: '51824753556',
    purchaseDate,
    financialYear: purchaseDate ? financialYearOf(purchaseDate) : null,
    totalCents: 25_00,
    gstCents: 2_27,
    currency: 'AUD',
    category: 'work_other',
    workUsePercent: 100,
    isAsset: true,
    description: 'USB-C cable to connect work laptop to office monitor.',
    userNote: null,
    aiRationale: 'Computer accessory used for work.',
    lowConfidenceFields: [],
    receiptPath: 'user-1/expense-1.jpg',
    receiptMimeType: 'image/jpeg',
    failureReason: null,
    createdAt: '2026-08-15T01:00:00.000Z',
    updatedAt: '2026-08-15T01:00:00.000Z',
    ...overrides,
  };
}

/** A confident, valid AI extraction of a $25 USB-C cable receipt. */
export function makeExtraction(overrides: Partial<ReceiptExtraction> = {}): ReceiptExtraction {
  return {
    isReceipt: true,
    merchantName: 'Officeworks',
    merchantAbn: '51 824 753 556',
    purchaseDate: '2026-08-15',
    currency: 'AUD',
    totalCents: 25_00,
    gstCents: 2_27,
    lineItems: [{ description: 'USB-C to USB-C cable 2m', amountCents: 25_00 }],
    suggestedCategory: 'work_other',
    suggestedWorkUsePercent: 100,
    isAsset: true,
    description: 'USB-C cable to connect work laptop to office monitor.',
    rationale: 'Computer accessory used for work.',
    confidence: {
      merchantName: 'high',
      purchaseDate: 'high',
      totalCents: 'high',
      category: 'high',
    },
    ...overrides,
  };
}
