import { createContext, useContext, type ReactNode } from 'react';

import type { Services } from '@/services/ports';

const ServicesContext = createContext<Services | null>(null);

/** Makes the app's services available to every screen. Tests pass in fakes. */
export function ServicesProvider({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices must be used inside <ServicesProvider>');
  }
  return services;
}
