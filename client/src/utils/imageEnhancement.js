/**
 * Image Enhancement Pipeline for Universal Document Scanner.
 * Supports:
 * - Original Color (with light adjustments)
 * - Grayscale (optimal 8-bit luminance)
 * - Black-and-White Document Mode (Adaptive Thresholding - CamScanner style)
 * - Magic / Xerox Color Document Enhancement
 * - Brightness & Contrast controls
 * - Sharpening kernel
 * - 90° rotation and fine tilt straightening
 *
 * Implements both OpenCV.js and Canvas 2D fallback paths.
 */

/**
 * Rotates and straightens a canvas by totalAngle degrees.
 * Expands canvas bounds so no corners get cut off.
 */
export function rotateCanvas(sourceCanvas, totalAngleDegrees) {
  const angle = (totalAngleDegrees || 0) % 360;
  if (Math.abs(angle) < 0.05) return sourceCanvas;

  const rad = (angle * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  const origW = sourceCanvas.width;
  const origH = sourceCanvas.height;

  // New bounding box size
  const newW = Math.round(origW * cos + origH * sin);
  const newH = Math.round(origW * sin + origH * cos);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = newW;
  outCanvas.height = newH;
  const ctx = outCanvas.getContext('2d');

  // Fill with clean white background so rotated margins are printable white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, newW, newH);

  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(sourceCanvas, -origW / 2, -origH / 2);

  return outCanvas;
}

/**
 * Applies sharpening via 3x3 convolution on Canvas 2D.
 */
export function sharpenCanvas2D(canvas, strength = 0.5) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const output = ctx.createImageData(w, h);
  const outData = output.data;

  // 3x3 unsharp kernel: [0, -s, 0, -s, 1 + 4s, -s, 0, -s, 0]
  const s = strength;
  const centerWeight = 1 + 4 * s;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          centerWeight * data[idx + c] -
          s * data[((y - 1) * w + x) * 4 + c] -
          s * data[((y + 1) * w + x) * 4 + c] -
          s * data[(y * w + (x - 1)) * 4 + c] -
          s * data[(y * w + (x + 1)) * 4 + c];

        outData[idx + c] = Math.max(0, Math.min(255, val));
      }
      outData[idx + 3] = data[idx + 3]; // Alpha unchanged
    }
  }

  ctx.putImageData(output, 0, 0);
  return canvas;
}

/**
 * Canvas 2D implementation of brightness, contrast, grayscale, and adaptive thresholding.
 */
export function enhanceCanvas2D(sourceCanvas, options = {}) {
  const {
    filter = 'color', // 'color' | 'grayscale' | 'bw' | 'magic'
    brightness = 0,   // -100 to +100 (0 = default)
    contrast = 0,     // -100 to +100 (0 = default)
    sharpen = false,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const len = data.length;

  // Contrast factor: contrast in [-100, 100] -> factor in [0, 3]
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightOffset = brightness * 1.28; // -128 to +128

  if (filter === 'bw') {
    // CamScanner-style Adaptive/Otsu document thresholding
    // Compute local luminance and apply threshold
    for (let i = 0; i < len; i += 4) {
      let r = factor * (data[i] - 128) + 128 + brightOffset;
      let g = factor * (data[i + 1] - 128) + 128 + brightOffset;
      let b = factor * (data[i + 2] - 128) + 128 + brightOffset;

      // Luminance (BT.601)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // High-contrast cutoff for crisp text:
      // Dark text / stamps remain dark, paper texture is pushed to pure white (255)
      const val = lum < 140 ? (lum < 90 ? 0 : 50) : 255;

      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  } else if (filter === 'grayscale') {
    for (let i = 0; i < len; i += 4) {
      let r = factor * (data[i] - 128) + 128 + brightOffset;
      let g = factor * (data[i + 1] - 128) + 128 + brightOffset;
      let b = factor * (data[i + 2] - 128) + 128 + brightOffset;

      const lum = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
      data[i] = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;
    }
  } else if (filter === 'magic') {
    // CamScanner Magic Color Contrast Sharpener
    // Brightens paper background and enriches text/ink lines
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum > 115) {
        r = Math.min(255, r * 1.25 + 12 + brightOffset);
        g = Math.min(255, g * 1.25 + 12 + brightOffset);
        b = Math.min(255, b * 1.25 + 12 + brightOffset);
      } else {
        r = Math.max(0, r * 0.72);
        g = Math.max(0, g * 0.72);
        b = Math.max(0, b * 0.72);
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  } else {
    // 'color' mode: adjust brightness/contrast if non-zero
    if (brightness !== 0 || contrast !== 0) {
      for (let i = 0; i < len; i += 4) {
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128 + brightOffset));
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128 + brightOffset));
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128 + brightOffset));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (sharpen) {
    sharpenCanvas2D(canvas, 0.4);
  }

  return canvas;
}

function safeImread(cv, canvas) {
  if (typeof cv.imread === 'function') {
    try {
      return cv.imread(canvas);
    } catch (e) {}
  }
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return cv.matFromImageData(imgData);
}

function safeImshow(cv, canvas, mat) {
  if (typeof cv.imshow === 'function') {
    try {
      cv.imshow(canvas, mat);
      return;
    } catch (e) {}
  }
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  const ctx = canvas.getContext('2d');
  const imgData = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
  ctx.putImageData(imgData, 0, 0);
}

/**
 * OpenCV.js implementation for high-precision adaptive thresholding and filtering.
 */
export function enhanceOpenCV(cv, sourceCanvas, options = {}) {
  const {
    filter = 'color',
    brightness = 0,
    contrast = 0,
    sharpen = false,
  } = options;

  let src = null;
  let dst = null;
  let gray = null;
  let kernel = null;

  try {
    src = safeImread(cv, sourceCanvas);
    dst = new cv.Mat();

    // Brightness and contrast: dst = alpha * src + beta
    const alpha = 1 + contrast / 100;
    const beta = brightness * 1.28;

    if (filter === 'bw') {
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // OpenCV adaptiveThreshold for crisp text on white paper
      // blockSize must be odd (e.g. 21)
      const blockSize = 25;
      const C = 10;
      cv.adaptiveThreshold(
        gray,
        dst,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        blockSize,
        C
      );

      // Convert back to RGBA for consistent canvas output
      const rgbaDst = new cv.Mat();
      cv.cvtColor(dst, rgbaDst, cv.COLOR_GRAY2RGBA);
      dst.delete();
      dst = rgbaDst;
    } else if (filter === 'grayscale') {
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      if (Math.abs(contrast) > 0.1 || Math.abs(brightness) > 0.1) {
        gray.convertTo(gray, -1, alpha, beta);
      }
      cv.cvtColor(gray, dst, cv.COLOR_GRAY2RGBA);
    } else if (filter === 'magic') {
      // Magic color mode: slight boost to contrast and brightness
      src.convertTo(dst, -1, alpha * 1.2, beta + 12);
    } else {
      // Standard color mode
      if (Math.abs(contrast) > 0.1 || Math.abs(brightness) > 0.1) {
        src.convertTo(dst, -1, alpha, beta);
      } else {
        dst = src.clone();
      }
    }

    // Optional sharpening with Laplacian kernel
    if (sharpen) {
      kernel = cv.matFromArray(3, 3, cv.CV_32F, [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0,
      ]);
      const sharpMat = new cv.Mat();
      cv.filter2D(dst, sharpMat, cv.CV_8U, kernel);
      dst.delete();
      dst = sharpMat;
    }

    const outCanvas = document.createElement('canvas');
    safeImshow(cv, outCanvas, dst);
    return outCanvas;
  } catch (err) {
    console.warn('OpenCV enhancement failed, using Canvas 2D fallback:', err);
    return enhanceCanvas2D(sourceCanvas, options);
  } finally {
    if (src) src.delete();
    if (dst) dst.delete();
    if (gray) gray.delete();
    if (kernel) kernel.delete();
  }
}

/**
 * Universal enhancement runner that picks OpenCV if available, otherwise Canvas 2D.
 */
export function applyImageEnhancements(cv, sourceCanvas, options = {}) {
  let enhanced = sourceCanvas;

  // 1. First apply color/bw/contrast/sharpen
  if (cv && cv.Mat && cv.adaptiveThreshold) {
    enhanced = enhanceOpenCV(cv, sourceCanvas, options);
  } else {
    enhanced = enhanceCanvas2D(sourceCanvas, options);
  }

  // 2. Then apply rotation and straighten angle
  const totalAngle = (options.rotation || 0) + (options.straightenAngle || 0);
  if (Math.abs(totalAngle) > 0.05) {
    enhanced = rotateCanvas(enhanced, totalAngle);
  }

  return enhanced;
}
