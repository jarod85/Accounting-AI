import { THRESHOLDS_BY_FINANCIAL_YEAR, thresholdsFor } from './thresholds.ts';

describe('thresholdsFor', () => {
  it('returns the exact year when it is known', () => {
    expect(thresholdsFor(2027)).toEqual({
      thresholds: THRESHOLDS_BY_FINANCIAL_YEAR[2027],
      isVerified: true,
    });
  });

  it('falls back to the closest earlier year for a future year', () => {
    expect(thresholdsFor(2031)).toEqual({
      thresholds: THRESHOLDS_BY_FINANCIAL_YEAR[2027],
      isVerified: false,
    });
  });

  it('falls back to the earliest known year for an old year', () => {
    expect(thresholdsFor(2019)).toEqual({
      thresholds: THRESHOLDS_BY_FINANCIAL_YEAR[2026],
      isVerified: false,
    });
  });
});
