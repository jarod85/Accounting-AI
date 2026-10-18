import {
  CATEGORIES,
  CATEGORY_CODES,
  CLAIM_TYPES,
  categoriesByClaimType,
  claimTypeOf,
  supportsWorkUsePercent,
} from './categories.ts';

describe('categories', () => {
  it('describes every category code', () => {
    expect(Object.keys(CATEGORIES).sort()).toEqual([...CATEGORY_CODES].sort());
  });

  it('puts every category in exactly one claim-type group', () => {
    const grouped = categoriesByClaimType().flatMap((group) => group.categories);

    expect(grouped.sort()).toEqual([...CATEGORY_CODES].sort());
    expect(categoriesByClaimType().map((group) => group.claimType)).toEqual([...CLAIM_TYPES]);
  });

  it('maps categories to the right part of the tax return', () => {
    expect(claimTypeOf('work_other')).toBe('work_related');
    expect(CATEGORIES.work_other.taxReturnLabel).toBe('D5');
    expect(CATEGORIES.gift_donation.taxReturnLabel).toBe('D9');
    expect(claimTypeOf('business_equipment')).toBe('business');
    expect(claimTypeOf('volunteering')).toBe('not_deductible');
    expect(CATEGORIES.volunteering.taxReturnLabel).toBeNull();
  });

  it('only offers work-use % where private use is possible', () => {
    expect(supportsWorkUsePercent('work_other')).toBe(true);
    expect(supportsWorkUsePercent('business_motor_vehicle')).toBe(true);
    expect(supportsWorkUsePercent('gift_donation')).toBe(false);
    expect(supportsWorkUsePercent('personal')).toBe(false);
  });
});
