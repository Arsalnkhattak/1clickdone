/**
 * Perspective Transformation Engine for Universal Document Scanner.
 * Corrects camera tilt, skewed perspective, and crops documents into rectangular outputs.
 */

import { pointDistance } from './documentDetection';

/**
 * Computes natural output dimensions from 4 quadrilateral corners:
 * [Top-Left, Top-Right, Bottom-Right, Bottom-Left].
 */
export function computeOutputDimensions(corners) {
  const [tl, tr, br, bl] = corners;

  // Width: maximum of top and bottom edges
  const widthTop = pointDistance(tl, tr);
  const widthBottom = pointDistance(bl, br);
  const outWidth = Math.round(Math.max(widthTop, widthBottom));

  // Height: maximum of left and right edges
  const heightLeft = pointDistance(tl, bl);
  const heightRight = pointDistance(tr, br);
  const outHeight = Math.round(Math.max(heightLeft, heightRight));

  return {
    width: Math.max(10, outWidth),
    height: Math.max(10, outHeight),
    aspectRatio: outWidth / outHeight,
  };
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
export function warpPerspectiveOpenCV(cv, sourceCanvasOrImage, corners, targetDimensions = null) {
  const [tl, tr, br, bl] = corners;
  const dims = targetDimensions || computeOutputDimensions(corners);
  const { width: outW, height: outH } = dims;

  // Ensure source is in a canvas
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
 * Fallback Canvas-based bounding box crop when OpenCV is not available.
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
export function applyPerspectiveWarp(cv, sourceCanvasOrImage, corners, targetDimensions = null) {
  if (cv && cv.Mat && cv.getPerspectiveTransform && cv.warpPerspective) {
    try {
      return warpPerspectiveOpenCV(cv, sourceCanvasOrImage, corners, targetDimensions);
    } catch (err) {
      console.warn('OpenCV perspective warp failed, falling back to canvas crop:', err);
    }
  }
  return warpPerspectiveCanvasFallback(sourceCanvasOrImage, corners);
}
