import type { UserSettings } from '@accounting-ai/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServices } from '@/providers/services-provider';

const settingsKey = ['settings'] as const;

export function useSettings() {
  const { settings } = useServices();
  return useQuery({ queryKey: settingsKey, queryFn: () => settings.get() });
}

export function useSaveSettings() {
  const { settings } = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (next: UserSettings) => settings.save(next),
    onSuccess: (_result, next) => queryClient.setQueryData(settingsKey, next),
  });
}
