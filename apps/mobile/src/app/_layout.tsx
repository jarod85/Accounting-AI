import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';

import { ErrorScreen } from '@/components/screen';
import { ServicesProvider } from '@/providers/services-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';
import type { Services } from '@/services/ports';
import { createSupabaseClient } from '@/services/supabase/client';
import { createSupabaseServices } from '@/services/supabase/supabase-services';

SplashScreen.preventAutoHideAsync();

function createServices(): Services | Error {
  try {
    return createSupabaseServices(createSupabaseClient());
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [services] = useState(createServices);
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {services instanceof Error ? (
        <SetupError message={services.message} />
      ) : (
        <ServicesProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <RootNavigator queryClient={queryClient} />
            </SessionProvider>
          </QueryClientProvider>
        </ServicesProvider>
      )}
    </ThemeProvider>
  );
}

function SetupError({ message }: { message: string }) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return <ErrorScreen message={message} />;
}

/** Shows sign-in or the app depending on the session. */
function RootNavigator({ queryClient }: { queryClient: QueryClient }) {
  const { session, isLoading } = useSession();
  const userId = session?.userId ?? null;
  const previousUserId = useRef(userId);

  useEffect(() => {
    if (!isLoading) void SplashScreen.hideAsync();
  }, [isLoading]);

  // Never show one account's cached data to another: drop it when that account signs out.
  // Not on sign-in, because the app's screens have already started loading by then, and
  // clearing would cancel those requests and leave them loading forever.
  useEffect(() => {
    if (previousUserId.current !== null && previousUserId.current !== userId) {
      queryClient.clear();
    }
    previousUserId.current = userId;
  }, [queryClient, userId]);

  if (isLoading) return null;

  return (
    <Stack>
      <Stack.Protected guard={userId !== null}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={userId === null}>
        <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      </Stack.Protected>
    </Stack>
  );
}
