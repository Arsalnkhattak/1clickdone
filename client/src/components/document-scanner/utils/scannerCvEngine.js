/**
 * scannerCvEngine.js
 * OpenCV WASM Document Processing & Perspective Warp Engine
 * Includes strict try...finally memory deallocation for zero WASM memory leaks.
 */

export function isCvReady() {
  return typeof window !== 'undefined' && Boolean(window.cv && window.cv.Mat);
}

/**
 * Safely creates an OpenCV Mat from a canvas element.
 */
export function canvasToMat(canvas) {
  if (!isCvReady() || !canvas) return null;
  const cv = window.cv;
  try {
    return cv.imread(canvas);
  } catch (err) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return cv.matFromImageData(imgData);
  }
}

/**
 * Automatically detects document boundaries using Canny/Otsu edge contours
 * and returns [TL, TR, BR, BL] corner coordinates.
 */
export function autoDetectDocumentCorners(mat, width, height) {
  if (!isCvReady() || !mat) {
    return defaultCorners(width, height);
  }

  const cv = window.cv;
  const w = mat.cols || width;
  const h = mat.rows || height;

  let gray = null;
  let blur = null;
  let thresh = null;
  let contours = null;
  let hierarchy = null;
  let maxPoly = null;

  try {
    gray = new cv.Mat();
    blur = new cv.Mat();
    thresh = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();

    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    cv.threshold(blur, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;

    for (let i = 0; i < contours.size(); ++i) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area > w * h * 0.10) {
        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

        if (approx.rows === 4 && area > maxArea) {
          maxArea = area;
          if (maxPoly) maxPoly.delete();
          maxPoly = approx;
        } else {
          approx.delete();
        }
      }
      cnt.delete();
    }

    if (maxPoly) {
      const pts = [];
      for (let i = 0; i < 4; i++) {
        pts.push({ x: maxPoly.data32S[i * 2], y: maxPoly.data32S[i * 2 + 1] });
      }
      // Sort corners: Top two (left-to-right), Bottom two (right-to-left) -> [TL, TR, BR, BL]
      pts.sort((a, b) => a.y - b.y);
      const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
      const bottom = pts.slice(2, 4).sort((a, b) => b.x - a.x);
      return [top[0], top[1], bottom[0], bottom[1]];
    }
  } catch (err) {
    console.warn('Auto Detection Fallback triggered:', err);
  } finally {
    if (maxPoly) maxPoly.delete();
    if (gray) gray.delete();
    if (blur) blur.delete();
    if (thresh) thresh.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }

  return defaultCorners(w, h);
}

export function defaultCorners(width = 800, height = 600) {
  return [
    { x: width * 0.05, y: height * 0.05 },
    { x: width * 0.95, y: height * 0.05 },
    { x: width * 0.95, y: height * 0.95 },
    { x: width * 0.05, y: height * 0.95 },
  ];
}

/**
 * Perspective homography warp and filtering with guaranteed OpenCV Mat cleanup.
 */
export function warpAndFilterDocument({
  sourceMat,
  dstCanvas,
  corners,
  aspectPreset = 'free',
  filterMode = 'magic',
}) {
  if (!isCvReady() || !sourceMat || !dstCanvas || !corners || corners.length < 4) return;

  const cv = window.cv;

  const w1 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  const w2 = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
  const outWidth = Math.max(1, Math.round(Math.max(w1, w2)));

  const h1 = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
  const h2 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
  let outHeight = Math.max(1, Math.round(Math.max(h1, h2)));

  // Aspect ratio adjustments
  if (aspectPreset === 'a4') outHeight = Math.round(outWidth * 1.414);
  else if (aspectPreset === 'cnic') outHeight = Math.round(outWidth / 1.586);
  else if (aspectPreset === 'receipt') outHeight = Math.round(outWidth * 2.2);

  const matsToDelete = [];

  try {
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      corners[0].x, corners[0].y,
      corners[1].x, corners[1].y,
      corners[2].x, corners[2].y,
      corners[3].x, corners[3].y,
    ]);
    matsToDelete.push(srcTri);

    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      outWidth, 0,
      outWidth, outHeight,
      0, outHeight,
    ]);
    matsToDelete.push(dstTri);

    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    matsToDelete.push(M);

    const warped = new cv.Mat();
    matsToDelete.push(warped);
    cv.warpPerspective(sourceMat, warped, M, new cv.Size(outWidth, outHeight));

    const finalOutput = new cv.Mat();
    matsToDelete.push(finalOutput);

    if (filterMode === 'magic') {
      const gray = new cv.Mat();
      matsToDelete.push(gray);
      cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
      cv.adaptiveThreshold(gray, finalOutput, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 10);
    } else if (filterMode === 'grayscale') {
      cv.cvtColor(warped, finalOutput, cv.COLOR_RGBA2GRAY);
    } else if (filterMode === 'bw') {
      const gray = new cv.Mat();
      matsToDelete.push(gray);
      cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
      cv.threshold(gray, finalOutput, 128, 255, cv.THRESH_BINARY);
    } else {
      warped.copyTo(finalOutput);
    }

    cv.imshow(dstCanvas, finalOutput);
  } catch (err) {
    console.error('Warp & Filter Error:', err);
  } finally {
    matsToDelete.forEach((m) => {
      try {
        if (m && !m.isDeleted?.()) m.delete();
      } catch (e) {}
    });
  }
}
