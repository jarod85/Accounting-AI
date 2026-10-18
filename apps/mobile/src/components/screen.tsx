import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A scrollable page with safe-area and keyboard handling. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SafeAreaView edges={['bottom']} style={styles.inner}>
            {children}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/** Full-screen spinner with an optional message. */
export function LoadingScreen({ message }: { message?: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={[styles.fill, styles.centered]}>
      <ActivityIndicator color={theme.tint} size="large" />
      {message ? <ThemedText themeColor="textSecondary">{message}</ThemedText> : null}
    </ThemedView>
  );
}

/** Full-screen error message, with a retry button when `onRetry` is given. */
export function ErrorScreen({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <ThemedView style={[styles.fill, styles.centered]}>
      <ThemedText themeColor="danger" style={styles.errorText}>
        {message}
      </ThemedText>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  errorText: {
    textAlign: 'center',
  },
});
