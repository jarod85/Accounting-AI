import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';

import { expenseKeys, useReadReceipt } from '@/features/expenses';
import { useServices } from '@/providers/services-provider';
import { useSignedInSession } from '@/providers/session-provider';
import type { LocalReceipt } from '@/services/ports';

import { submitReceipt } from './submit-receipt';

/**
 * Uploads a receipt, then starts the AI reading it in the background. The
 * caller can move on straight away; the expense screen shows progress.
 */
export function useSubmitReceipt() {
  const services = useServices();
  const { userId } = useSignedInSession();
  const queryClient = useQueryClient();
  const readReceipt = useReadReceipt();

  return useMutation({
    mutationFn: ({ receipt, userNote }: { receipt: LocalReceipt; userNote: string }) =>
      submitReceipt(services, { userId, receipt, userNote, newId: randomUUID }),
    onSuccess: (expense) => {
      queryClient.setQueryData(expenseKeys.detail(expense.id), expense);
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all, exact: true });
      readReceipt.mutate(expense.id);
    },
  });
}
