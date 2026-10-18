import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createFakeServices } from '@/test/fake-services';
import { renderWithServices } from '@/test/render';

import { SettingsScreen } from './settings-screen';

describe('<SettingsScreen />', () => {
  it('loads and saves the tax profile', async () => {
    const { services, state } = createFakeServices({
      settings: { occupation: 'Nurse', businessDescription: '', gstRegistered: false },
    });
    await renderWithServices(<SettingsScreen />, services);

    expect(await screen.findByDisplayValue('Nurse')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Your side business'), 'Wedding photography');
    await fireEvent(screen.getByLabelText('Business is registered for GST'), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved.')).toBeOnTheScreen();
    expect(state.settings).toEqual({
      occupation: 'Nurse',
      businessDescription: 'Wedding photography',
      gstRegistered: true,
    });
  });

  it('signs out', async () => {
    const { services, state } = createFakeServices();
    await renderWithServices(<SettingsScreen />, services);

    expect(await screen.findByText('Signed in as me@example.com')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(state.session).toBeNull());
  });

  it('includes the not-tax-advice disclaimer', async () => {
    const { services } = createFakeServices();
    await renderWithServices(<SettingsScreen />, services);

    expect(await screen.findByText(/It is not tax advice/)).toBeOnTheScreen();
  });
});
