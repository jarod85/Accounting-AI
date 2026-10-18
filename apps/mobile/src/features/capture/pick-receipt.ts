import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { LocalReceipt } from '@/services/ports';

/** Long edge of an uploaded photo: big enough to read small print, small enough to upload fast. */
const MAX_IMAGE_EDGE = 2000;

export type ReceiptSource = 'camera' | 'library' | 'files';

export class PermissionDeniedError extends Error {}

/** Lets the user take or choose a receipt. Returns null if they cancel. */
export async function pickReceipt(source: ReceiptSource): Promise<LocalReceipt | null> {
  if (source === 'files') {
    return pickFile();
  }
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new PermissionDeniedError(
        'Camera access is off. Turn it on in your phone settings to photograph receipts.',
      );
    }
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? toUploadableImage(asset.uri, asset.width, asset.height) : null;
}

async function pickFile(): Promise<LocalReceipt | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) {
    return null;
  }
  if (asset.mimeType === 'application/pdf') {
    return { uri: asset.uri, mimeType: 'application/pdf' };
  }
  // Size is unknown for picked files, so they are converted but not resized.
  return toUploadableImage(asset.uri, 0, 0);
}

/**
 * Re-encodes a photo as JPEG (this also converts iPhone HEIC photos, which the
 * AI cannot read) and shrinks it if its long edge is over MAX_IMAGE_EDGE.
 */
export async function toUploadableImage(
  uri: string,
  width: number,
  height: number,
): Promise<LocalReceipt> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_IMAGE_EDGE) {
    context.resize(width >= height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: saved.uri, mimeType: 'image/jpeg' };
}
