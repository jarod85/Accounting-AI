import {
  CLAIM_TYPE_LABELS,
  claimTypeOf,
  confirmedExpensesIn,
  DEFAULT_USER_SETTINGS,
  formatAud,
  formatFinancialYear,
  summarizeFinancialYear,
  type Expense,
  type TaxProfile,
} from '@accounting-ai/core';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FinancialYearPicker } from '@/components/financial-year-picker';
import { ErrorScreen, LoadingScreen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSettings } from '@/features/settings';

import { ExpenseRow } from './expense-row';
import { useExpenses } from './use-expenses';
import { useFinancialYears } from './use-financial-years';

export interface ExpenseListScreenProps {
  onOpenExpense: (expenseId: string) => void;
  onAddReceipt: () => void;
}

export function ExpenseListScreen(props: ExpenseListScreenProps) {
  const expenses = useExpenses();
  const settings = useSettings();

  if (expenses.isPending) return <LoadingScreen />;
  if (expenses.isError) {
    return (
      <ErrorScreen
        message="Could not load your expenses."
        onRetry={() => void expenses.refetch()}
      />
    );
  }
  return (
    <ExpenseList
      {...props}
      expenses={expenses.data}
      profile={settings.data ?? DEFAULT_USER_SETTINGS}
      isRefreshing={expenses.isRefetching}
      onRefresh={() => void expenses.refetch()}
    />
  );
}

interface ExpenseListProps extends ExpenseListScreenProps {
  expenses: Expense[];
  profile: TaxProfile;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function ExpenseList({
  expenses,
  profile,
  isRefreshing,
  onRefresh,
  onOpenExpense,
  onAddReceipt,
}: ExpenseListProps) {
  const { years, selected, setSelected } = useFinancialYears(expenses);
  const summary = summarizeFinancialYear(expenses, selected, profile);
  const toReview = expenses.filter((expense) => expense.status !== 'confirmed');
  const confirmed = confirmedExpensesIn(expenses, selected).reverse();

  const sections = summary.byClaimType.map((group) => ({
    title: CLAIM_TYPE_LABELS[group.claimType],
    claimableCents: group.claimableCents,
    data: confirmed.filter(
      (expense) => expense.category && claimTypeOf(expense.category) === group.claimType,
    ),
  }));

  return (
    <ThemedView style={styles.fill}>
      <SectionList
        sections={sections}
        keyExtractor={(expense) => expense.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button label="Add receipt" onPress={onAddReceipt} />
            <FinancialYearPicker years={years} selected={selected} onSelect={setSelected} />
            <Card accessibilityLabel="Financial year summary">
              <ThemedText type="small" themeColor="textSecondary">
                {formatFinancialYear(selected)} deductions so far
              </ThemedText>
              <ThemedText type="subtitle">{formatAud(summary.claimableCents)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {summary.count} confirmed {summary.count === 1 ? 'expense' : 'expenses'} totalling{' '}
                {formatAud(summary.totalCents)}
              </ThemedText>
            </Card>
            {toReview.length > 0 ? (
              <View style={styles.group}>
                <ThemedText type="smallBold">To review ({toReview.length})</ThemedText>
                {toReview.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    profile={profile}
                    onPress={() => onOpenExpense(expense.id)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">{section.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatAud(section.claimableCents)}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => (
          <ExpenseRow expense={item} profile={profile} onPress={() => onOpenExpense(item.id)} />
        )}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No confirmed expenses in {formatFinancialYear(selected)} yet. Add a receipt to get
            started.
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  group: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    marginTop: Spacing.three,
  },
});
