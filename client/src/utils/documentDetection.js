/**
 * Universal Document Boundary Detection Pipeline using OpenCV.js
 * Works on any document type (ID cards, A4 pages, receipts, notes, certificates)
 * taken at various angles and lighting conditions.
 */

const MAX_PROCESSING_DIMENSION = 900; // Resize working copy for snappy client-side edge detection

/**
 * Calculates Euclidean distance between two points.
 */
export function pointDistance(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Calculates the angle at vertex B formed by points A-B-C in degrees.
 */
function angleBetweenPoints(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (magAB === 0 || magCB === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

/**
 * Sorts four points into canonical clockwise order: [Top-Left, Top-Right, Bottom-Right, Bottom-Left].
 */
export function sortCorners(pts) {
  if (!pts || pts.length !== 4) return pts;

  // Compute centroid
  const center = {
    x: pts.reduce((sum, p) => sum + p.x, 0) / 4,
    y: pts.reduce((sum, p) => sum + p.y, 0) / 4,
  };

  // Assign corners based on quadrant relative to center
  const tl = pts.find((p) => p.x < center.x && p.y < center.y);
  const tr = pts.find((p) => p.x >= center.x && p.y < center.y);
  const br = pts.find((p) => p.x >= center.x && p.y >= center.y);
  const bl = pts.find((p) => p.x < center.x && p.y >= center.y);

  if (tl && tr && br && bl) {
    return [tl, tr, br, bl];
  }

  // Fallback sorting: polar angle from centroid
  const sorted = [...pts]
    .map((p) => ({ ...p, angle: Math.atan2(p.y - center.y, p.x - center.x) }))
    .sort((a, b) => a.angle - b.angle);

  // Rotate array until Top-Left is at index 0
  let tlIndex = 0;
  let minSum = Infinity;
  sorted.forEach((p, idx) => {
    const sum = p.x + p.y;
    if (sum < minSum) {
      minSum = sum;
      tlIndex = idx;
    }
  });

  const reordered = [];
  for (let i = 0; i < 4; i++) {
    const { angle, ...rest } = sorted[(tlIndex + i) % 4];
    reordered.push(rest);
  }
  return reordered;
}

/**
 * Returns default inset corners (e.g. 5% margins from image boundary).
 */
export function getDefaultCorners(width, height, insetPercent = 0.05) {
  const dx = Math.round(width * insetPercent);
  const dy = Math.round(height * insetPercent);

  return [
    { x: dx, y: dy },
    { x: width - dx, y: dy },
    { x: width - dx, y: height - dy },
    { x: dx, y: height - dy },
  ];
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

/**
 * Universal document detection pipeline on an HTMLImageElement or HTMLCanvasElement.
 * Returns {
 *   corners: [{x, y}, ... 4 pts in original image coordinates],
 *   confidence: 'high' | 'medium' | 'low' | 'manual',
 *   areaRatio: number,
 *   detected: boolean
 * }
 */
export function detectDocumentCorners(cv, sourceImage) {
  const origWidth = sourceImage.naturalWidth || sourceImage.width;
  const origHeight = sourceImage.naturalHeight || sourceImage.height;

  if (!cv || !cv.Mat || !origWidth || !origHeight) {
    return {
      corners: getDefaultCorners(origWidth || 800, origHeight || 600),
      confidence: 'manual',
      areaRatio: 0,
      detected: false,
    };
  }

  // Scale down for fast processing
  const scale = Math.min(
    1,
    MAX_PROCESSING_DIMENSION / Math.max(origWidth, origHeight)
  );
  const procW = Math.round(origWidth * scale);
  const procH = Math.round(origHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = procW;
  canvas.height = procH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceImage, 0, 0, procW, procH);

  let src = null;
  let gray = null;
  let blurred = null;
  let edges = null;
  let kernel = null;
  let contours = null;
  let hierarchy = null;

  try {
    src = safeImread(cv, canvas);
    gray = new cv.Mat();
    blurred = new cv.Mat();
    edges = new cv.Mat();
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();

    // 1. Convert to Grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 2. Denoise with Gaussian Blur
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // 3. Multi-threshold edge detection
    // Try standard Canny first
    cv.Canny(blurred, edges, 50, 150);

    // 4. Morphological dilation to bridge small gaps in document outlines
    kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel);

    // 5. Find contours
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    );

    const totalImgArea = procW * procH;
    const candidates = [];

    // Evaluate candidate contours
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);

      // Discard small noise (must cover at least 10% of frame)
      if (area < totalImgArea * 0.1) {
        cnt.delete();
        continue;
      }

      const peri = cv.arcLength(cnt, true);

      // Try multiple approximation epsilons to find quad
      const epsilons = [0.02, 0.03, 0.015, 0.04];
      let foundQuad = null;

      for (const eps of epsilons) {
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, eps * peri, true);

        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          const pts = [];
          for (let j = 0; j < 4; j++) {
            pts.push({
              x: approx.data32S[j * 2],
              y: approx.data32S[j * 2 + 1],
            });
          }

          // Check quadrilateral interior angles (should be roughly perpendicular, 50° to 130°)
          const sorted = sortCorners(pts);
          const [tl, tr, br, bl] = sorted;
          const a1 = angleBetweenPoints(bl, tl, tr);
          const a2 = angleBetweenPoints(tl, tr, br);
          const a3 = angleBetweenPoints(tr, br, bl);
          const a4 = angleBetweenPoints(br, bl, tl);

          const anglesSensible = [a1, a2, a3, a4].every(
            (ang) => ang >= 45 && ang <= 135
          );

          if (anglesSensible) {
            foundQuad = sorted;
            approx.delete();
            break;
          }
        }
        approx.delete();
      }

      if (foundQuad) {
        candidates.push({
          corners: foundQuad,
          area,
          areaRatio: area / totalImgArea,
        });
      }

      cnt.delete();
    }

    // Pick candidate with largest valid document area
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.area - a.area);
      const best = candidates[0];

      // Scale corners back to original image dimensions
      const originalCorners = best.corners.map((p) => ({
        x: Math.round(p.x / scale),
        y: Math.round(p.y / scale),
      }));

      const confidence =
        best.areaRatio >= 0.25 ? 'high' : 'medium';

      return {
        corners: originalCorners,
        confidence,
        areaRatio: best.areaRatio,
        detected: true,
      };
    }

    // Fallback: no quad contour found with high confidence
    return {
      corners: getDefaultCorners(origWidth, origHeight, 0.04),
      confidence: 'low',
      areaRatio: 0.92,
      detected: false,
    };
  } catch (err) {
    console.warn('Document detection encountered error, falling back:', err);
    return {
      corners: getDefaultCorners(origWidth, origHeight, 0.04),
      confidence: 'manual',
      areaRatio: 0.92,
      detected: false,
    };
  } finally {
    // Safely free all OpenCV matrices
    if (src) src.delete();
    if (gray) gray.delete();
    if (blurred) blurred.delete();
    if (edges) edges.delete();
    if (kernel) kernel.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }
}
