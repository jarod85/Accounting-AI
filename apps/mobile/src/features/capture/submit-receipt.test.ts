import { createFakeServices } from '@/test/fake-services';

import { receiptPathFor, submitReceipt } from './submit-receipt';

const JPEG = { uri: 'file:///cache/receipt.jpg', mimeType: 'image/jpeg' as const };

describe('receiptPathFor', () => {
  it.each([
    ['image/jpeg', 'user-1/abc.jpg'],
    ['image/png', 'user-1/abc.png'],
    ['image/webp', 'user-1/abc.webp'],
    ['application/pdf', 'user-1/abc.pdf'],
  ] as const)('stores %s receipts in the user folder', (mimeType, expected) => {
    expect(receiptPathFor('user-1', 'abc', mimeType)).toBe(expected);
  });
});

describe('submitReceipt', () => {
  it('uploads the file, then creates a processing expense', async () => {
    const { services, state } = createFakeServices();

    const expense = await submitReceipt(services, {
      userId: 'user-1',
      receipt: JPEG,
      userNote: '  cable for work ',
      newId: () => 'abc',
    });

    expect(state.uploads.get('user-1/abc.jpg')).toEqual(JPEG);
    expect(expense).toMatchObject({
      id: 'abc',
      status: 'processing',
      receiptPath: 'user-1/abc.jpg',
      receiptMimeType: 'image/jpeg',
      userNote: 'cable for work',
    });
  });

  it('stores a blank note as no note', async () => {
    const { services } = createFakeServices();

    const expense = await submitReceipt(services, {
      userId: 'user-1',
      receipt: JPEG,
      userNote: '   ',
      newId: () => 'abc',
    });

    expect(expense.userNote).toBeNull();
  });

  it('removes the uploaded file if the expense cannot be created', async () => {
    const { services, state } = createFakeServices();
    jest.mocked(services.expenses.create).mockRejectedValueOnce(new Error('offline'));

    await expect(
      submitReceipt(services, {
        userId: 'user-1',
        receipt: JPEG,
        userNote: '',
        newId: () => 'abc',
      }),
    ).rejects.toThrow('offline');
    expect(state.uploads.size).toBe(0);
  });

  it('does not create an expense if the upload fails', async () => {
    const { services } = createFakeServices();
    jest.mocked(services.receipts.upload).mockRejectedValueOnce(new Error('too large'));

    await expect(
      submitReceipt(services, {
        userId: 'user-1',
        receipt: JPEG,
        userNote: '',
        newId: () => 'abc',
      }),
    ).rejects.toThrow('too large');
    expect(services.expenses.create).not.toHaveBeenCalled();
  });
});
