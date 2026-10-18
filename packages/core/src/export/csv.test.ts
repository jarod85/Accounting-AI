import { makeExpense } from '../testing.ts';
import { expensesToCsv, toCsvCell } from './csv.ts';

describe('expensesToCsv', () => {
  it('exports confirmed expenses for the year with headers', () => {
    const expenses = [
      makeExpense({ id: 'cable' }),
      makeExpense({
        id: 'laptop',
        purchaseDate: '2026-07-01',
        merchantName: 'JB Hi-Fi',
        merchantAbn: null,
        totalCents: 1_800_00,
        gstCents: null,
        workUsePercent: 70,
        description: 'Laptop, mainly for work, "Pro" model',
        userNote: 'Used 3 days a week at home',
        receiptPath: 'user-1/laptop.jpg',
      }),
      makeExpense({ id: 'draft', status: 'needs_review' }),
      makeExpense({ id: 'other-year', purchaseDate: '2026-06-30' }),
    ];

    expect(expensesToCsv(expenses, 2027, { gstRegistered: false })).toMatchSnapshot();
  });

  it('starts with a UTF-8 byte order mark so Excel reads it correctly', () => {
    expect(expensesToCsv([], 2027, { gstRegistered: false }).charCodeAt(0)).toBe(0xfeff);
  });

  it('exports only the header row for an empty year', () => {
    expect(expensesToCsv([], 2027, { gstRegistered: false }).split('\r\n')).toHaveLength(2);
  });

  it('leaves amount columns blank for an expense with no category or total', () => {
    const csv = expensesToCsv(
      [makeExpense({ category: null, totalCents: null, gstCents: null })],
      2027,
      { gstRegistered: false },
    );

    expect(csv.split('\r\n')[1]).toContain(
      'monitor.,,,,,,100,0.00,none,Missing details,,user-1/expense-1.jpg',
    );
  });
});

describe('toCsvCell', () => {
  it.each([
    ['plain', 'plain'],
    ['with, comma', '"with, comma"'],
    ['say "hi"', '"say ""hi"""'],
    ['line\nbreak', '"line\nbreak"'],
    ['=SUM(A1:A9)', "'=SUM(A1:A9)"],
    ['@cmd', "'@cmd"],
    ['+61 400', "'+61 400"],
    ['-12.50', '-12.50'],
    ['12.50', '12.50'],
  ])('encodes %j as %j', (value, expected) => {
    expect(toCsvCell(value)).toBe(expected);
  });
});
