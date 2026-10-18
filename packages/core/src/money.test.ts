import { applyPercent, formatAud, formatDecimal, parseDollarsInput } from './money.ts';

describe('applyPercent', () => {
  it.each([
    [10000, 100, 10000],
    [10000, 0, 0],
    [180000, 70, 126000],
    [1999, 33, 660], // 659.67 rounds up
    [1, 50, 1], // 0.5 rounds up
  ])('%i cents at %i%% is %i cents', (cents, percent, expected) => {
    expect(applyPercent(cents, percent)).toBe(expected);
  });
});

describe('formatAud', () => {
  it.each([
    [0, '$0.00'],
    [5, '$0.05'],
    [2500, '$25.00'],
    [123456, '$1,234.56'],
    [100000000, '$1,000,000.00'],
    [-1250, '-$12.50'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatAud(cents)).toBe(expected);
  });
});

describe('formatDecimal', () => {
  it.each([
    [0, '0.00'],
    [123456, '1234.56'],
    [-5, '-0.05'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatDecimal(cents)).toBe(expected);
  });
});

describe('parseDollarsInput', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['0.05', 5],
    ['$1,234.56', 123456],
    ['  3 ', 300],
  ])('parses "%s" as %i cents', (text, expected) => {
    expect(parseDollarsInput(text)).toBe(expected);
  });

  it.each(['', 'abc', '12.345', '-5', '1.2.3', '$', '12.'])('rejects "%s"', (text) => {
    expect(parseDollarsInput(text)).toBeNull();
  });
});
