/**
 * Perspective Transformation Engine for Universal Document Scanner.
 * Corrects camera tilt, skewed perspective, and crops documents into rectangular outputs.
 * Provides both OpenCV.js hardware-accelerated warp and a pure JavaScript
 * Homography Bilinear Interpolation engine for 100% offline/fallback accuracy.
 */

import { pointDistance } from './documentDetection.js';

/**
 * Computes natural output dimensions from 4 quadrilateral corners:
 * [Top-Left, Top-Right, Bottom-Right, Bottom-Left].
 * Supports aspect ratio presets: 'auto', 'a4', 'cnic', 'receipt'.
 */
export function computeOutputDimensions(corners, preset = 'auto') {
  const [tl, tr, br, bl] = corners;

  // Width: maximum of top and bottom edges
  const widthTop = pointDistance(tl, tr);
  const widthBottom = pointDistance(bl, br);
  let outWidth = Math.round(Math.max(widthTop, widthBottom));

  // Height: maximum of left and right edges
  const heightLeft = pointDistance(tl, bl);
  const heightRight = pointDistance(tr, br);
  let outHeight = Math.round(Math.max(heightLeft, heightRight));

  // Preset Aspect Ratio Forcing
  if (preset === 'a4') {
    // A4 aspect ratio 1 : 1.414
    if (outWidth >= outHeight) {
      outHeight = Math.round(outWidth / 1.414);
    } else {
      outWidth = Math.round(outHeight / 1.414);
    }
  } else if (preset === 'cnic') {
    // Pakistani CNIC / ID-1 card aspect ratio 1.586 : 1
    if (outWidth >= outHeight) {
      outHeight = Math.round(outWidth / 1.586);
    } else {
      outWidth = Math.round(outHeight / 1.586);
    }
  }

  return {
    width: Math.max(20, outWidth),
    height: Math.max(20, outHeight),
    aspectRatio: outWidth / outHeight,
  };
}

/**
 * Solves the 3x3 Homography Matrix mapping src coordinates to dst coordinates
 * using Gaussian elimination.
 */
export function solveHomographyMatrix(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const u = dst[i].x;
    const v = dst[i].y;
    const x = src[i].x;
    const y = src[i].y;
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }

  const h = gaussianElimination(A, b);
  if (!h) return null;

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0],
  ];
}

function gaussianElimination(A, b) {
  const n = 8;
  for (let i = 0; i < n; i++) A[i].push(b[i]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    const temp = A[i];
    A[i] = A[maxRow];
    A[maxRow] = temp;

    if (Math.abs(A[i][i]) < 1e-10) return null;

    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j <= n; j++) {
        if (i === j) A[k][j] = 0;
        else A[k][j] += c * A[i][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = A[i][n] / A[i][i];
    for (let k = i - 1; k >= 0; k--) A[k][n] -= A[k][i] * x[i];
  }
  return x;
}

/**
 * Pure JavaScript Bilinear Interpolation Homography Warp.
 * Rectifies quadrilateral to rectangular image without OpenCV!
 */
export function warpPerspectiveCanvas2D(sourceCanvasOrImage, corners, preset = 'auto') {
  const [tl, tr, br, bl] = corners;
  const dims = computeOutputDimensions(corners, preset);
  const targetW = dims.width;
  const targetH = dims.height;

  let srcCanvas = sourceCanvasOrImage;
  if (!(sourceCanvasOrImage instanceof HTMLCanvasElement)) {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = sourceCanvasOrImage.naturalWidth || sourceCanvasOrImage.width;
    srcCanvas.height = sourceCanvasOrImage.naturalHeight || sourceCanvasOrImage.height;
    const ctx = srcCanvas.getContext('2d');
    ctx.drawImage(sourceCanvasOrImage, 0, 0);
  }

  const w = srcCanvas.width;
  const h = srcCanvas.height;

  const srcPts = [
    { x: tl.x, y: tl.y },
    { x: tr.x, y: tr.y },
    { x: br.x, y: br.y },
    { x: bl.x, y: bl.y },
  ];

  const dstPts = [
    { x: 0, y: 0 },
    { x: targetW, y: 0 },
    { x: targetW, y: targetH },
    { x: 0, y: targetH },
  ];

  const H = solveHomographyMatrix(srcPts, dstPts);
  if (!H) {
    // Extreme fallback: simple crop
    return warpPerspectiveCanvasFallback(srcCanvas, corners);
  }

  const warpCanvas = document.createElement('canvas');
  warpCanvas.width = targetW;
  warpCanvas.height = targetH;
  const warpCtx = warpCanvas.getContext('2d');

  const srcCtx = srcCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const dstData = warpCtx.createImageData(targetW, targetH);

  const sData = srcData.data;
  const dData = dstData.data;

  // Inverse Mapping Warp with Bilinear Interpolation
  for (let v = 0; v < targetH; v++) {
    for (let u = 0; u < targetW; u++) {
      const den = H[2][0] * u + H[2][1] * v + H[2][2];
      const sx = (H[0][0] * u + H[0][1] * v + H[0][2]) / den;
      const sy = (H[1][0] * u + H[1][1] * v + H[1][2]) / den;

      if (sx >= 0 && sx < w - 1 && sy >= 0 && sy < h - 1) {
        const x1 = Math.floor(sx);
        const y1 = Math.floor(sy);
        const dx = sx - x1;
        const dy = sy - y1;

        const idx11 = (y1 * w + x1) * 4;
        const idx21 = (y1 * w + (x1 + 1)) * 4;
        const idx12 = ((y1 + 1) * w + x1) * 4;
        const idx22 = ((y1 + 1) * w + (x1 + 1)) * 4;

        const dstIdx = (v * targetW + u) * 4;

        for (let c = 0; c < 3; c++) {
          const val =
            (1 - dx) * (1 - dy) * sData[idx11 + c] +
            dx * (1 - dy) * sData[idx21 + c] +
            (1 - dx) * dy * sData[idx12 + c] +
            dx * dy * sData[idx22 + c];
          dData[dstIdx + c] = val;
        }
        dData[dstIdx + 3] = 255;
      }
    }
  }

  warpCtx.putImageData(dstData, 0, 0);
  return warpCanvas;
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
 * Executes OpenCV.js perspective warp.
 * Returns an HTMLCanvasElement with the rectified document.
 */
export function warpPerspectiveOpenCV(cv, sourceCanvasOrImage, corners, preset = 'auto') {
  const [tl, tr, br, bl] = corners;
  const dims = computeOutputDimensions(corners, preset);
  const { width: outW, height: outH } = dims;

  let srcCanvas = sourceCanvasOrImage;
  if (!(sourceCanvasOrImage instanceof HTMLCanvasElement)) {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = sourceCanvasOrImage.naturalWidth || sourceCanvasOrImage.width;
    srcCanvas.height = sourceCanvasOrImage.naturalHeight || sourceCanvasOrImage.height;
    const ctx = srcCanvas.getContext('2d');
    ctx.drawImage(sourceCanvasOrImage, 0, 0);
  }

  let srcMat = null;
  let dstMat = null;
  let srcPts = null;
  let dstPts = null;
  let transformMatrix = null;

  try {
    srcMat = safeImread(cv, srcCanvas);

    // Source quad coordinates [TL, TR, BR, BL]
    srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      tl.x, tl.y,
      tr.x, tr.y,
      br.x, br.y,
      bl.x, bl.y,
    ]);

    // Destination rectangle coordinates [0, 0, outW, 0, outW, outH, 0, outH]
    dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      outW, 0,
      outW, outH,
      0, outH,
    ]);

    transformMatrix = cv.getPerspectiveTransform(srcPts, dstPts);
    dstMat = new cv.Mat();

    cv.warpPerspective(
      srcMat,
      dstMat,
      transformMatrix,
      new cv.Size(outW, outH),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    const outCanvas = document.createElement('canvas');
    safeImshow(cv, outCanvas, dstMat);
    return outCanvas;
  } finally {
    if (srcMat) srcMat.delete();
    if (dstMat) dstMat.delete();
    if (srcPts) srcPts.delete();
    if (dstPts) dstPts.delete();
    if (transformMatrix) transformMatrix.delete();
  }
}

/**
 * Fallback Canvas-based bounding box crop when other methods are unavailable.
 */
export function warpPerspectiveCanvasFallback(sourceCanvasOrImage, corners) {
  const [tl, tr, br, bl] = corners;
  const dims = computeOutputDimensions(corners);
  const { width: outW, height: outH } = dims;

  const minX = Math.max(0, Math.min(tl.x, bl.x));
  const minY = Math.max(0, Math.min(tl.y, tr.y));
  const maxX = Math.max(tr.x, br.x);
  const maxY = Math.max(bl.y, br.y);

  const cropW = Math.max(1, maxX - minX);
  const cropH = Math.max(1, maxY - minY);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext('2d');
  ctx.drawImage(sourceCanvasOrImage, minX, minY, cropW, cropH, 0, 0, outW, outH);
  return outCanvas;
}

/**
 * Universal perspective warp wrapper with automatic fallback.
 */
export function applyPerspectiveWarp(cv, sourceCanvasOrImage, corners, preset = 'auto') {
  if (cv && cv.Mat && cv.getPerspectiveTransform && cv.warpPerspective) {
    try {
      return warpPerspectiveOpenCV(cv, sourceCanvasOrImage, corners, preset);
    } catch (err) {
      console.warn('OpenCV perspective warp failed, trying pure JS homography:', err);
    }
  }

  // Use high-precision pure JS Homography
  return warpPerspectiveCanvas2D(sourceCanvasOrImage, corners, preset);
}
