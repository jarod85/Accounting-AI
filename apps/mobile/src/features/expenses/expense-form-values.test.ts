import { makeExpense } from '@accounting-ai/core/testing';

import {
  parseFormValues,
  previewAssessment,
  toFormValues,
  type ExpenseFormValues,
} from './expense-form-values';

const PROFILE = { gstRegistered: false };

const validValues: ExpenseFormValues = {
  merchantName: 'Officeworks',
  merchantAbn: '51 824 753 556',
  purchaseDate: '15/08/2026',
  total: '$1,800.00',
  gst: '163.64',
  category: 'work_other',
  workUsePercent: '70',
  isAsset: true,
  description: 'Laptop for work.',
  userNote: '  used at home on Fridays ',
};

describe('toFormValues', () => {
  it('shows an expense the way the user types it', () => {
    expect(toFormValues(makeExpense())).toEqual({
      merchantName: 'Officeworks',
      merchantAbn: '51 824 753 556',
      purchaseDate: '15/08/2026',
      total: '25.00',
      gst: '2.27',
      category: 'work_other',
      workUsePercent: '100',
      isAsset: true,
      description: 'USB-C cable to connect work laptop to office monitor.',
      userNote: '',
    });
  });

  it('leaves unknown values blank', () => {
    const values = toFormValues(
      makeExpense({
        merchantName: null,
        merchantAbn: null,
        purchaseDate: null,
        totalCents: null,
        gstCents: null,
        category: null,
      }),
    );

    expect(values).toMatchObject({
      merchantName: '',
      merchantAbn: '',
      purchaseDate: '',
      total: '',
      gst: '',
      category: '',
    });
  });
});

describe('parseFormValues', () => {
  it('converts valid values into expense details', () => {
    expect(parseFormValues(validValues, 'AUD')).toEqual({
      ok: true,
      details: {
        merchantName: 'Officeworks',
        merchantAbn: '51824753556',
        purchaseDate: '2026-08-15',
        totalCents: 1_800_00,
        gstCents: 163_64,
        currency: 'AUD',
        category: 'work_other',
        workUsePercent: 70,
        isAsset: true,
        description: 'Laptop for work.',
        userNote: 'used at home on Fridays',
      },
    });
  });

  it('treats blank optional fields as missing', () => {
    const result = parseFormValues(
      { ...validValues, merchantAbn: ' ', gst: '', userNote: '' },
      'AUD',
    );

    expect(result).toMatchObject({
      ok: true,
      details: { merchantAbn: null, gstCents: null, userNote: null },
    });
  });

  it('reports a friendly message for each invalid field', () => {
    const result = parseFormValues(
      {
        ...validValues,
        merchantName: '',
        merchantAbn: '123',
        purchaseDate: '2026-08-15',
        total: 'twelve',
        gst: 'abc',
        category: '',
        workUsePercent: 'lots',
        description: ' ',
      },
      'AUD',
    );

    expect(result).toEqual({
      ok: false,
      errors: {
        merchantName: 'Enter who you paid',
        merchantAbn: 'Not a valid ABN',
        purchaseDate: 'Enter the date as DD/MM/YYYY',
        total: 'Enter the amount paid, e.g. 24.95',
        gst: 'Enter GST as an amount, e.g. 2.27',
        category: 'Choose a category',
        workUsePercent: 'Enter a whole number from 0 to 100',
        description: 'Describe what was bought and why',
      },
    });
  });

  it('rejects a work-use percentage over 100', () => {
    const result = parseFormValues({ ...validValues, workUsePercent: '150' }, 'AUD');

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.workUsePercent).toBeTruthy();
  });

  it('rejects GST larger than the total', () => {
    const result = parseFormValues({ ...validValues, total: '10', gst: '20' }, 'AUD');

    expect(result).toEqual({ ok: false, errors: { gst: 'GST cannot be more than the total' } });
  });
});

describe('previewAssessment', () => {
  it('assesses the values as the user types', () => {
    expect(previewAssessment(validValues, 'AUD', PROFILE)).toEqual({
      claimType: 'work_related',
      claimableCents: 1_260_00,
      method: 'depreciate',
      flags: ['MIXED_USE_APPORTIONED', 'DEPRECIATING_ASSET'],
    });
  });

  it('treats unparseable values as missing', () => {
    const preview = previewAssessment({ ...validValues, total: 'oops' }, 'AUD', PROFILE);

    expect(preview).toMatchObject({ claimableCents: 0, flags: ['MISSING_REQUIRED_FIELDS'] });
  });
});
