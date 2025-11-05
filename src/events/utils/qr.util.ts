import * as QRCode from 'qrcode';

/**
 * Generates a QR code as a PNG buffer.
 *
 * @param targetUrl - The URL to encode in the QR code
 * @returns Promise resolving to a PNG buffer
 */
export async function generateQrPng(targetUrl: string): Promise<Buffer> {
  const buffer = await QRCode.toBuffer(targetUrl, {
    type: 'png',
    margin: 2,
    width: 512,
    errorCorrectionLevel: 'M',
  });

  return buffer;
}
