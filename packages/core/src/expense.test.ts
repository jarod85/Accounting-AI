import { ExpenseDetailsSchema } from './expense.ts';

const validDetails = {
  merchantName: 'Officeworks',
  merchantAbn: '51 824 753 556',
  purchaseDate: '2026-08-15',
  totalCents: 25_00,
  gstCents: 2_27,
  currency: 'AUD',
  category: 'work_other',
  workUsePercent: 100,
  isAsset: true,
  description: 'USB-C cable for work.',
  userNote: null,
};

function errorsFor(input: unknown): Record<string, string[] | undefined> {
  const result = ExpenseDetailsSchema.safeParse(input);
  if (result.success) {
    return {};
  }
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    errors[field] = [...(errors[field] ?? []), issue.message];
  }
  return errors;
}

describe('ExpenseDetailsSchema', () => {
  it('accepts valid details and normalizes the ABN', () => {
    expect(ExpenseDetailsSchema.parse(validDetails).merchantAbn).toBe('51824753556');
  });

  it('accepts a missing ABN and GST', () => {
    expect(
      ExpenseDetailsSchema.safeParse({ ...validDetails, merchantAbn: null, gstCents: null })
        .success,
    ).toBe(true);
  });

  it.each([
    ['merchantName', { merchantName: '  ' }, 'Enter who you paid'],
    ['merchantAbn', { merchantAbn: '12 345 678 901' }, 'Not a valid ABN'],
    ['purchaseDate', { purchaseDate: '2026-02-30' }, 'Enter a valid date'],
    ['totalCents', { totalCents: 0 }, 'Enter the amount paid'],
    ['category', { category: 'snacks' }, 'Choose a category'],
    ['description', { description: '' }, 'Describe what was bought and why'],
    ['gstCents', { gstCents: 30_00 }, 'GST cannot be more than the total'],
  ])('rejects an invalid %s', (field, override, message) => {
    expect(errorsFor({ ...validDetails, ...override })[field]).toEqual([message]);
  });

  it('rejects a work-use percentage above 100', () => {
    expect(errorsFor({ ...validDetails, workUsePercent: 101 }).workUsePercent).toHaveLength(1);
  });
});
