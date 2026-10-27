import test from 'node:test';
import assert from 'node:assert';

// Image validation logic mirrored from client/src/utils/imageValidation.js
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateDocumentFile(file, options = {}) {
  const maxBytes = options.maxSizeBytes || MAX_FILE_SIZE_BYTES;
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }
  if (file.size <= 0) {
    return { valid: false, error: `File "${file.name}" is empty (0 bytes).` };
  }
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File "${file.name}" (${sizeMb} MB) exceeds maximum allowed size of ${maxMb} MB.`,
    };
  }
  const mimeType = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const hasSupportedExt = SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!SUPPORTED_MIME_TYPES.includes(mimeType) && !hasSupportedExt) {
    return {
      valid: false,
      error: `File "${file.name}" is not a supported format. Please upload JPG, PNG, or WebP.`,
    };
  }
  return { valid: true, error: null };
}

function isDuplicateFile(file, existingDocuments = []) {
  return existingDocuments.some(
    (doc) => doc.originalName === file.name && doc.fileSize === file.size
  );
}

test('Image Validation - Valid files', () => {
  const validFiles = [
    { name: 'document.jpg', size: 1024 * 500, type: 'image/jpeg' },
    { name: 'passport.jpeg', size: 1024 * 800, type: 'image/jpeg' },
    { name: 'certificate.png', size: 1024 * 1200, type: 'image/png' },
    { name: 'scan.webp', size: 1024 * 400, type: 'image/webp' },
  ];

  for (const f of validFiles) {
    const res = validateDocumentFile(f);
    assert.strictEqual(res.valid, true, `Expected ${f.name} to be valid`);
    assert.strictEqual(res.error, null);
  }
});

test('Image Validation - Rejects empty file (0 bytes)', () => {
  const emptyFile = { name: 'blank.jpg', size: 0, type: 'image/jpeg' };
  const res = validateDocumentFile(emptyFile);
  assert.strictEqual(res.valid, false);
  assert.match(res.error, /empty \(0 bytes\)/);
});

test('Image Validation - Rejects oversized files (> 10MB)', () => {
  const largeFile = { name: 'huge_scan.jpg', size: 12 * 1024 * 1024, type: 'image/jpeg' };
  const res = validateDocumentFile(largeFile);
  assert.strictEqual(res.valid, false);
  assert.match(res.error, /exceeds maximum allowed size/);
});

test('Image Validation - Rejects unsupported formats', () => {
  const invalidFiles = [
    { name: 'notes.txt', size: 1000, type: 'text/plain' },
    { name: 'application.pdf', size: 50000, type: 'application/pdf' },
    { name: 'script.exe', size: 25000, type: 'application/octet-stream' },
  ];

  for (const f of invalidFiles) {
    const res = validateDocumentFile(f);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /not a supported format/);
  }
});

test('Duplicate file detection', () => {
  const existing = [
    { originalName: 'doc1.jpg', fileSize: 5000 },
    { originalName: 'doc2.png', fileSize: 12000 },
  ];

  const dup = { name: 'doc1.jpg', size: 5000 };
  const notDup = { name: 'doc3.jpg', size: 5000 };
  const diffSize = { name: 'doc1.jpg', size: 6000 };

  assert.strictEqual(isDuplicateFile(dup, existing), true);
  assert.strictEqual(isDuplicateFile(notDup, existing), false);
  assert.strictEqual(isDuplicateFile(diffSize, existing), false);
});
