import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createFakeServices } from '@/test/fake-services';
import { renderWithServices } from '@/test/render';

import { SignInScreen } from './sign-in-screen';

async function renderSignedOut() {
  const fake = createFakeServices({ session: null });
  await renderWithServices(<SignInScreen />, fake.services);
  return fake;
}

describe('<SignInScreen />', () => {
  it('signs in with an emailed code', async () => {
    const { services, state } = await renderSignedOut();

    expect(screen.getByRole('button', { name: 'Send code' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Email'), ' Me@Example.com ');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));

    expect(await screen.findByText('We sent a 6-digit code to me@example.com.')).toBeOnTheScreen();
    expect(services.auth.sendSignInCode).toHaveBeenCalledWith('me@example.com');

    await fireEvent.changeText(screen.getByLabelText('Sign-in code'), '12 34 56');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(state.session?.email).toBe('me@example.com'));
  });

  it('explains a wrong code', async () => {
    await renderSignedOut();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'me@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    await fireEvent.changeText(await screen.findByLabelText('Sign-in code'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('That code did not work. Check it and try again.'),
    ).toBeOnTheScreen();
  });

  it('can go back and use a different email', async () => {
    await renderSignedOut();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'me@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Use a different email' }));

    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
  });
});
