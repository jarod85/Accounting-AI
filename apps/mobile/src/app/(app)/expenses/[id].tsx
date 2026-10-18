import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExpenseScreen } from '@/features/expenses';

export default function ExpenseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <ExpenseScreen expenseId={id} onDone={() => router.back()} />;
}
