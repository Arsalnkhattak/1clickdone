/**
 * Print Layout Engine for Universal Document Scanner.
 * Defines standard paper dimensions, conversions (mm to points to pixels),
 * and layout calculations for 1-up and 2-up sheet printing.
 */

// 1 inch = 25.4 mm = 72 PostScript points = 96 screen CSS pixels at 96 DPI
export const MM_TO_PT = 72 / 25.4; // ~2.83465
export const PT_TO_MM = 25.4 / 72; // ~0.35278
export const MM_TO_PX = 96 / 25.4; // ~3.77953

export const PAPER_SIZES_MM = {
  A4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
  A3: { width: 297, height: 420, label: 'A3 (297 × 420 mm)' },
  A5: { width: 148, height: 210, label: 'A5 (148 × 210 mm)' },
  Letter: { width: 215.9, height: 279.4, label: 'Letter (8.5 × 11 in)' },
  Legal: { width: 215.9, height: 355.6, label: 'Legal (8.5 × 14 in)' },
};

export const MARGIN_PRESETS_MM = [
  { value: 0, label: 'Borderless (0 mm)' },
  { value: 5, label: 'Narrow (5 mm)' },
  { value: 10, label: 'Standard (10 mm) — Recommended' },
  { value: 15, label: 'Moderate (15 mm)' },
  { value: 20, label: 'Wide (20 mm)' },
];

/**
 * Returns the effective sheet dimensions in millimeters based on paper size, custom sizes, and orientation.
 */
export function getSheetDimensionsMm(settings) {
  const {
    paperSize = 'A4',
    orientation = 'auto',
    customWidthMm = 210,
    customHeightMm = 297,
    contentAspectRatio = 1,
  } = settings;

  let widthMm = 210;
  let heightMm = 297;

  if (paperSize === 'custom') {
    widthMm = Math.max(20, Number(customWidthMm) || 210);
    heightMm = Math.max(20, Number(customHeightMm) || 297);
  } else if (PAPER_SIZES_MM[paperSize]) {
    widthMm = PAPER_SIZES_MM[paperSize].width;
    heightMm = PAPER_SIZES_MM[paperSize].height;
  }

  // Determine effective orientation
  let isLandscape = orientation === 'landscape';
  if (orientation === 'auto') {
    // If content is wider than tall, default sheet to landscape
    isLandscape = contentAspectRatio > 1.1;
  }

  // Ensure width <= height for portrait, width >= height for landscape
  if (isLandscape && widthMm < heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm];
  } else if (!isLandscape && widthMm > heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm];
  }

  return {
    widthMm,
    heightMm,
    isLandscape,
    widthPt: widthMm * MM_TO_PT,
    heightPt: heightMm * MM_TO_PT,
  };
}

/**
 * Calculates placement of 1 document on 1 sheet (1-up layout).
 * Respects margins, preserves aspect ratio, centers on sheet.
 */
export function calculate1UpPlacement(sheetDimsMm, contentW, contentH, marginMm = 10) {
  const { widthMm, heightMm } = sheetDimsMm;

  const availableWidth = Math.max(10, widthMm - marginMm * 2);
  const availableHeight = Math.max(10, heightMm - marginMm * 2);

  const scale = Math.min(availableWidth / contentW, availableHeight / contentH);
  const scaledW = contentW * scale;
  const scaledH = contentH * scale;

  // Center horizontally and vertically within page
  const x = (widthMm - scaledW) / 2;
  const y = (heightMm - scaledH) / 2;

  return {
    xMm: x,
    yMm: y,
    widthMm: scaledW,
    heightMm: scaledH,
    xPt: x * MM_TO_PT,
    yPt: y * MM_TO_PT,
    widthPt: scaledW * MM_TO_PT,
    heightPt: scaledH * MM_TO_PT,
  };
}

/**
 * Calculates placement of 2 documents on 1 sheet (2-up layout).
 * In portrait: stacked vertically (top & bottom halves).
 * In landscape: placed side-by-side (left & right halves).
 */
export function calculate2UpPlacement(
  sheetDimsMm,
  items, // array of 1 or 2 items with { width, height }
  marginMm = 10,
  spacingMm = 5
) {
  const { widthMm, heightMm, isLandscape } = sheetDimsMm;
  const results = [];

  if (isLandscape) {
    // Side by side: 2 columns
    const colWidth = (widthMm - marginMm * 2 - spacingMm) / 2;
    const colHeight = heightMm - marginMm * 2;

    items.slice(0, 2).forEach((item, idx) => {
      const scale = Math.min(colWidth / item.width, colHeight / item.height);
      const sw = item.width * scale;
      const sh = item.height * scale;

      const colLeft = marginMm + idx * (colWidth + spacingMm);
      const x = colLeft + (colWidth - sw) / 2;
      const y = marginMm + (colHeight - sh) / 2;

      results.push({
        xMm: x,
        yMm: y,
        widthMm: sw,
        heightMm: sh,
        xPt: x * MM_TO_PT,
        yPt: y * MM_TO_PT,
        widthPt: sw * MM_TO_PT,
        heightPt: sh * MM_TO_PT,
      });
    });
  } else {
    // Stacked: 2 rows
    const rowWidth = widthMm - marginMm * 2;
    const rowHeight = (heightMm - marginMm * 2 - spacingMm) / 2;

    items.slice(0, 2).forEach((item, idx) => {
      const scale = Math.min(rowWidth / item.width, rowHeight / item.height);
      const sw = item.width * scale;
      const sh = item.height * scale;

      const rowTop = marginMm + idx * (rowHeight + spacingMm);
      const x = marginMm + (rowWidth - sw) / 2;
      const y = rowTop + (rowHeight - sh) / 2;

      results.push({
        xMm: x,
        yMm: y,
        widthMm: sw,
        heightMm: sh,
        xPt: x * MM_TO_PT,
        yPt: y * MM_TO_PT,
        widthPt: sw * MM_TO_PT,
        heightPt: sh * MM_TO_PT,
      });
    });
  }

  return results;
}
