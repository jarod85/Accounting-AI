import { DEFAULT_USER_SETTINGS, type Expense } from '@accounting-ai/core';
import { Image } from 'expo-image';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorScreen, LoadingScreen, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/features/settings';
import { useTheme } from '@/hooks/use-theme';

import { ExpenseForm } from './expense-form';
import {
  useDeleteExpense,
  useExpense,
  useReadReceipt,
  useReceiptUrl,
  useSaveExpense,
} from './use-expenses';

export interface ExpenseScreenProps {
  expenseId: string;
  /** Called after the expense is confirmed or deleted. */
  onDone: () => void;
}

export function ExpenseScreen({ expenseId, onDone }: ExpenseScreenProps) {
  const expense = useExpense(expenseId);

  if (expense.isPending) return <LoadingScreen />;
  if (expense.isError) return <ErrorScreen message="Could not load this expense." />;
  if (!expense.data) return <ErrorScreen message="This expense no longer exists." />;
  return <ExpenseDetail expense={expense.data} onDone={onDone} />;
}

function ExpenseDetail({ expense, onDone }: { expense: Expense; onDone: () => void }) {
  const settings = useSettings();
  const save = useSaveExpense(expense.id);
  const readReceipt = useReadReceipt();
  const remove = useDeleteExpense();
  const canEdit = expense.status === 'needs_review' || expense.status === 'confirmed';

  return (
    <Screen>
      <ReceiptPreview expense={expense} />

      {expense.status === 'processing' ? (
        <StatusBanner
          tone="info"
          message="Reading your receipt… this usually takes under a minute."
          busy
        />
      ) : null}
      {expense.status === 'failed' ? (
        <StatusBanner
          tone="danger"
          message={expense.failureReason ?? 'The receipt could not be read.'}
        />
      ) : null}
      {expense.status === 'needs_review' ? (
        <StatusBanner tone="warning" message="Check the details the AI filled in, then confirm." />
      ) : null}
      {expense.aiRationale && canEdit ? (
        <ThemedText type="small" themeColor="textSecondary">
          AI note: {expense.aiRationale}
        </ThemedText>
      ) : null}

      {expense.status === 'processing' || expense.status === 'failed' ? (
        <Button
          label={expense.status === 'failed' ? 'Try reading again' : 'Still waiting? Read again'}
          variant="secondary"
          isLoading={readReceipt.isPending}
          onPress={() => readReceipt.mutate(expense.id)}
        />
      ) : null}
      {readReceipt.error ? (
        <ThemedText themeColor="danger">{readReceipt.error.message}</ThemedText>
      ) : null}

      {canEdit ? (
        <ExpenseForm
          // Re-mount the form when the AI finishes, so it picks up the new values.
          key={`${expense.id}-${expense.status}`}
          expense={expense}
          profile={settings.data ?? DEFAULT_USER_SETTINGS}
          isSaving={save.isPending}
          onSave={(details, confirm) =>
            save.mutate({ details, confirm }, { onSuccess: () => confirm && onDone() })
          }
        />
      ) : null}
      {save.error ? (
        <ThemedText themeColor="danger">Could not save: {save.error.message}</ThemedText>
      ) : null}

      {expense.status !== 'confirmed' ? (
        <Button
          label="Delete expense"
          variant="danger"
          isLoading={remove.isPending}
          onPress={() =>
            remove.mutate(
              { id: expense.id, receiptPath: expense.receiptPath },
              { onSuccess: onDone },
            )
          }
        />
      ) : null}
      {remove.error ? <ThemedText themeColor="danger">{remove.error.message}</ThemedText> : null}
    </Screen>
  );
}

function ReceiptPreview({ expense }: { expense: Expense }) {
  const url = useReceiptUrl(expense.receiptPath);

  if (!url.data) {
    return (
      <Card style={styles.preview}>
        {url.isError ? <ThemedText>Receipt unavailable</ThemedText> : <ActivityIndicator />}
      </Card>
    );
  }
  if (expense.receiptMimeType === 'application/pdf') {
    return (
      <Button
        label="Open PDF receipt"
        variant="secondary"
        onPress={() => Linking.openURL(url.data)}
      />
    );
  }
  return (
    <Image
      source={{ uri: url.data }}
      style={styles.preview}
      contentFit="contain"
      accessibilityLabel="Receipt"
    />
  );
}

function StatusBanner({
  tone,
  message,
  busy = false,
}: {
  tone: 'info' | 'warning' | 'danger';
  message: string;
  busy?: boolean;
}) {
  const theme = useTheme();
  const color = { info: theme.tint, warning: theme.warning, danger: theme.danger }[tone];
  return (
    <View style={[styles.banner, { borderColor: color }]} accessibilityRole="alert">
      {busy ? <ActivityIndicator color={color} /> : null}
      <ThemedText type="small" style={[styles.bannerText, { color }]}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    height: 280,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.small,
    padding: Spacing.three,
  },
  bannerText: {
    flex: 1,
  },
});
