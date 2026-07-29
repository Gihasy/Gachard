import QRCode from "qrcode";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gachard.vercel.app";

/**
 * Generate QR data URL untuk kartu.
 * QR berisi URL ke halaman scan dengan tokenId.
 */
export function generateQRData(tokenId: number): string {
  return `${BASE_URL}/scan?tokenId=${tokenId}`;
}

/**
 * Generate QR code sebagai data URL (base64 PNG).
 */
export async function generateQRCode(tokenId: number): Promise<string> {
  const data = generateQRData(tokenId);
  return QRCode.toDataURL(data, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Generate QR code sebagai PNG buffer.
 */
export async function generateQRCodeBuffer(tokenId: number): Promise<Buffer> {
  const data = generateQRData(tokenId);
  return QRCode.toBuffer(data, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
