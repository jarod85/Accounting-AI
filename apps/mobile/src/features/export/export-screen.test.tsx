import { currentFinancialYear, financialYearRange, formatFinancialYear } from '@accounting-ai/core';
import { makeExpense } from '@accounting-ai/core/testing';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createFakeServices } from '@/test/fake-services';
import { renderWithServices } from '@/test/render';

import { ExportScreen } from './export-screen';
import { shareCsv } from './share-csv';

jest.mock('./share-csv', () => ({ shareCsv: jest.fn(async () => undefined) }));

const thisYear = currentFinancialYear();
const { start } = financialYearRange(thisYear);

describe('<ExportScreen />', () => {
  it('shares a CSV of the confirmed expenses for the selected year', async () => {
    const { services } = createFakeServices({
      expenses: [
        makeExpense({ id: 'cable', purchaseDate: start }),
        makeExpense({ id: 'draft', purchaseDate: start, status: 'needs_review' }),
      ],
    });
    await renderWithServices(<ExportScreen />, services);

    expect(
      await screen.findByText(`${formatFinancialYear(thisYear)}: 1 expense, $25.00 deductible`),
    ).toBeOnTheScreen();
    expect(screen.getByText(/1 expense is not confirmed yet/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => expect(shareCsv).toHaveBeenCalledTimes(1));
    const [fileName, csv] = jest.mocked(shareCsv).mock.calls[0] ?? [];
    expect(fileName).toBe(`accounting-ai-${formatFinancialYear(thisYear)}.csv`);
    expect(csv).toContain('Officeworks');
    expect(csv?.split('\r\n')).toHaveLength(3); // header, one expense, trailing newline
  });

  it('disables export when the year has no confirmed expenses', async () => {
    const { services } = createFakeServices();
    await renderWithServices(<ExportScreen />, services);

    expect(await screen.findByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('shows an error if sharing fails', async () => {
    jest
      .mocked(shareCsv)
      .mockRejectedValueOnce(new Error('Sharing is not available on this device.'));
    const { services } = createFakeServices({ expenses: [makeExpense({ purchaseDate: start })] });
    await renderWithServices(<ExportScreen />, services);

    await fireEvent.press(await screen.findByRole('button', { name: 'Export CSV' }));

    expect(await screen.findByText('Sharing is not available on this device.')).toBeOnTheScreen();
  });
});
