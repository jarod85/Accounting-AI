import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useServices } from '@/providers/services-provider';
import type { Session } from '@/services/ports';

interface SessionState {
  session: Session | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionState | null>(null);

/** Tracks who is signed in, so routes can switch between sign-in and the app. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices();
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    let isMounted = true;
    auth
      .getSession()
      .catch(() => null)
      .then((session) => {
        if (isMounted) setState({ session, isLoading: false });
      });
    const unsubscribe = auth.onSessionChange((session) => setState({ session, isLoading: false }));
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [auth]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (!state) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return state;
}

/** The signed-in user. Only call this from screens that require sign-in. */
export function useSignedInSession(): Session {
  const { session } = useSession();
  if (!session) {
    throw new Error('useSignedInSession called while signed out');
  }
  return session;
}
