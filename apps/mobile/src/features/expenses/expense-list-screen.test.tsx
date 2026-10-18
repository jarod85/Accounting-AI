import { currentFinancialYear, financialYearRange, formatFinancialYear } from '@accounting-ai/core';
import { makeExpense } from '@accounting-ai/core/testing';
import { fireEvent, screen } from '@testing-library/react-native';

import { createFakeServices } from '@/test/fake-services';
import { renderWithServices } from '@/test/render';

import { ExpenseListScreen } from './expense-list-screen';

// Dates are relative to "now" so the test keeps working in future years.
const thisYear = currentFinancialYear();
const { start: thisYearStart } = financialYearRange(thisYear);
const { start: lastYearStart } = financialYearRange(thisYear - 1);

const expenses = [
  makeExpense({
    id: 'cable',
    merchantName: 'Officeworks',
    purchaseDate: thisYearStart,
    totalCents: 25_00,
  }),
  makeExpense({
    id: 'donation',
    merchantName: 'Coastal Animal Rescue',
    purchaseDate: thisYearStart,
    category: 'gift_donation',
    totalCents: 50_00,
    isAsset: false,
  }),
  makeExpense({
    id: 'old',
    merchantName: 'Last Year Supplies',
    purchaseDate: lastYearStart,
    totalCents: 99_00,
  }),
  makeExpense({ id: 'pending', status: 'processing', merchantName: null, totalCents: null }),
  makeExpense({ id: 'review', status: 'needs_review', merchantName: 'Fresh Market' }),
];

async function renderList() {
  const { services } = createFakeServices({ expenses });
  const props = { onOpenExpense: jest.fn(), onAddReceipt: jest.fn() };
  await renderWithServices(<ExpenseListScreen {...props} />, services);
  return props;
}

describe('<ExpenseListScreen />', () => {
  it('totals this financial year and groups expenses by claim type', async () => {
    await renderList();

    expect(
      await screen.findByText(`${formatFinancialYear(thisYear)} deductions so far`),
    ).toBeOnTheScreen();
    expect(screen.getByText('$75.00')).toBeOnTheScreen();
    expect(screen.getByText('2 confirmed expenses totalling $75.00')).toBeOnTheScreen();
    expect(screen.getByText('Work-related (employee)')).toBeOnTheScreen();
    expect(screen.getByText('Gifts & donations')).toBeOnTheScreen();
    expect(screen.getByText('Officeworks')).toBeOnTheScreen();
    expect(screen.queryByText('Last Year Supplies')).not.toBeOnTheScreen();
  });

  it('lists receipts that still need attention', async () => {
    await renderList();

    expect(await screen.findByText('To review (2)')).toBeOnTheScreen();
    expect(screen.getByText('Reading receipt…')).toBeOnTheScreen();
    expect(screen.getByText('Needs your review')).toBeOnTheScreen();
  });

  it('switches financial year', async () => {
    await renderList();

    await fireEvent.press(
      await screen.findByRole('button', {
        name: `Financial year ${formatFinancialYear(thisYear - 1)}`,
      }),
    );

    expect(await screen.findByText('Last Year Supplies')).toBeOnTheScreen();
    expect(screen.queryByText('Officeworks')).not.toBeOnTheScreen();
  });

  it('opens an expense and adds a receipt', async () => {
    const props = await renderList();

    await fireEvent.press(await screen.findByRole('button', { name: 'Officeworks, $25.00' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add receipt' }));

    expect(props.onOpenExpense).toHaveBeenCalledWith('cable');
    expect(props.onAddReceipt).toHaveBeenCalled();
  });

  it('offers a retry when expenses cannot be loaded', async () => {
    const { services } = createFakeServices({ expenses });
    jest.mocked(services.expenses.list).mockRejectedValueOnce(new Error('offline'));
    await renderWithServices(
      <ExpenseListScreen onOpenExpense={jest.fn()} onAddReceipt={jest.fn()} />,
      services,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Officeworks')).toBeOnTheScreen();
  });
});
