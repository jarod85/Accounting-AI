import type { Expense } from '@accounting-ai/core';
import { makeExpense } from '@accounting-ai/core/testing';
import { act, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import AppLayout from '@/app/(app)/_layout';
import CaptureRoute from '@/app/(app)/capture';
import ExpenseRoute from '@/app/(app)/expenses/[id]';
import ExportRoute from '@/app/(app)/export';
import HomeRoute from '@/app/(app)/index';
import SettingsRoute from '@/app/(app)/settings';
import RootLayout from '@/app/_layout';
import SignInRoute from '@/app/sign-in';
import type { Services } from '@/services/ports';
import { createFakeServices, TEST_SESSION } from '@/test/fake-services';

// The root layout builds the real Supabase services; hand it fakes instead.
let mockServices: Services;
jest.mock('@/services/supabase/client', () => ({ createSupabaseClient: () => ({}) }));
jest.mock('@/services/supabase/supabase-services', () => ({
  createSupabaseServices: () => mockServices,
}));

function renderApp() {
  return renderRouter({
    _layout: RootLayout,
    '(app)/_layout': AppLayout,
    '(app)/index': HomeRoute,
    '(app)/capture': CaptureRoute,
    '(app)/expenses/[id]': ExpenseRoute,
    '(app)/export': ExportRoute,
    '(app)/settings': SettingsRoute,
    'sign-in': SignInRoute,
  });
}

describe('Root layout', () => {
  it('loads the expense list when the app opens already signed in', async () => {
    const { services } = createFakeServices({
      expenses: [makeExpense({ status: 'needs_review', merchantName: 'Officeworks' })],
    });
    mockServices = services;

    await renderApp();

    expect(await screen.findByText('Officeworks')).toBeOnTheScreen();
  });

  it("does not show the last account's expenses after signing out and in again", async () => {
    const { services } = createFakeServices({
      expenses: [makeExpense({ status: 'needs_review', merchantName: 'Officeworks' })],
    });
    mockServices = services;
    await renderApp();
    expect(await screen.findByText('Officeworks')).toBeOnTheScreen();

    await act(() => services.auth.signOut());
    expect(await screen.findByRole('button', { name: 'Send code' })).toBeOnTheScreen();

    // Hold the next account's list open, so only cached data could fill the screen.
    let resolveList: (expenses: Expense[]) => void = () => undefined;
    jest
      .mocked(services.expenses.list)
      .mockImplementation(() => new Promise((resolve) => (resolveList = resolve)));
    const listCalls = jest.mocked(services.expenses.list).mock.calls.length;
    await act(() => services.auth.verifySignInCode(TEST_SESSION.email ?? '', '123456'));

    await waitFor(() =>
      expect(jest.mocked(services.expenses.list).mock.calls.length).toBeGreaterThan(listCalls),
    );
    expect(screen.queryByText('Officeworks')).not.toBeOnTheScreen();

    await act(async () =>
      resolveList([makeExpense({ status: 'needs_review', merchantName: 'Bunnings' })]),
    );
    expect(await screen.findByText('Bunnings')).toBeOnTheScreen();
  });
});
