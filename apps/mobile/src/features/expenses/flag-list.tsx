import { FLAG_INFO, type ExpenseFlag } from '@accounting-ai/core';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Plain-English review notes for an expense, warnings first. */
export function FlagList({ flags }: { flags: ExpenseFlag[] }) {
  const theme = useTheme();
  const sorted = [...flags].sort(
    (a, b) =>
      Number(FLAG_INFO[b].severity === 'warning') - Number(FLAG_INFO[a].severity === 'warning'),
  );

  return (
    <View style={styles.list}>
      {sorted.map((flag) => {
        const { severity, title, detail } = FLAG_INFO[flag];
        const accent = severity === 'warning' ? theme.warning : theme.tint;
        return (
          <View key={flag} style={[styles.flag, { borderLeftColor: accent }]}>
            <ThemedText type="smallBold" style={{ color: accent }}>
              {title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {detail}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  flag: {
    borderLeftWidth: 3,
    borderRadius: Radius.small,
    paddingLeft: Spacing.two,
    gap: Spacing.half,
  },
});
