import { useRouter } from 'expo-router';

import { ExpenseListScreen } from '@/features/expenses';

export default function HomeRoute() {
  const router = useRouter();
  return (
    <ExpenseListScreen
      onOpenExpense={(id) => router.push({ pathname: '/expenses/[id]', params: { id } })}
      onAddReceipt={() => router.push('/capture')}
    />
  );
}
