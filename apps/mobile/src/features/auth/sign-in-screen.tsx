import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useServices } from '@/providers/services-provider';

/**
 * Passwordless sign-in: the user enters their email, receives a 6-digit code
 * and types it in. Once verified, the session change moves them into the app.
 */
export function SignInScreen() {
  const { auth } = useServices();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  const sendCode = useMutation({
    mutationFn: (address: string) => auth.sendSignInCode(address),
    onSuccess: (_result, address) => setCodeSentTo(address),
  });
  const verifyCode = useMutation({
    mutationFn: ({ address, token }: { address: string; token: string }) =>
      auth.verifySignInCode(address, token),
  });

  const trimmedEmail = email.trim().toLowerCase();
  const isEmailValid = /^\S+@\S+\.\S+$/.test(trimmedEmail);

  if (codeSentTo === null) {
    return (
      <Screen>
        <ThemedText type="subtitle">Accounting AI</ThemedText>
        <ThemedText themeColor="textSecondary">
          Keep every tax-deductible receipt in one place. Enter your email and we will send you a
          sign-in code.
        </ThemedText>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        {sendCode.error ? (
          <ThemedText themeColor="danger">
            Could not send the code: {sendCode.error.message}
          </ThemedText>
        ) : null}
        <Button
          label="Send code"
          disabled={!isEmailValid}
          isLoading={sendCode.isPending}
          onPress={() => sendCode.mutate(trimmedEmail)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText>We sent a 6-digit code to {codeSentTo}.</ThemedText>
      <TextField
        label="Sign-in code"
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      {verifyCode.error ? (
        <ThemedText themeColor="danger">That code did not work. Check it and try again.</ThemedText>
      ) : null}
      <Button
        label="Sign in"
        disabled={code.length !== 6}
        isLoading={verifyCode.isPending}
        onPress={() => verifyCode.mutate({ address: codeSentTo, token: code })}
      />
      <Button
        label="Use a different email"
        variant="secondary"
        onPress={() => {
          setCodeSentTo(null);
          setCode('');
          verifyCode.reset();
        }}
      />
    </Screen>
  );
}
