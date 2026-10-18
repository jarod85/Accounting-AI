import {
  CLAIM_TYPE_LABELS,
  DEFAULT_USER_SETTINGS,
  expensesToCsv,
  formatAud,
  formatFinancialYear,
  summarizeFinancialYear,
  type Expense,
} from '@accounting-ai/core';
import { useMutation } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FinancialYearPicker } from '@/components/financial-year-picker';
import { ErrorScreen, LoadingScreen, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useExpenses, useFinancialYears } from '@/features/expenses';
import { useSettings } from '@/features/settings';

import { shareCsv } from './share-csv';

export function ExportScreen() {
  const expenses = useExpenses();

  if (expenses.isPending) return <LoadingScreen />;
  if (expenses.isError) {
    return (
      <ErrorScreen
        message="Could not load your expenses."
        onRetry={() => void expenses.refetch()}
      />
    );
  }
  return <ExportPanel expenses={expenses.data} />;
}

function ExportPanel({ expenses }: { expenses: Expense[] }) {
  const settings = useSettings();
  const profile = settings.data ?? DEFAULT_USER_SETTINGS;
  const { years, selected, setSelected } = useFinancialYears(expenses);
  const summary = summarizeFinancialYear(expenses, selected, profile);
  const unconfirmed = expenses.filter(
    (expense) => expense.status !== 'confirmed' && expense.financialYear === selected,
  ).length;

  const share = useMutation({
    mutationFn: () =>
      shareCsv(
        `accounting-ai-${formatFinancialYear(selected)}.csv`,
        expensesToCsv(expenses, selected, profile),
      ),
  });

  return (
    <Screen>
      <FinancialYearPicker years={years} selected={selected} onSelect={setSelected} />
      <Card accessibilityLabel="Export summary">
        <ThemedText type="smallBold">
          {formatFinancialYear(selected)}: {summary.count}{' '}
          {summary.count === 1 ? 'expense' : 'expenses'}, {formatAud(summary.claimableCents)}{' '}
          deductible
        </ThemedText>
        {summary.byClaimType.map((group) => (
          <View key={group.claimType} style={styles.line}>
            <ThemedText type="small">{CLAIM_TYPE_LABELS[group.claimType]}</ThemedText>
            <ThemedText type="small">{formatAud(group.claimableCents)}</ThemedText>
          </View>
        ))}
      </Card>
      {unconfirmed > 0 ? (
        <ThemedText type="small" themeColor="warning">
          {unconfirmed} {unconfirmed === 1 ? 'expense is' : 'expenses are'} not confirmed yet and
          will not be included.
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        The CSV opens in Excel, Numbers or Google Sheets. Give it to your tax agent or use it to
        fill in your return. Receipts stay safely stored in the app.
      </ThemedText>
      {share.error ? <ThemedText themeColor="danger">{share.error.message}</ThemedText> : null}
      <Button
        label="Export CSV"
        isLoading={share.isPending}
        disabled={summary.count === 0}
        onPress={() => share.mutate()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
