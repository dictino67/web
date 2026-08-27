const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidImage, isValidInvoiceFile } = require('../file-validation');

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pdf = Buffer.from('%PDF-1.7\n');

 test('accepte les signatures JPEG et PNG valides', () => {
  assert.equal(isValidImage(jpeg, 'image/jpeg'), true);
  assert.equal(isValidImage(png, 'image/png'), true);
});

test('refuse un faux fichier dont le MIME ne correspond pas au contenu', () => {
  assert.equal(isValidImage(Buffer.from('texte'), 'image/jpeg'), false);
  assert.equal(isValidInvoiceFile(Buffer.from('texte'), 'application/pdf'), false);
});

test('accepte un PDF valide pour une facture', () => {
  assert.equal(isValidInvoiceFile(pdf, 'application/pdf'), true);
  assert.equal(isValidInvoiceFile(jpeg, 'image/png'), false);
});

test('refuse les formats non autorises', () => {
  assert.equal(isValidImage(pdf, 'application/pdf'), false);
  assert.equal(isValidInvoiceFile(png, 'image/png'), false);
});
