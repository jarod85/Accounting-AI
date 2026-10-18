import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Expenses', headerRight: () => <HomeHeaderLinks /> }}
      />
      <Stack.Screen name="capture" options={{ title: 'Add receipt', presentation: 'modal' }} />
      <Stack.Screen name="expenses/[id]" options={{ title: 'Expense' }} />
      <Stack.Screen name="export" options={{ title: 'Export for tax time' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

function HomeHeaderLinks() {
  return (
    <View style={styles.links}>
      <Link href="/export">
        <ThemedText type="linkPrimary">Export</ThemedText>
      </Link>
      <Link href="/settings">
        <ThemedText type="linkPrimary">Settings</ThemedText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
