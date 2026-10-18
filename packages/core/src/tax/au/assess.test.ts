import { makeExpense } from '../../testing.ts';
import { assessExpense, type TaxProfile } from './assess.ts';

const EMPLOYEE: TaxProfile = { gstRegistered: false };
const GST_REGISTERED: TaxProfile = { gstRegistered: true };

describe('assessExpense: employee work-related expenses', () => {
  it('claims a $25 USB-C cable in full, straight away', () => {
    const result = assessExpense(makeExpense({ totalCents: 25_00 }), EMPLOYEE);

    expect(result).toEqual({
      claimType: 'work_related',
      claimableCents: 25_00,
      method: 'immediate',
      flags: [],
    });
  });

  it('claims an asset of exactly $300 straight away', () => {
    const result = assessExpense(makeExpense({ totalCents: 300_00 }), EMPLOYEE);

    expect(result.method).toBe('immediate');
    expect(result.flags).not.toContain('DEPRECIATING_ASSET');
  });

  it('depreciates a $1,800 laptop and claims only the 70% work-use share', () => {
    const laptop = makeExpense({ totalCents: 1_800_00, workUsePercent: 70, isAsset: true });

    const result = assessExpense(laptop, EMPLOYEE);

    expect(result.claimableCents).toBe(1_260_00);
    expect(result.method).toBe('depreciate');
    expect(result.flags).toEqual(['MIXED_USE_APPORTIONED', 'DEPRECIATING_ASSET']);
  });

  it('applies the $300 test to the full cost, not the work-use share', () => {
    const monitor = makeExpense({ totalCents: 400_00, workUsePercent: 50, isAsset: true });

    expect(assessExpense(monitor, EMPLOYEE).method).toBe('depreciate');
  });

  it('claims a $500 course straight away because it is not an asset', () => {
    const course = makeExpense({
      category: 'work_self_education',
      totalCents: 500_00,
      isAsset: false,
    });

    expect(assessExpense(course, EMPLOYEE)).toMatchObject({
      claimableCents: 500_00,
      method: 'immediate',
      flags: [],
    });
  });

  it('clamps an out-of-range work-use percentage', () => {
    expect(assessExpense(makeExpense({ workUsePercent: 150 }), EMPLOYEE).claimableCents).toBe(
      25_00,
    );
    expect(assessExpense(makeExpense({ workUsePercent: -10 }), EMPLOYEE)).toMatchObject({
      claimableCents: 0,
      method: 'none',
    });
  });
});

describe('assessExpense: gifts and donations', () => {
  it('claims a $50 gift and asks the user to check DGR status', () => {
    const gift = makeExpense({ category: 'gift_donation', totalCents: 50_00, isAsset: false });

    expect(assessExpense(gift, EMPLOYEE)).toEqual({
      claimType: 'gift_donation',
      claimableCents: 50_00,
      method: 'immediate',
      flags: ['VERIFY_DGR_STATUS'],
    });
  });

  it('ignores work-use percentage for gifts', () => {
    const gift = makeExpense({ category: 'gift_donation', totalCents: 50_00, workUsePercent: 10 });

    expect(assessExpense(gift, EMPLOYEE).claimableCents).toBe(50_00);
  });

  it('does not claim a gift under $2', () => {
    const gift = makeExpense({ category: 'gift_donation', totalCents: 1_50 });

    expect(assessExpense(gift, EMPLOYEE)).toMatchObject({
      claimableCents: 0,
      method: 'none',
      flags: ['VERIFY_DGR_STATUS', 'DONATION_BELOW_MINIMUM'],
    });
  });

  it('claims a gift of exactly $2', () => {
    const gift = makeExpense({ category: 'gift_donation', totalCents: 2_00 });

    expect(assessExpense(gift, EMPLOYEE).claimableCents).toBe(2_00);
  });
});

describe('assessExpense: not deductible', () => {
  it('records volunteer fuel but does not claim it', () => {
    const fuel = makeExpense({ category: 'volunteering', totalCents: 60_00, isAsset: false });

    expect(assessExpense(fuel, EMPLOYEE)).toEqual({
      claimType: 'not_deductible',
      claimableCents: 0,
      method: 'none',
      flags: ['VOLUNTEER_EXPENSE_NOT_DEDUCTIBLE'],
    });
  });

  it('does not claim personal purchases', () => {
    const groceries = makeExpense({ category: 'personal', totalCents: 80_00 });

    expect(assessExpense(groceries, EMPLOYEE)).toEqual({
      claimType: 'not_deductible',
      claimableCents: 0,
      method: 'none',
      flags: [],
    });
  });
});

describe('assessExpense: managing tax affairs', () => {
  it('claims a tax agent fee in full', () => {
    const fee = makeExpense({ category: 'tax_affairs', totalCents: 220_00, isAsset: false });

    expect(assessExpense(fee, EMPLOYEE)).toMatchObject({
      claimType: 'tax_affairs',
      claimableCents: 220_00,
      method: 'immediate',
    });
  });
});

describe('assessExpense: side business', () => {
  it('uses the GST-inclusive cost when not registered for GST', () => {
    const software = makeExpense({
      category: 'business_software',
      totalCents: 110_00,
      gstCents: 10_00,
      isAsset: false,
    });

    expect(assessExpense(software, EMPLOYEE).claimableCents).toBe(110_00);
  });

  it('uses the GST-exclusive cost when registered for GST', () => {
    const software = makeExpense({
      category: 'business_software',
      totalCents: 110_00,
      gstCents: 10_00,
      isAsset: false,
    });

    expect(assessExpense(software, GST_REGISTERED)).toMatchObject({
      claimableCents: 100_00,
      method: 'immediate',
      flags: [],
    });
  });

  it('needs a tax invoice for a $120 GST-registered purchase with no ABN', () => {
    const supplies = makeExpense({
      category: 'business_supplies',
      totalCents: 120_00,
      gstCents: 10_91,
      merchantAbn: null,
      isAsset: false,
    });

    expect(assessExpense(supplies, GST_REGISTERED).flags).toEqual(['TAX_INVOICE_REQUIRED']);
  });

  it.each([
    ['no GST registration', EMPLOYEE, 120_00, null],
    ['an amount of exactly $82.50', GST_REGISTERED, 82_50, null],
    ['a valid ABN', GST_REGISTERED, 120_00, '51824753556'],
  ])('does not need a tax invoice with %s', (_case, profile, totalCents, merchantAbn) => {
    const supplies = makeExpense({
      category: 'business_supplies',
      totalCents,
      gstCents: null,
      merchantAbn,
      isAsset: false,
    });

    expect(assessExpense(supplies, profile).flags).not.toContain('TAX_INVOICE_REQUIRED');
  });

  it('writes off a $2,500 camera instantly', () => {
    const camera = makeExpense({ category: 'business_equipment', totalCents: 2_500_00 });

    expect(assessExpense(camera, EMPLOYEE)).toMatchObject({
      claimableCents: 2_500_00,
      method: 'immediate',
      flags: ['INSTANT_ASSET_WRITE_OFF_ELIGIBLE'],
    });
  });

  it('depreciates a $20,000 asset because the write-off is for assets under the limit', () => {
    const machine = makeExpense({ category: 'business_equipment', totalCents: 20_000_00 });

    expect(assessExpense(machine, EMPLOYEE)).toMatchObject({
      method: 'depreciate',
      flags: ['ASSET_ABOVE_WRITE_OFF_LIMIT'],
    });
  });

  it('tests the write-off limit on the GST-exclusive cost when registered', () => {
    const machine = makeExpense({
      category: 'business_equipment',
      totalCents: 21_000_00,
      gstCents: 1_909_09,
    });

    expect(assessExpense(machine, GST_REGISTERED)).toMatchObject({
      claimableCents: 19_090_91,
      method: 'immediate',
      flags: ['INSTANT_ASSET_WRITE_OFF_ELIGIBLE'],
    });
  });

  it('apportions part business use', () => {
    const phone = makeExpense({
      category: 'business_phone_internet',
      totalCents: 90_00,
      workUsePercent: 40,
      isAsset: false,
    });

    expect(assessExpense(phone, EMPLOYEE)).toMatchObject({
      claimableCents: 36_00,
      flags: ['MIXED_USE_APPORTIONED'],
    });
  });
});

describe('assessExpense: incomplete or unusual expenses', () => {
  it('flags missing details and claims nothing without an amount', () => {
    const blank = makeExpense({ merchantName: ' ', totalCents: null, description: '' });

    expect(assessExpense(blank, EMPLOYEE)).toEqual({
      claimType: 'work_related',
      claimableCents: 0,
      method: 'none',
      flags: ['MISSING_REQUIRED_FIELDS'],
    });
  });

  it('claims nothing until a category is chosen', () => {
    expect(assessExpense(makeExpense({ category: null }), EMPLOYEE)).toEqual({
      claimType: null,
      claimableCents: 0,
      method: 'none',
      flags: ['MISSING_REQUIRED_FIELDS'],
    });
  });

  it('still applies the latest thresholds when the date is missing', () => {
    const laptop = makeExpense({ purchaseDate: null, totalCents: 1_800_00 });

    expect(assessExpense(laptop, EMPLOYEE)).toMatchObject({
      method: 'depreciate',
      flags: ['MISSING_REQUIRED_FIELDS', 'DEPRECIATING_ASSET'],
    });
  });

  it('flags foreign currency', () => {
    expect(assessExpense(makeExpense({ currency: 'USD' }), EMPLOYEE).flags).toEqual([
      'NON_AUD_CURRENCY',
    ]);
  });

  it('flags a year whose thresholds have not been verified', () => {
    expect(assessExpense(makeExpense({ purchaseDate: '2030-01-15' }), EMPLOYEE).flags).toEqual([
      'THRESHOLDS_UNVERIFIED',
    ]);
  });
});
