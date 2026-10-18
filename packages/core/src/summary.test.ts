import {
  confirmedExpensesIn,
  financialYearsWithExpenses,
  summarizeFinancialYear,
} from './summary.ts';
import { makeExpense } from './testing.ts';

const PROFILE = { gstRegistered: false };

const cable = makeExpense({ id: 'cable', purchaseDate: '2026-08-15', totalCents: 25_00 });
const laptop = makeExpense({
  id: 'laptop',
  purchaseDate: '2026-07-01',
  totalCents: 1_800_00,
  workUsePercent: 70,
});
const donation = makeExpense({
  id: 'donation',
  purchaseDate: '2027-06-30',
  category: 'gift_donation',
  totalCents: 50_00,
  isAsset: false,
});
const volunteerFuel = makeExpense({
  id: 'fuel',
  purchaseDate: '2026-09-01',
  category: 'volunteering',
  totalCents: 60_00,
  isAsset: false,
});
const lastYear = makeExpense({ id: 'last-year', purchaseDate: '2026-06-30' });
const unreviewed = makeExpense({ id: 'unreviewed', status: 'needs_review' });
const noDate = makeExpense({ id: 'no-date', purchaseDate: null, status: 'needs_review' });

const ALL = [cable, laptop, donation, volunteerFuel, lastYear, unreviewed, noDate];

describe('financialYearsWithExpenses', () => {
  it('lists each year once, newest first', () => {
    expect(financialYearsWithExpenses(ALL)).toEqual([2027, 2026]);
  });
});

describe('confirmedExpensesIn', () => {
  it('keeps confirmed expenses in the year, oldest first', () => {
    expect(confirmedExpensesIn(ALL, 2027).map((expense) => expense.id)).toEqual([
      'laptop',
      'cable',
      'fuel',
      'donation',
    ]);
  });
});

describe('summarizeFinancialYear', () => {
  it('totals claimable amounts by claim type and category', () => {
    const summary = summarizeFinancialYear(ALL, 2027, PROFILE);

    expect(summary).toEqual({
      financialYear: 2027,
      count: 4,
      totalCents: 1_935_00,
      claimableCents: 1_335_00,
      byClaimType: [
        {
          claimType: 'work_related',
          claimableCents: 1_285_00,
          categories: [
            { category: 'work_other', count: 2, totalCents: 1_825_00, claimableCents: 1_285_00 },
          ],
        },
        {
          claimType: 'gift_donation',
          claimableCents: 50_00,
          categories: [
            { category: 'gift_donation', count: 1, totalCents: 50_00, claimableCents: 50_00 },
          ],
        },
        {
          claimType: 'not_deductible',
          claimableCents: 0,
          categories: [
            { category: 'volunteering', count: 1, totalCents: 60_00, claimableCents: 0 },
          ],
        },
      ],
    });
  });

  it('skips confirmed expenses that have no category or amount', () => {
    const odd = [
      makeExpense({ id: 'no-category', category: null }),
      makeExpense({ id: 'no-total', totalCents: null }),
    ];

    expect(summarizeFinancialYear(odd, 2027, PROFILE)).toMatchObject({
      count: 1,
      totalCents: 0,
      claimableCents: 0,
    });
  });

  it('returns zero totals for an empty year', () => {
    expect(summarizeFinancialYear(ALL, 2030, PROFILE)).toEqual({
      financialYear: 2030,
      count: 0,
      totalCents: 0,
      claimableCents: 0,
      byClaimType: [],
    });
  });
});
