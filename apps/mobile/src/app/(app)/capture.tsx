import { useRouter } from 'expo-router';

import { CaptureScreen } from '@/features/capture';

export default function CaptureRoute() {
  const router = useRouter();
  return (
    <CaptureScreen
      onSubmitted={(id) => router.replace({ pathname: '/expenses/[id]', params: { id } })}
    />
  );
}
