import {
  assessExpense,
  CATEGORIES,
  formatAud,
  formatAustralianDate,
  type Expense,
  type TaxProfile,
} from '@accounting-ai/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STATUS_LABELS: Record<Expense['status'], string> = {
  processing: 'Reading receipt…',
  needs_review: 'Needs your review',
  failed: "Couldn't read: tap to fix",
  confirmed: '',
};

export interface ExpenseRowProps {
  expense: Expense;
  profile: TaxProfile;
  onPress: () => void;
}

export function ExpenseRow({ expense, profile, onPress }: ExpenseRowProps) {
  const theme = useTheme();
  const isConfirmed = expense.status === 'confirmed';
  const { claimableCents } = assessExpense(expense, profile);
  const title =
    expense.merchantName ?? (expense.status === 'processing' ? 'New receipt' : 'Unknown supplier');
  const subtitle = [
    expense.purchaseDate ? formatAustralianDate(expense.purchaseDate) : null,
    expense.category ? CATEGORIES[expense.category].label : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${expense.totalCents === null ? '' : `, ${formatAud(expense.totalCents)}`}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
        {!isConfirmed ? (
          <ThemedText type="small" themeColor={expense.status === 'failed' ? 'danger' : 'warning'}>
            {STATUS_LABELS[expense.status]}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.amounts}>
        {expense.totalCents !== null ? (
          <ThemedText type="smallBold">{formatAud(expense.totalCents)}</ThemedText>
        ) : null}
        {isConfirmed ? (
          <ThemedText type="small" themeColor={claimableCents > 0 ? 'success' : 'textSecondary'}>
            {claimableCents > 0 ? `${formatAud(claimableCents)} deductible` : 'Not deductible'}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  amounts: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
});
