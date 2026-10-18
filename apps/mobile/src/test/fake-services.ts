/**
 * In-memory implementations of every service port, for tests. Each method is a
 * jest.fn, so tests can both rely on realistic behaviour and assert on calls.
 */

import {
  DEFAULT_USER_SETTINGS,
  financialYearOf,
  type Expense,
  type UserSettings,
} from '@accounting-ai/core';

import type { LocalReceipt, Services, Session } from '@/services/ports';

export const TEST_SESSION: Session = { userId: 'user-1', email: 'me@example.com' };

export interface FakeState {
  session: Session | null;
  expenses: Expense[];
  settings: UserSettings;
  uploads: Map<string, LocalReceipt>;
}

export function createFakeServices(initial: Partial<Omit<FakeState, 'uploads'>> = {}): {
  services: Services;
  state: FakeState;
} {
  const state: FakeState = {
    session: initial.session === undefined ? TEST_SESSION : initial.session,
    expenses: [...(initial.expenses ?? [])],
    settings: initial.settings ?? DEFAULT_USER_SETTINGS,
    uploads: new Map(),
  };
  const sessionListeners = new Set<(session: Session | null) => void>();
  const setSession = (session: Session | null) => {
    state.session = session;
    sessionListeners.forEach((listener) => listener(session));
  };
  const findExpense = (id: string) => {
    const expense = state.expenses.find((candidate) => candidate.id === id);
    if (!expense) throw new Error(`No expense ${id}`);
    return expense;
  };
  const replaceExpense = (updated: Expense) => {
    state.expenses = state.expenses.map((expense) =>
      expense.id === updated.id ? updated : expense,
    );
    return updated;
  };

  const services: Services = {
    auth: {
      getSession: jest.fn(async () => state.session),
      onSessionChange: jest.fn((listener) => {
        sessionListeners.add(listener);
        return () => sessionListeners.delete(listener);
      }),
      sendSignInCode: jest.fn(async () => undefined),
      verifySignInCode: jest.fn(async (email: string, code: string) => {
        if (code !== '123456') throw new Error('Token has expired or is invalid');
        setSession({ userId: 'user-1', email });
      }),
      signOut: jest.fn(async () => setSession(null)),
    },

    expenses: {
      list: jest.fn(async () =>
        [...state.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
      get: jest.fn(
        async (id: string) => state.expenses.find((expense) => expense.id === id) ?? null,
      ),
      create: jest.fn(async (input) => {
        const expense: Expense = {
          id: input.id,
          status: 'processing',
          merchantName: null,
          merchantAbn: null,
          purchaseDate: null,
          financialYear: null,
          totalCents: null,
          gstCents: null,
          currency: 'AUD',
          category: null,
          workUsePercent: 100,
          isAsset: false,
          description: '',
          userNote: input.userNote,
          aiRationale: null,
          lowConfidenceFields: [],
          receiptPath: input.receiptPath,
          receiptMimeType: input.receiptMimeType,
          failureReason: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.expenses.push(expense);
        return expense;
      }),
      saveDetails: jest.fn(async (id, details, status) =>
        replaceExpense({
          ...findExpense(id),
          ...details,
          status,
          financialYear: financialYearOf(details.purchaseDate),
          lowConfidenceFields: [],
        }),
      ),
      remove: jest.fn(async (id: string) => {
        if (findExpense(id).status === 'confirmed') {
          throw new Error('Confirmed expenses are kept for your records and cannot be deleted.');
        }
        state.expenses = state.expenses.filter((expense) => expense.id !== id);
      }),
    },

    receipts: {
      upload: jest.fn(async (path: string, receipt: LocalReceipt) => {
        state.uploads.set(path, receipt);
      }),
      getViewUrl: jest.fn(async (path: string) => `https://storage.test/${path}`),
      remove: jest.fn(async (path: string) => {
        state.uploads.delete(path);
      }),
    },

    receiptReader: {
      read: jest.fn(async () => ({ status: 'needs_review' as const, failureReason: null })),
    },

    settings: {
      get: jest.fn(async () => state.settings),
      save: jest.fn(async (settings: UserSettings) => {
        state.settings = settings;
      }),
    },
  };

  return { services, state };
}
