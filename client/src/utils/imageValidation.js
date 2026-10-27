/**
 * Image validation utilities for Document Scanner.
 * Validates file format, file size, image dimensions, and checks for duplicates.
 */

export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB default

/**
 * Validates an uploaded File object.
 * Returns { valid: boolean, error: string | null }
 */
export function validateDocumentFile(file, options = {}) {
  const maxBytes = options.maxSizeBytes || MAX_FILE_SIZE_BYTES;

  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // Size check
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

  // Type check (MIME or extension fallback)
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

/**
 * Checks if a file is already in the document queue.
 * Matches by name and size.
 */
export function isDuplicateFile(file, existingDocuments = []) {
  return existingDocuments.some(
    (doc) =>
      doc.originalName === file.name &&
      doc.fileSize === file.size
  );
}

/**
 * Reads an image file and safely decodes its dimensions.
 * Resolves with { width, height, dataUrl, imgElement } or rejects with error.
 */
export function decodeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error(`Failed to read file "${file.name}". It may be locked or corrupted.`));
    };

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();

      img.onerror = () => {
        reject(new Error(`File "${file.name}" appears to be a corrupted or invalid image.`));
      };

      img.onload = () => {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          reject(new Error(`File "${file.name}" has zero dimensions.`));
          return;
        }

        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          dataUrl,
          imgElement: img,
        });
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
