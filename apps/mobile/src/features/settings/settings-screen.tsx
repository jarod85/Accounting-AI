import type { UserSettings } from '@accounting-ai/core';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorScreen, LoadingScreen, Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useServices } from '@/providers/services-provider';
import { useSession } from '@/providers/session-provider';

import { useSaveSettings, useSettings } from './use-settings';

export function SettingsScreen() {
  const settings = useSettings();

  if (settings.isPending) return <LoadingScreen />;
  if (settings.isError) return <ErrorScreen message="Could not load your settings." />;
  return <SettingsForm initial={settings.data} />;
}

function SettingsForm({ initial }: { initial: UserSettings }) {
  const { auth } = useServices();
  const { session } = useSession();
  const [values, setValues] = useState(initial);
  const save = useSaveSettings();
  const update = (changes: Partial<UserSettings>) =>
    setValues((current) => ({ ...current, ...changes }));

  return (
    <Screen>
      <ThemedText type="small" themeColor="textSecondary">
        This tells the AI about your situation so it can sort receipts between your job and your
        side business.
      </ThemedText>
      <TextField
        label="Your job"
        placeholder="e.g. Registered nurse"
        value={values.occupation}
        onChangeText={(occupation) => update({ occupation })}
      />
      <TextField
        label="Your side business"
        placeholder="e.g. Freelance wedding photography"
        value={values.businessDescription}
        onChangeText={(businessDescription) => update({ businessDescription })}
      />
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <ThemedText type="smallBold">Business is registered for GST</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Business deductions then exclude GST, which you claim back as a credit.
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel="Business is registered for GST"
          value={values.gstRegistered}
          onValueChange={(gstRegistered) => update({ gstRegistered })}
        />
      </View>

      {save.isError ? (
        <ThemedText themeColor="danger">Could not save. Try again.</ThemedText>
      ) : null}
      {save.isSuccess ? <ThemedText themeColor="success">Saved.</ThemedText> : null}
      <Button label="Save" isLoading={save.isPending} onPress={() => save.mutate(values)} />

      <Card>
        <ThemedText type="smallBold">About this app</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Accounting AI helps you keep records of tax-deductible expenses. It is not tax advice.
          Check claims against ato.gov.au or with a registered tax agent, and keep your records for
          five years after you lodge.
        </ThemedText>
      </Card>

      <ThemedText type="small" themeColor="textSecondary">
        Signed in as {session?.email ?? 'unknown'}
      </ThemedText>
      <Button label="Sign out" variant="danger" onPress={() => void auth.signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
    gap: Spacing.half,
  },
});
