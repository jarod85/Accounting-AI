import { makeExpense } from '@accounting-ai/core/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createFakeServices } from '@/test/fake-services';
import { renderWithServices } from '@/test/render';

import { ExpenseScreen } from './expense-screen';

const laptopForReview = makeExpense({
  id: 'laptop',
  status: 'needs_review',
  merchantName: 'Harbour Electronics',
  totalCents: 1_800_00,
  gstCents: null,
  workUsePercent: 70,
  isAsset: true,
  description: 'Laptop, mainly for work.',
  aiRationale: 'Computer used for the job.',
  lowConfidenceFields: ['purchaseDate'],
});

describe('<ExpenseScreen />', () => {
  it('pre-fills the AI result, previews the deduction and confirms', async () => {
    const { services, state } = createFakeServices({ expenses: [laptopForReview] });
    const onDone = jest.fn();
    await renderWithServices(<ExpenseScreen expenseId="laptop" onDone={onDone} />, services);

    expect(await screen.findByDisplayValue('Harbour Electronics')).toBeOnTheScreen();
    expect(screen.getByText('Check the details the AI filled in, then confirm.')).toBeOnTheScreen();
    expect(screen.getByText('AI note: Computer used for the job.')).toBeOnTheScreen();
    expect(screen.getByText(/please check/)).toBeOnTheScreen();
    expect(
      screen.getByText('Deductible: $1,260.00, claimed over several years (depreciation)'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Claimed over several years')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Work or business use (%)'), '100');
    expect(
      await screen.findByText('Deductible: $1,800.00, claimed over several years (depreciation)'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Confirm expense' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(state.expenses[0]).toMatchObject({ status: 'confirmed', workUsePercent: 100 });
  });

  it('shows validation errors and does not save', async () => {
    const { services } = createFakeServices({ expenses: [laptopForReview] });
    await renderWithServices(<ExpenseScreen expenseId="laptop" onDone={jest.fn()} />, services);

    await fireEvent.changeText(await screen.findByLabelText('Date'), '31/02/2026');
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm expense' }));

    expect(await screen.findByText('Enter the date as DD/MM/YYYY')).toBeOnTheScreen();
    expect(services.expenses.saveDetails).not.toHaveBeenCalled();
  });

  it('saves for later without confirming', async () => {
    const { services, state } = createFakeServices({ expenses: [laptopForReview] });
    const onDone = jest.fn();
    await renderWithServices(<ExpenseScreen expenseId="laptop" onDone={onDone} />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Save for later' }));

    await waitFor(() => expect(services.expenses.saveDetails).toHaveBeenCalled());
    expect(state.expenses[0]?.status).toBe('needs_review');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('changes the category from the picker', async () => {
    const { services, state } = createFakeServices({ expenses: [laptopForReview] });
    await renderWithServices(<ExpenseScreen expenseId="laptop" onDone={jest.fn()} />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Category' }));
    await fireEvent.press(screen.getByText('Business equipment'));
    expect(await screen.findByText('Instant asset write-off')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm expense' }));

    await waitFor(() => expect(state.expenses[0]?.category).toBe('business_equipment'));
  });

  it('flags volunteering costs as not deductible', async () => {
    const fuel = makeExpense({
      id: 'fuel',
      status: 'needs_review',
      category: 'volunteering',
      isAsset: false,
    });
    const { services } = createFakeServices({ expenses: [fuel] });
    await renderWithServices(<ExpenseScreen expenseId="fuel" onDone={jest.fn()} />, services);

    expect(await screen.findByText('Volunteering costs not deductible')).toBeOnTheScreen();
    expect(screen.getByText('Not deductible')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Work or business use (%)')).not.toBeOnTheScreen();
  });

  it('lets the user retry a receipt the AI could not read', async () => {
    const failed = makeExpense({
      id: 'blurry',
      status: 'failed',
      failureReason: "This doesn't look like a receipt.",
    });
    const { services } = createFakeServices({ expenses: [failed] });
    await renderWithServices(<ExpenseScreen expenseId="blurry" onDone={jest.fn()} />, services);

    expect(await screen.findByText("This doesn't look like a receipt.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try reading again' }));

    await waitFor(() => expect(services.receiptReader.read).toHaveBeenCalledWith('blurry'));
  });

  it('shows progress while the AI is reading', async () => {
    const processing = makeExpense({ id: 'new', status: 'processing', merchantName: null });
    const { services } = createFakeServices({ expenses: [processing] });
    await renderWithServices(<ExpenseScreen expenseId="new" onDone={jest.fn()} />, services);

    expect(await screen.findByText(/Reading your receipt/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Confirm expense' })).not.toBeOnTheScreen();
  });

  it('deletes an unconfirmed expense and its receipt', async () => {
    const { services } = createFakeServices({ expenses: [laptopForReview] });
    const onDone = jest.fn();
    await renderWithServices(<ExpenseScreen expenseId="laptop" onDone={onDone} />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Delete expense' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(services.receipts.remove).toHaveBeenCalledWith(laptopForReview.receiptPath);
  });

  it('does not offer delete for a confirmed expense', async () => {
    const { services } = createFakeServices({ expenses: [makeExpense({ id: 'done' })] });
    await renderWithServices(<ExpenseScreen expenseId="done" onDone={jest.fn()} />, services);

    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Delete expense' })).not.toBeOnTheScreen();
  });

  it('says so when the expense does not exist', async () => {
    const { services } = createFakeServices();
    await renderWithServices(<ExpenseScreen expenseId="missing" onDone={jest.fn()} />, services);

    expect(await screen.findByText('This expense no longer exists.')).toBeOnTheScreen();
  });
});
