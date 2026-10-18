import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { LocalReceipt } from '@/services/ports';

import { pickReceipt, type ReceiptSource } from './pick-receipt';
import { useSubmitReceipt } from './use-submit-receipt';

export interface CaptureScreenProps {
  /** Called once the receipt is saved; the AI keeps reading it in the background. */
  onSubmitted: (expenseId: string) => void;
}

export function CaptureScreen({ onSubmitted }: CaptureScreenProps) {
  const [receipt, setReceipt] = useState<LocalReceipt | null>(null);
  const [userNote, setUserNote] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);
  const submit = useSubmitReceipt();

  async function choose(source: ReceiptSource) {
    setPickError(null);
    try {
      const picked = await pickReceipt(source);
      if (picked) setReceipt(picked);
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not open that receipt.');
    }
  }

  function save() {
    if (!receipt) return;
    submit.mutate({ receipt, userNote }, { onSuccess: (expense) => onSubmitted(expense.id) });
  }

  return (
    <Screen>
      <View style={styles.sources}>
        <Button label="Take photo" onPress={() => choose('camera')} />
        <Button label="Choose photo" variant="secondary" onPress={() => choose('library')} />
        <Button label="Choose PDF or file" variant="secondary" onPress={() => choose('files')} />
      </View>
      {pickError ? <ThemedText themeColor="danger">{pickError}</ThemedText> : null}

      {receipt ? (
        <Card>
          {receipt.mimeType === 'application/pdf' ? (
            <ThemedText>PDF receipt selected</ThemedText>
          ) : (
            <Image
              source={{ uri: receipt.uri }}
              style={styles.preview}
              contentFit="contain"
              accessibilityLabel="Receipt preview"
            />
          )}
        </Card>
      ) : (
        <ThemedText themeColor="textSecondary">
          Photograph a receipt, or choose a photo or PDF invoice. The AI reads it and fills in the
          details for you to check.
        </ThemedText>
      )}

      <TextField
        label="What was this for? (optional)"
        hint="Helps the AI choose the right category, e.g. “cable for my work monitor” or “fuel for volunteering”."
        value={userNote}
        onChangeText={setUserNote}
        multiline
      />

      {submit.error ? (
        <ThemedText themeColor="danger">
          Could not save the receipt: {submit.error.message}
        </ThemedText>
      ) : null}
      <Button
        label="Save and read receipt"
        onPress={save}
        disabled={!receipt}
        isLoading={submit.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sources: {
    gap: Spacing.two,
  },
  preview: {
    width: '100%',
    height: 320,
    borderRadius: Radius.small,
  },
});
