import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes `csv` to a temporary file and opens the share sheet (email, Drive, Files…). */
export async function shareCsv(fileName: string, csv: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Export expenses',
  });
}
