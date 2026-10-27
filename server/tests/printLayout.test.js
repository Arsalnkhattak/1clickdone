import test from 'node:test';
import assert from 'node:assert';

const MM_TO_PT = 72 / 25.4;

const PAPER_SIZES_MM = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};

function getSheetDimensionsMm(settings) {
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

  let isLandscape = orientation === 'landscape';
  if (orientation === 'auto') {
    isLandscape = contentAspectRatio > 1.1;
  }

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

function calculate1UpPlacement(sheetDimsMm, contentW, contentH, marginMm = 10) {
  const { widthMm, heightMm } = sheetDimsMm;

  const availableWidth = Math.max(10, widthMm - marginMm * 2);
  const availableHeight = Math.max(10, heightMm - marginMm * 2);

  const scale = Math.min(availableWidth / contentW, availableHeight / contentH);
  const scaledW = contentW * scale;
  const scaledH = contentH * scale;

  const x = (widthMm - scaledW) / 2;
  const y = (heightMm - scaledH) / 2;

  return {
    xMm: x,
    yMm: y,
    widthMm: scaledW,
    heightMm: scaledH,
  };
}

test('Print Layout - Standard paper dimensions', () => {
  const a4 = getSheetDimensionsMm({ paperSize: 'A4', orientation: 'portrait' });
  assert.strictEqual(a4.widthMm, 210);
  assert.strictEqual(a4.heightMm, 297);
  assert.strictEqual(a4.isLandscape, false);

  const a4Landscape = getSheetDimensionsMm({ paperSize: 'A4', orientation: 'landscape' });
  assert.strictEqual(a4Landscape.widthMm, 297);
  assert.strictEqual(a4Landscape.heightMm, 210);
  assert.strictEqual(a4Landscape.isLandscape, true);

  const custom = getSheetDimensionsMm({
    paperSize: 'custom',
    customWidthMm: 150,
    customHeightMm: 200,
    orientation: 'portrait',
  });
  assert.strictEqual(custom.widthMm, 150);
  assert.strictEqual(custom.heightMm, 200);
});

test('Print Layout - Auto orientation adapts to content aspect ratio', () => {
  // Wide document (CNIC front or horizontal certificate)
  const wideDoc = getSheetDimensionsMm({
    paperSize: 'A4',
    orientation: 'auto',
    contentAspectRatio: 1.58, // CNIC aspect ratio
  });
  assert.strictEqual(wideDoc.isLandscape, true);

  // Tall document (A4 application / letter)
  const tallDoc = getSheetDimensionsMm({
    paperSize: 'A4',
    orientation: 'auto',
    contentAspectRatio: 0.707,
  });
  assert.strictEqual(tallDoc.isLandscape, false);
});

test('Print Layout - 1-Up placement preserves aspect ratio and centers document', () => {
  const sheet = { widthMm: 210, heightMm: 297 };
  const contentW = 1000;
  const contentH = 2000; // 1:2 aspect ratio
  const margin = 10;

  const placement = calculate1UpPlacement(sheet, contentW, contentH, margin);

  // Available height is 297 - 20 = 277mm
  // Scaled height should fit within 277mm
  assert.ok(placement.heightMm <= 277);
  // Aspect ratio must be exactly 1:2
  const ratio = placement.widthMm / placement.heightMm;
  assert.ok(Math.abs(ratio - 0.5) < 0.001, `Ratio mismatch: ${ratio}`);

  // Document must be centered horizontally
  assert.strictEqual(
    Math.round((sheet.widthMm - placement.widthMm) / 2),
    Math.round(placement.xMm)
  );

  // Document margins must not violate 10mm minimum
  assert.ok(placement.xMm >= margin - 0.01);
  assert.ok(placement.yMm >= margin - 0.01);
});
