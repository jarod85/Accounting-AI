import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { createFakeServices } from '@/test/fake-services';
import { renderWithServices } from '@/test/render';

import { CaptureScreen } from './capture-screen';
import { PermissionDeniedError, pickReceipt } from './pick-receipt';

jest.mock('./pick-receipt', () => ({
  ...jest.requireActual('./pick-receipt'),
  pickReceipt: jest.fn(),
}));

const JPEG = { uri: 'file:///cache/receipt.jpg', mimeType: 'image/jpeg' as const };

describe('<CaptureScreen />', () => {
  it('uploads the chosen photo with a note, then starts the AI reading it', async () => {
    jest.mocked(pickReceipt).mockResolvedValue(JPEG);
    const { services, state } = createFakeServices();
    const onSubmitted = jest.fn();
    await renderWithServices(<CaptureScreen onSubmitted={onSubmitted} />, services);

    expect(screen.getByRole('button', { name: 'Save and read receipt' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    expect(pickReceipt).toHaveBeenCalledWith('library');
    expect(await screen.findByLabelText('Receipt preview')).toBeOnTheScreen();

    await fireEvent.changeText(
      screen.getByLabelText('What was this for? (optional)'),
      'cable for my work monitor',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save and read receipt' }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith('new-expense-id'));
    expect(state.uploads.has('user-1/new-expense-id.jpg')).toBe(true);
    expect(state.expenses[0]?.userNote).toBe('cable for my work monitor');
    await waitFor(() => expect(services.receiptReader.read).toHaveBeenCalledWith('new-expense-id'));
  });

  it('shows a PDF as selected', async () => {
    jest
      .mocked(pickReceipt)
      .mockResolvedValue({ uri: 'file:///invoice.pdf', mimeType: 'application/pdf' });
    const { services } = createFakeServices();
    await renderWithServices(<CaptureScreen onSubmitted={jest.fn()} />, services);

    await fireEvent.press(screen.getByRole('button', { name: 'Choose PDF or file' }));

    expect(await screen.findByText('PDF receipt selected')).toBeOnTheScreen();
    expect(pickReceipt).toHaveBeenCalledWith('files');
  });

  it('explains when camera access is denied', async () => {
    jest
      .mocked(pickReceipt)
      .mockRejectedValue(
        new PermissionDeniedError('Camera access is off. Turn it on in your phone settings.'),
      );
    const { services } = createFakeServices();
    await renderWithServices(<CaptureScreen onSubmitted={jest.fn()} />, services);

    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }));

    expect(await screen.findByText(/Camera access is off/)).toBeOnTheScreen();
  });

  it('keeps the user on the screen when the upload fails', async () => {
    jest.mocked(pickReceipt).mockResolvedValue(JPEG);
    const { services } = createFakeServices();
    jest.mocked(services.receipts.upload).mockRejectedValue(new Error('Payload too large'));
    const onSubmitted = jest.fn();
    await renderWithServices(<CaptureScreen onSubmitted={onSubmitted} />, services);

    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await screen.findByLabelText('Receipt preview');
    await fireEvent.press(screen.getByRole('button', { name: 'Save and read receipt' }));

    expect(
      await screen.findByText(/Could not save the receipt: Payload too large/),
    ).toBeOnTheScreen();
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
