/**
 * Server state for expenses, cached with TanStack Query. Screens use these
 * hooks instead of calling services directly, so loading, caching and
 * refreshing work the same way everywhere.
 */

import type { ExpenseDetails } from '@accounting-ai/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServices } from '@/providers/services-provider';

/** How often to check on a receipt the AI is still reading. */
const PROCESSING_POLL_MS = 3000;

export const expenseKeys = {
  all: ['expenses'] as const,
  detail: (id: string) => ['expenses', id] as const,
  receiptUrl: (path: string) => ['receipt-url', path] as const,
};

export function useExpenses() {
  const { expenses } = useServices();
  return useQuery({ queryKey: expenseKeys.all, queryFn: () => expenses.list() });
}

export function useExpense(id: string) {
  const { expenses } = useServices();
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: () => expenses.get(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'processing' ? PROCESSING_POLL_MS : false,
  });
}

export function useReceiptUrl(path: string) {
  const { receipts } = useServices();
  return useQuery({
    queryKey: expenseKeys.receiptUrl(path),
    queryFn: () => receipts.getViewUrl(path),
    // Signed URLs last 10 minutes; refresh before they expire.
    staleTime: 5 * 60 * 1000,
  });
}

/** Asks the AI to (re)read a receipt, then refreshes the expense. */
export function useReadReceipt() {
  const { receiptReader } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => receiptReader.read(expenseId),
    onSettled: (_result, _error, expenseId) => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.detail(expenseId) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all, exact: true });
    },
  });
}

export function useSaveExpense(id: string) {
  const { expenses } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ details, confirm }: { details: ExpenseDetails; confirm: boolean }) =>
      expenses.saveDetails(id, details, confirm ? 'confirmed' : 'needs_review'),
    onSuccess: (expense) => {
      queryClient.setQueryData(expenseKeys.detail(id), expense);
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all, exact: true });
    },
  });
}

/** Deletes an unconfirmed expense and its receipt file. */
export function useDeleteExpense() {
  const { expenses, receipts } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, receiptPath }: { id: string; receiptPath: string }) => {
      await expenses.remove(id);
      await receipts.remove(receiptPath);
    },
    onSuccess: (_result, { id }) => {
      queryClient.removeQueries({ queryKey: expenseKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: expenseKeys.all, exact: true });
    },
  });
}
