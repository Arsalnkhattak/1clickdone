/**
 * Document Scanner Service
 * Manages document life cycle, non-destructive editing pipeline,
 * and memory resource cleanup.
 */

import { decodeImageFile } from '../utils/imageValidation';
import { detectDocumentCorners, getDefaultCorners } from '../utils/documentDetection';
import { applyPerspectiveWarp } from '../utils/perspectiveTransform';
import { applyImageEnhancements } from '../utils/imageEnhancement';

/**
 * Creates a unique stable document page object from an image File.
 */
export async function createDocumentPageFromFile(file, cv = null) {
  const { width, height, dataUrl, imgElement } = await decodeImageFile(file);

  // Attempt automatic document detection
  let detection = {
    corners: getDefaultCorners(width, height, 0.05),
    confidence: 'manual',
    detected: false,
  };

  if (cv && cv.Mat) {
    try {
      detection = detectDocumentCorners(cv, imgElement);
    } catch (err) {
      console.warn('Auto detection fallback during page creation:', err);
    }
  }

  const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const page = {
    id,
    originalName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'image/jpeg',
    originalWidth: width,
    originalHeight: height,
    originalDataUrl: dataUrl,
    corners: detection.corners,
    detectionConfidence: detection.confidence,
    isCropped: detection.detected, // If confident quad was found, mark cropped
    rotation: 0,                   // 0, 90, 180, 270
    straightenAngle: 0,            // -25 to +25 degrees
    filter: 'color',               // 'color', 'grayscale', 'bw', 'magic'
    brightness: 0,                 // -100 to 100
    contrast: 0,                   // -100 to 100
    sharpen: false,
    processedDataUrl: null,        // Generated preview/render
    undoStack: [],
    redoStack: [],
    status: 'ready',
    errorMessage: null,
  };

  // Generate initial processed rendering (fast, capped to 1800px for snappy preview)
  page.processedDataUrl = await renderDocumentPage(page, cv, 1800);
  return page;
}

/**
 * Executes the non-destructive rendering pipeline for a document page.
 * Returns a data URL (JPEG) of the rendered result.
 * maxDimension limits preview rendering to prevent main-thread lag on 20+ megapixel photos.
 */
export async function renderDocumentPage(page, cv = null, maxDimension = 1800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onerror = () => {
      reject(new Error(`Failed to load source image for rendering: ${page.originalName}`));
    };

    img.onload = () => {
      try {
        const origW = img.naturalWidth || 800;
        const origH = img.naturalHeight || 600;

        // Determine if preview scaling is beneficial
        const scale = maxDimension ? Math.min(1, maxDimension / Math.max(origW, origH)) : 1;
        const targetW = Math.round(origW * scale);
        const targetH = Math.round(origH * scale);

        let workCanvas = document.createElement('canvas');
        workCanvas.width = targetW;
        workCanvas.height = targetH;
        const ctx = workCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // 1. Perspective Crop (if enabled and corners are defined)
        if (page.isCropped && page.corners && page.corners.length === 4) {
          // Scale corners to target dimensions if scaled
          const scaledCorners = scale === 1
            ? page.corners
            : page.corners.map((p) => ({ x: p.x * scale, y: p.y * scale }));

          workCanvas = applyPerspectiveWarp(cv, workCanvas, scaledCorners);
        }

        // 2. Filters, Enhancements, Rotation & Straightening
        workCanvas = applyImageEnhancements(cv, workCanvas, {
          filter: page.filter,
          brightness: page.brightness,
          contrast: page.contrast,
          sharpen: page.sharpen,
          rotation: page.rotation,
          straightenAngle: page.straightenAngle,
        });

        // Convert to high quality JPEG data URL
        const resultDataUrl = workCanvas.toDataURL('image/jpeg', 0.92);
        resolve(resultDataUrl);
      } catch (err) {
        console.error('Render error:', err);
        reject(err);
      }
    };

    img.src = page.originalDataUrl;
  });
}

/**
 * Creates an image Blob from a data URL.
 */
export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Creates a File object from a data URL.
 */
export function dataUrlToFile(dataUrl, filename) {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}
