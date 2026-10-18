import {
  currentFinancialYear,
  financialYearOf,
  financialYearRange,
  formatAustralianDate,
  formatFinancialYear,
  isIsoDate,
  parseAustralianDate,
  toIsoDate,
} from './financial-year.ts';

describe('formatAustralianDate', () => {
  it('writes the day first', () => {
    expect(formatAustralianDate('2026-08-05')).toBe('05/08/2026');
  });
});

describe('parseAustralianDate', () => {
  it.each([
    ['15/08/2026', '2026-08-15'],
    ['5/8/2026', '2026-08-05'],
    [' 03/07/2026 ', '2026-07-03'],
    ['29/02/2024', '2024-02-29'],
  ])('reads "%s" as %s', (text, expected) => {
    expect(parseAustralianDate(text)).toBe(expected);
  });

  it.each(['31/04/2026', '29/02/2026', '2026-08-15', '15/08/26', '', '15-08-2026'])(
    'rejects "%s"',
    (text) => {
      expect(parseAustralianDate(text)).toBeNull();
    },
  );
});

describe('isIsoDate', () => {
  it.each(['2026-10-18', '2024-02-29', '2027-06-30'])('accepts %s', (value) => {
    expect(isIsoDate(value)).toBe(true);
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '18/10/2026', '2026-1-5', ''])(
    'rejects %s',
    (value) => {
      expect(isIsoDate(value)).toBe(false);
    },
  );
});

describe('financialYearOf', () => {
  it.each([
    ['2026-06-30', 2026],
    ['2026-07-01', 2027],
    ['2026-12-31', 2027],
    ['2027-01-01', 2027],
    ['2027-06-30', 2027],
    ['2024-02-29', 2024],
  ])('%s is in financial year %i', (date, expected) => {
    expect(financialYearOf(date)).toBe(expected);
  });

  it('throws on an invalid date', () => {
    expect(() => financialYearOf('2026-02-30')).toThrow('Not a valid ISO date');
  });
});

describe('financialYearRange', () => {
  it('runs from 1 July to 30 June', () => {
    expect(financialYearRange(2027)).toEqual({ start: '2026-07-01', end: '2027-06-30' });
  });
});

describe('formatFinancialYear', () => {
  it.each([
    [2027, '2026–27'],
    [2000, '1999–00'],
    [2010, '2009–10'],
  ])('formats %i as %s', (financialYear, expected) => {
    expect(formatFinancialYear(financialYear)).toBe(expected);
  });
});

describe('toIsoDate and currentFinancialYear', () => {
  it('uses the local calendar date', () => {
    const date = new Date(2026, 9, 18, 23, 30); // 18 Oct 2026, 11:30 pm local
    expect(toIsoDate(date)).toBe('2026-10-18');
    expect(currentFinancialYear(date)).toBe(2027);
  });

  it('defaults to today', () => {
    expect(currentFinancialYear()).toBe(financialYearOf(toIsoDate(new Date())));
  });
});
