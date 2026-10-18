import { formatFinancialYear, type FinancialYear } from '@accounting-ai/core';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface FinancialYearPickerProps {
  years: FinancialYear[];
  selected: FinancialYear;
  onSelect: (year: FinancialYear) => void;
}

/** A row of chips, one per financial year ("2026–27"). */
export function FinancialYearPicker({ years, selected, onSelect }: FinancialYearPickerProps) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {years.map((year) => {
        const isSelected = year === selected;
        return (
          <Pressable
            key={year}
            accessibilityRole="button"
            accessibilityLabel={`Financial year ${formatFinancialYear(year)}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(year)}
            style={[
              styles.chip,
              { backgroundColor: isSelected ? theme.tint : theme.backgroundElement },
            ]}>
            <ThemedText type="smallBold" style={{ color: isSelected ? theme.onTint : theme.text }}>
              {formatFinancialYear(year)}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.large,
  },
});
