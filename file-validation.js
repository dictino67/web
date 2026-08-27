const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const invoiceMimeTypes = new Set(['image/jpeg', 'application/pdf']);

function hasValidSignature(buffer, mimeType) {
  if (mimeType === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return mimeType === 'application/pdf' && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isValidImage(buffer, mimeType) {
  return imageMimeTypes.has(mimeType) && hasValidSignature(buffer, mimeType);
}

function isValidInvoiceFile(buffer, mimeType) {
  return invoiceMimeTypes.has(mimeType) && hasValidSignature(buffer, mimeType);
}

module.exports = { hasValidSignature, isValidImage, isValidInvoiceFile };
