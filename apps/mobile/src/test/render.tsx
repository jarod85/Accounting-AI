import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { ServicesProvider } from '@/providers/services-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';
import type { Services } from '@/services/ports';

/** Renders children only once the session has loaded, like the root layout does. */
function AfterSessionLoads({ children }: { children: ReactNode }) {
  const { isLoading } = useSession();
  return isLoading ? null : children;
}

/** Renders `ui` with the same providers as the app, backed by the given (fake) services. */
export function renderWithServices(ui: ReactElement, services: Services) {
  // No retries (failures show at once) and no garbage-collection timers (Jest exits cleanly).
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <ServicesProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <AfterSessionLoads>{ui}</AfterSessionLoads>
        </SessionProvider>
      </QueryClientProvider>
    </ServicesProvider>,
  );
}
