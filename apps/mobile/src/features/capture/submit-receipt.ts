import type { Expense, ReceiptMimeType } from '@accounting-ai/core';

import type { LocalReceipt, Services } from '@/services/ports';

const FILE_EXTENSIONS: Record<ReceiptMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** Where a receipt lives in storage. The first folder must be the user's id (see the storage policies). */
export function receiptPathFor(userId: string, expenseId: string, mimeType: ReceiptMimeType) {
  return `${userId}/${expenseId}.${FILE_EXTENSIONS[mimeType]}`;
}

export interface SubmitReceiptInput {
  userId: string;
  receipt: LocalReceipt;
  userNote: string;
  newId: () => string;
}

/**
 * Uploads the receipt and creates its expense (status "processing").
 * If the expense cannot be created, the uploaded file is removed again.
 */
export async function submitReceipt(
  services: Pick<Services, 'receipts' | 'expenses'>,
  { userId, receipt, userNote, newId }: SubmitReceiptInput,
): Promise<Expense> {
  const id = newId();
  const receiptPath = receiptPathFor(userId, id, receipt.mimeType);

  await services.receipts.upload(receiptPath, receipt);
  try {
    return await services.expenses.create({
      id,
      receiptPath,
      receiptMimeType: receipt.mimeType,
      userNote: userNote.trim() || null,
    });
  } catch (error) {
    await services.receipts.remove(receiptPath).catch(() => undefined);
    throw error;
  }
}
