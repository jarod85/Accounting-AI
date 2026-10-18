import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Draws attention to a value the AI was unsure about. */
  needsCheck?: boolean;
};

export function TextField({ label, error, hint, needsCheck, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const borderColor = error ? theme.danger : needsCheck ? theme.warning : theme.border;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">
        {label}
        {needsCheck ? (
          <ThemedText type="small" themeColor="warning">
            {' '}
            · please check
          </ThemedText>
        ) : null}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { color: theme.text, borderColor, backgroundColor: theme.background },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
});
