// Runs before every mobile test file.

// Native modules that jest-expo does not fake, replaced with simple stand-ins.
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-expense-id' }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual('react-native');
  return { Image: View };
});
