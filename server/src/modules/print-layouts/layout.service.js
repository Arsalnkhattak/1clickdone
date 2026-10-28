import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PDFDocument, rgb } from 'pdf-lib';
import sharp from 'sharp';
import AppError from '../../utils/AppError.js';

const execFileAsync = promisify(execFile);

const uploadDir = path.resolve(process.cwd(), 'uploads');

// Conversion factors to PDF points (72 points = 1 inch)
// 1 inch = 25.4 mm => 72 / 25.4 = 2.83464567 points per mm
const MM_TO_PT = 72 / 25.4;
const CM_TO_PT = 72 / 2.54;
const INCH_TO_PT = 72;

export const convertToPoints = (value, unit = 'mm') => {
  const num = parseFloat(value) || 0;
  switch (unit.toLowerCase()) {
    case 'mm':
      return num * MM_TO_PT;
    case 'cm':
      return num * CM_TO_PT;
    case 'in':
    case 'inch':
    case 'inches':
      return num * INCH_TO_PT;
    case 'pt':
    case 'point':
    default:
      return num;
  }
};

export const PAPER_SIZES_PT = {
  A4: [595.28, 841.89], // 210 x 297 mm
  A5: [419.53, 595.28], // 148 x 210 mm
  Letter: [612.0, 792.0], // 8.5 x 11 in
  Photo4x6: [288.0, 432.0], // 4 x 6 in
  Legal: [612.0, 1008.0], // 8.5 x 14 in
};

/**
 * Calculates optimal grid layout for placing items of given width/height
 * on a specified page with margins and spacing.
 */
export const calculateGrid = ({
  pageWidth,
  pageHeight,
  itemWidth,
  itemHeight,
  margin = 20,
  spacing = 10,
}) => {
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const cols = Math.max(1, Math.floor((printableWidth + spacing) / (itemWidth + spacing)));
  const rows = Math.max(1, Math.floor((printableHeight + spacing) / (itemHeight + spacing)));
  const perPage = cols * rows;

  // Center the grid within the printable area
  const totalGridWidth = cols * itemWidth + (cols - 1) * spacing;
  const totalGridHeight = rows * itemHeight + (rows - 1) * spacing;

  const startX = margin + (printableWidth - totalGridWidth) / 2;
  const startY = margin + (printableHeight - totalGridHeight) / 2;

  return { cols, rows, perPage, startX, startY };
};

/**
 * Universal Custom Print Layout Engine
 */
export const generateCustomLayout = async ({
  storageKey,
  itemWidthMm = 50,
  itemHeightMm = 50,
  quantity = 1,
  paperSize = 'A4',
  orientation = 'portrait',
  marginMm = 10,
  spacingMm = 5,
  showCutMarks = true,
  outputName = 'custom-layout.pdf',
}) => {
  const filePath = path.join(uploadDir, storageKey);
  if (!fs.existsSync(filePath)) {
    throw new AppError('Input image not found', 404);
  }

  // Pre-process image with sharp to high-quality JPEG
  const imageBuffer = await sharp(filePath)
    .jpeg({ quality: 95 })
    .toBuffer();

  const pdfDoc = await PDFDocument.create();
  const embeddedImage = await pdfDoc.embedJpg(imageBuffer);

  let [pageW, pageH] = PAPER_SIZES_PT[paperSize] || PAPER_SIZES_PT.A4;
  if (orientation === 'landscape') {
    [pageW, pageH] = [pageH, pageW];
  }

  const itemW = convertToPoints(itemWidthMm, 'mm');
  const itemH = convertToPoints(itemHeightMm, 'mm');
  const marginPt = convertToPoints(marginMm, 'mm');
  const spacingPt = convertToPoints(spacingMm, 'mm');

  const grid = calculateGrid({
    pageWidth: pageW,
    pageHeight: pageH,
    itemWidth: itemW,
    itemHeight: itemH,
    margin: marginPt,
    spacing: spacingPt,
  });

  const totalCopies = parseInt(quantity, 10) || 1;
  const totalPages = Math.ceil(totalCopies / grid.perPage);

  let remaining = totalCopies;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pdfDoc.addPage([pageW, pageH]);
    const copiesThisPage = Math.min(remaining, grid.perPage);

    for (let i = 0; i < copiesThisPage; i++) {
      const col = i % grid.cols;
      const row = Math.floor(i / grid.cols);

      const x = grid.startX + col * (itemW + spacingPt);
      // In PDF coordinates, (0,0) is bottom-left
      const y = pageH - (grid.startY + (row + 1) * itemH + row * spacingPt);

      // Draw item
      page.drawImage(embeddedImage, {
        x,
        y,
        width: itemW,
        height: itemH,
      });

      // Draw optional cut guide borders
      if (showCutMarks) {
        page.drawRectangle({
          x,
          y,
          width: itemW,
          height: itemH,
          borderColor: rgb(0.75, 0.75, 0.75),
          borderWidth: 0.5,
        });
      }
    }

    remaining -= copiesThisPage;
  }

  const pdfBytes = await pdfDoc.save();
  const outFilename = `custom-${Date.now()}-${outputName}`;
  const outPath = path.join(uploadDir, outFilename);
  fs.writeFileSync(outPath, pdfBytes);

  return {
    filename: outFilename,
    originalName: outputName,
    size: pdfBytes.length,
    mimeType: 'application/pdf',
    copiesCount: totalCopies,
    pagesCount: totalPages,
  };
};

/**
 * Passport Photo Studio Layout Engine
 * Standard Passport sizes:
 * - 35 x 45 mm (Standard PK / UK / EU / Schengen)
 * - 51 x 51 mm (2 x 2 inches - US / India Visa)
 * - 33 x 48 mm (China Visa)
 */
export const generatePassportLayout = async ({
  storageKey,
  photoSize = '35x45', // '35x45', '2x2in', '33x48', 'custom'
  customWidthMm,
  customHeightMm,
  quantity = 8,
  paperSize = 'A4',
  showCutMarks = true,
  outputName = 'passport-photos.pdf',
}) => {
  let widthMm = 35;
  let heightMm = 45;

  if (photoSize === '2x2in') {
    widthMm = 50.8;
    heightMm = 50.8;
  } else if (photoSize === '33x48') {
    widthMm = 33;
    heightMm = 48;
  } else if (photoSize === 'custom' && customWidthMm && customHeightMm) {
    widthMm = parseFloat(customWidthMm);
    heightMm = parseFloat(customHeightMm);
  }

  return generateCustomLayout({
    storageKey,
    itemWidthMm: widthMm,
    itemHeightMm: heightMm,
    quantity,
    paperSize,
    orientation: 'portrait',
    marginMm: 12,
    spacingMm: 4,
    showCutMarks,
    outputName,
  });
};

/**
 * Portrait Photo Studio Layout Engine
 * Optimized for single portrait photo printing (4x6 / 102x152mm standard, 5x7, A5, etc.)
 * Positions the photo at the top of an A4 sheet (saving the bottom paper) or on direct 4x6 paper.
 * Supports:
 * - fitMode: 'cover' (fills 4x6 frame, edge-to-edge) or 'contain' (entire photo with white margins)
 * - rotation: 0, 90, 180, 270 deg
 * - positionOnPage: 'top' (starts at top margin) or 'center'
 */
export const generatePortraitPhotoLayout = async ({
  storageKey,
  photoSize = '4x6',
  customWidthMm,
  customHeightMm,
  fitMode = 'cover',
  positionOnPage = 'top',
  paperSize = 'A4',
  rotation = 0,
  showCutMarks = true,
  outputName = 'Portrait_Photo_Print.pdf',
}) => {
  const filePath = path.join(uploadDir, storageKey);
  if (!fs.existsSync(filePath)) {
    throw new AppError('Photo image not found', 404);
  }

  // 1. Determine physical dimensions in mm
  let widthMm = 102;
  let heightMm = 152;
  if (photoSize === '4x6') {
    widthMm = 102;
    heightMm = 152;
  } else if (photoSize === '5x7') {
    widthMm = 127;
    heightMm = 178;
  } else if (photoSize === 'a4') {
    widthMm = 210;
    heightMm = 297;
  } else if (photoSize === 'a5') {
    widthMm = 148;
    heightMm = 210;
  } else if (photoSize === 'wallet') {
    widthMm = 64;
    heightMm = 89;
  } else if (photoSize === 'custom' && customWidthMm && customHeightMm) {
    widthMm = parseFloat(customWidthMm);
    heightMm = parseFloat(customHeightMm);
  }

  // 2. High-res rasterization with Sharp (300 DPI for crisp photo lab quality)
  const pxWidth = Math.max(10, Math.round(widthMm * (300 / 25.4)));
  const pxHeight = Math.max(10, Math.round(heightMm * (300 / 25.4)));

  let pipeline = sharp(filePath);
  const rot = parseInt(rotation, 10) || 0;
  if (rot && rot % 360 !== 0) {
    pipeline = pipeline.rotate(rot);
  }

  // Apply Cover vs Contain
  if (fitMode === 'contain') {
    pipeline = pipeline.resize(pxWidth, pxHeight, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });
  } else {
    // Default 'cover'
    pipeline = pipeline.resize(pxWidth, pxHeight, {
      fit: 'cover',
      position: 'centre',
    });
  }

  const processedBuffer = await pipeline.jpeg({ quality: 98 }).toBuffer();

  const pdfDoc = await PDFDocument.create();
  const embeddedImg = await pdfDoc.embedJpg(processedBuffer);

  // 3. Page dimensions
  let [pageW, pageH] = PAPER_SIZES_PT[paperSize] || PAPER_SIZES_PT.A4;
  if (paperSize === 'Photo4x6') {
    pageW = convertToPoints(102, 'mm');
    pageH = convertToPoints(152, 'mm');
  }

  const itemW = convertToPoints(widthMm, 'mm');
  const itemH = convertToPoints(heightMm, 'mm');

  // 4. Position on paper
  let x = Math.max(0, (pageW - itemW) / 2);
  let y;

  if (paperSize === 'Photo4x6' || photoSize === 'a4') {
    x = 0;
    y = 0;
  } else if (positionOnPage === 'top') {
    // Placed at top margin (8mm) so shopkeepers can cut photo and save the rest of the sheet
    const topMarginPt = convertToPoints(8, 'mm');
    y = pageH - topMarginPt - itemH;
  } else {
    // Center of page
    y = (pageH - itemH) / 2;
  }

  const page = pdfDoc.addPage([pageW, pageH]);

  // Draw image
  page.drawImage(embeddedImg, {
    x,
    y,
    width: itemW,
    height: itemH,
  });

  // Draw optional faint cutting guides around the photo
  if (showCutMarks && paperSize !== 'Photo4x6' && photoSize !== 'a4') {
    page.drawRectangle({
      x,
      y,
      width: itemW,
      height: itemH,
      borderColor: rgb(0.65, 0.65, 0.65),
      borderWidth: 0.5,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outFilename = `portrait-${Date.now()}-${outputName}`;
  const outPath = path.join(uploadDir, outFilename);
  fs.writeFileSync(outPath, pdfBytes);

  return {
    filename: outFilename,
    originalName: outputName,
    size: pdfBytes.length,
    mimeType: 'application/pdf',
    copiesCount: 1,
    pagesCount: 1,
    dimensions: {
      widthMm,
      heightMm,
      fitMode,
      positionOnPage,
      paperSize,
    },
  };
};

/**
 * CNIC (National ID Card) Layout Engine
 * Standard ID-1 dimensions: 85.60 × 53.98 mm (Standard Pakistani CNIC / Smart Card)
 *
 * Layout:
 * - Starts from top of page with 5 mm padding (never vertically centered).
 * - Each row has 2 slots: Left (Column 0) and Right (Column 1).
 * - Even quantities (2, 4, 6, 8, 10...):
 *     1-page PDF. Each row has [Front on Left | Back on Right].
 *     User prints front of sheet, flips paper horizontally, and prints the same PDF on back.
 *     Each row yields 2 complete double-sided copies.
 * - Odd quantities (1, 3, 5, 7, 9...):
 *     2-page PDF.
 *     Full rows (0 to Math.floor(Q/2) - 1): [Front on Left | Back on Right] on BOTH pages.
 *     Last row (the odd copy):
 *       Page 1: [Front on Left | empty on Right]
 *       Page 2: [empty on Left | Back on Right]
 *     When printed double-sided (long-edge horizontal flip):
 *       Page 1 Left (Front) aligns with Page 2 Right (Back) yielding 1 complete copy.
 */
export const generateCnicLayout = async ({
  frontStorageKey,
  backStorageKey,
  quantity = 1,
  paperSize = 'A4',
  showCutMarks = true,
  outputName = 'cnic-print.pdf',
}) => {
  const frontPath = path.join(uploadDir, frontStorageKey);
  const backPath = path.join(uploadDir, backStorageKey);

  if (!fs.existsSync(frontPath) || !fs.existsSync(backPath)) {
    throw new AppError('CNIC Front or Back image not found', 404);
  }

  // Pre-process images to high-quality JPEG
  const [frontBuffer, backBuffer] = await Promise.all([
    sharp(frontPath).jpeg({ quality: 95 }).toBuffer(),
    sharp(backPath).jpeg({ quality: 95 }).toBuffer(),
  ]);

  const pdfDoc = await PDFDocument.create();
  const [frontImg, backImg] = await Promise.all([
    pdfDoc.embedJpg(frontBuffer),
    pdfDoc.embedJpg(backBuffer),
  ]);

  const [pageW, pageH] = PAPER_SIZES_PT[paperSize] || PAPER_SIZES_PT.A4;

  // Standard CNIC ID-1 card dimensions: 85.6 mm × 54 mm
  const cardW = convertToPoints(85.6, 'mm');
  const cardH = convertToPoints(54.0, 'mm');

  // Gaps: horizontal between Left & Right cards, vertical between rows
  const hGap = convertToPoints(5, 'mm');
  const vGap = convertToPoints(5, 'mm');

  // Top padding: exactly 5mm from the top of the page (no more than 5mm padding)
  const marginTop = convertToPoints(5, 'mm');

  // Total pair width
  const pairW = cardW * 2 + hGap;

  // Center the pair horizontally so Left and Right are equidistant from paper edges
  // Left card edge to paper left = Right card edge to paper right = (pageW - pairW) / 2
  // When paper is flipped horizontally (long edge), Left slot aligns perfectly with Right slot!
  const startX = Math.max(0, (pageW - pairW) / 2);
  const leftCardX = startX;
  const rightCardX = startX + cardW + hGap;

  const totalCopies = Math.max(1, parseInt(quantity, 10) || 1);
  const isOdd = totalCopies % 2 !== 0;

  // Number of 2-copy full rows
  const fullRows = Math.floor(totalCopies / 2);
  // Total rows on the sheet (odd copy occupies its own row)
  const totalRows = isOdd ? fullRows + 1 : fullRows;

  // Max rows that physically fit per page starting at 5mm from top
  const maxRowsPerPage = Math.max(1, Math.floor((pageH - marginTop + vGap) / (cardH + vGap)));

  const drawCard = (page, img, x, y) => {
    page.drawImage(img, {
      x,
      y,
      width: cardW,
      height: cardH,
    });
    if (showCutMarks) {
      page.drawRectangle({
        x,
        y,
        width: cardW,
        height: cardH,
        borderColor: rgb(0.75, 0.75, 0.75),
        borderWidth: 0.5,
      });
    }
  };

  const drawRowCutLine = (page, y) => {
    if (showCutMarks) {
      page.drawLine({
        start: { x: 10, y },
        end: { x: pageW - 10, y },
        color: rgb(0.85, 0.85, 0.85),
        thickness: 0.4,
        dashArray: [4, 4],
        dashPhase: 0,
      });
    }
  };

  let pagesCount = 0;

  if (!isOdd) {
    // EVEN COPIES (2, 4, 6, 8, 10...): 1-page PDF (or pages per sheet capacity)
    // Both sides of paper print this identical layout
    const totalPages = Math.ceil(totalRows / maxRowsPerPage);
    let rowsRemaining = totalRows;

    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const page = pdfDoc.addPage([pageW, pageH]);
      const rowsThisPage = Math.min(rowsRemaining, maxRowsPerPage);

      for (let r = 0; r < rowsThisPage; r++) {
        // Starts directly from top of page with 5 mm padding
        const cardBottomY = pageH - marginTop - (r + 1) * cardH - r * vGap;

        // Front on Left, Back on Right
        drawCard(page, frontImg, leftCardX, cardBottomY);
        drawCard(page, backImg, rightCardX, cardBottomY);

        if (r < rowsThisPage - 1) {
          drawRowCutLine(page, cardBottomY - vGap / 2);
        }
      }
      rowsRemaining -= rowsThisPage;
    }
    pagesCount = totalPages;
  } else {
    // ODD COPIES (1, 3, 5, 7, 9...): 2-Page PDF
    // Page 1:
    //   - Rows 0 .. fullRows-1: [Front on Left | Back on Right]
    //   - Row fullRows (last row): [Front on Left | empty]
    // Page 2:
    //   - Rows 0 .. fullRows-1: [Front on Left | Back on Right]
    //   - Row fullRows (last row): [empty | Back on Right]
    const page1 = pdfDoc.addPage([pageW, pageH]);
    const page2 = pdfDoc.addPage([pageW, pageH]);

    for (let r = 0; r < totalRows; r++) {
      // Starts directly from top of page with 5 mm padding
      const cardBottomY = pageH - marginTop - (r + 1) * cardH - r * vGap;
      const isLastRow = r === totalRows - 1;

      if (!isLastRow) {
        // Full pair row on both pages
        drawCard(page1, frontImg, leftCardX, cardBottomY);
        drawCard(page1, backImg, rightCardX, cardBottomY);

        drawCard(page2, frontImg, leftCardX, cardBottomY);
        drawCard(page2, backImg, rightCardX, cardBottomY);
      } else {
        // Odd copy row:
        // Page 1: Front on Left, Right empty
        drawCard(page1, frontImg, leftCardX, cardBottomY);

        // Page 2: Left empty, Back on Right
        drawCard(page2, backImg, rightCardX, cardBottomY);
      }

      if (r < totalRows - 1) {
        const midY = cardBottomY - vGap / 2;
        drawRowCutLine(page1, midY);
        drawRowCutLine(page2, midY);
      }
    }
    pagesCount = 2;
  }

  const pdfBytes = await pdfDoc.save();
  const outFilename = `cnic-${Date.now()}-${outputName}`;
  const outPath = path.join(uploadDir, outFilename);
  fs.writeFileSync(outPath, pdfBytes);

  return {
    filename: outFilename,
    originalName: outputName,
    size: pdfBytes.length,
    mimeType: 'application/pdf',
    copiesCount: totalCopies,
    pagesCount,
    rowsCount: totalRows,
    isOdd,
  };
};

/**
 * Universal Image Processing: Crop, Rotate, Flip, Brightness, Contrast
 */
export const processImage = async ({
  storageKey,
  crop, // { left, top, width, height }
  cropPercentage, // { top, bottom, left, right } in %
  rotate = 0,
  flipHorizontal = false,
  flipVertical = false,
  brightness = 1, // 1 is default
  contrast = 1, // 1 is default
  outputFormat = 'jpeg',
}) => {
  const filePath = path.join(uploadDir, storageKey);
  if (!fs.existsSync(filePath)) {
    throw new AppError('Source image not found', 404);
  }

  let pipeline = sharp(filePath);

  // 1. Rotate (supports arbitrary float angles e.g. 1.4 or -3.5 or 90)
  const rotAngle = parseFloat(rotate) || 0;
  if (Math.abs(rotAngle) > 0.01) {
    pipeline = pipeline.rotate(rotAngle, { background: '#ffffff' });
  }

  // 2. Flip
  if (flipHorizontal) {
    pipeline = pipeline.flop();
  }
  if (flipVertical) {
    pipeline = pipeline.flip();
  }

  // 3. Crop
  if (
    cropPercentage &&
    (cropPercentage.top > 0 ||
      cropPercentage.bottom > 0 ||
      cropPercentage.left > 0 ||
      cropPercentage.right > 0)
  ) {
    const rotatedBuf = await pipeline.toBuffer();
    const rotatedMeta = await sharp(rotatedBuf).metadata();
    const rW = rotatedMeta.width;
    const rH = rotatedMeta.height;

    const left = Math.round((cropPercentage.left / 100) * rW);
    const top = Math.round((cropPercentage.top / 100) * rH);
    const right = Math.round((cropPercentage.right / 100) * rW);
    const bottom = Math.round((cropPercentage.bottom / 100) * rH);

    const width = Math.max(10, rW - left - right);
    const height = Math.max(10, rH - top - bottom);

    pipeline = sharp(rotatedBuf).extract({ left, top, width, height });
  } else if (crop && crop.width && crop.height) {
    pipeline = pipeline.extract({
      left: Math.max(0, Math.round(crop.left)),
      top: Math.max(0, Math.round(crop.top)),
      width: Math.round(crop.width),
      height: Math.round(crop.height),
    });
  }

  // 4. Brightness & Contrast adjustments
  if (brightness !== 1 || contrast !== 1) {
    pipeline = pipeline.modulate({
      brightness: parseFloat(brightness) || 1,
    });
  }

  const outFilename = `edited-${Date.now()}.${outputFormat === 'png' ? 'png' : 'jpg'}`;
  const outPath = path.join(uploadDir, outFilename);

  if (outputFormat === 'png') {
    await pipeline.png().toFile(outPath);
  } else {
    await pipeline.jpeg({ quality: 95 }).toFile(outPath);
  }

  const stats = fs.statSync(outPath);

  return {
    filename: outFilename,
    storageKey: outFilename,
    originalName: outFilename,
    size: stats.size,
    mimeType: outputFormat === 'png' ? 'image/png' : 'image/jpeg',
  };
};

/**
 * Detect the tilt angle of a card inside an image.
 * Returns the recommended straightening angle (in degrees) to level the card.
 */
export const detectCardAngle = async ({ storageKey }) => {
  const filePath = path.join(uploadDir, storageKey);
  if (!fs.existsSync(filePath)) {
    throw new AppError('Source image not found', 404);
  }

  const meta = await sharp(filePath).metadata();
  const W = 320;
  const H = Math.round(meta.height * (W / meta.width));
  const gray = await sharp(filePath).resize(W, H).grayscale().raw().toBuffer();

  const points = [];
  const startX = Math.round(W * 0.20);
  const endX = Math.round(W * 0.80);

  // Search top edge gradients
  for (let x = startX; x < endX; x += 3) {
    let maxGrad = 0;
    let bestY = -1;
    for (let y = Math.round(H * 0.12); y < Math.round(H * 0.80); y++) {
      const grad = gray[y * W + x] - gray[(y - 3) * W + x];
      if (grad > 30 && grad > maxGrad) {
        maxGrad = grad;
        bestY = y;
      }
    }
    if (bestY > 0) {
      points.push({ x, y: bestY });
    }
  }

  if (points.length < 8) {
    for (let x = startX; x < endX; x += 3) {
      let maxGrad = 0;
      let bestY = -1;
      for (let y = Math.round(H * 0.80); y > Math.round(H * 0.20); y--) {
        const grad = gray[(y - 3) * W + x] - gray[y * W + x];
        if (grad > 30 && grad > maxGrad) {
          maxGrad = grad;
          bestY = y;
        }
      }
      if (bestY > 0) {
        points.push({ x, y: bestY });
      }
    }
  }

  let angleDeg = 0;
  if (points.length >= 6) {
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) > 1e-5) {
      const slope = (n * sumXY - sumX * sumY) / denom;
      const rawAngle = Math.atan(slope) * (180 / Math.PI);
      if (Math.abs(rawAngle) < 35) {
        angleDeg = Math.round(-rawAngle * 10) / 10;
      }
    }
  }

  return { angle: angleDeg };
};

/**
 * Auto-detect and crop a CNIC card from a mobile phone photo or raw picture.
 * Removes surrounding backgrounds (laptop keyboard, table, desk, bedsheet, etc.).
 * Specifically rejects keyboard keys and seeks the green/white CNIC card.
 * If the card was photographed in portrait orientation, auto-rotates it to landscape.
 */
export const detectAndCropCnic = async ({ storageKey, enhance = true }) => {
  const filePath = path.join(uploadDir, storageKey);
  if (!fs.existsSync(filePath)) {
    throw new AppError('Source image not found', 404);
  }

  // 1. Detect tilt angle and straighten card if tilted
  let deskewAngle = 0;
  let workingBuffer;
  try {
    const { angle: tiltAngle } = await detectCardAngle({ storageKey });
    if (Math.abs(tiltAngle) >= 0.4 && Math.abs(tiltAngle) <= 30) {
      workingBuffer = await sharp(filePath)
        .rotate(tiltAngle, { background: '#ffffff' })
        .toBuffer();
      deskewAngle = tiltAngle;
    } else {
      workingBuffer = await sharp(filePath).toBuffer();
    }
  } catch {
    workingBuffer = await sharp(filePath).toBuffer();
  }

  const origMeta = await sharp(workingBuffer).metadata();
  const origW = origMeta.width;
  const origH = origMeta.height;

  // Analysis scale (resample to fast 280px width)
  const targetW = 280;
  const scale = origW / targetW;
  const targetH = Math.round(origH / scale);

  const rgb = await sharp(workingBuffer)
    .resize(targetW, targetH)
    .raw()
    .toBuffer();

  const gray = await sharp(workingBuffer)
    .resize(targetW, targetH)
    .grayscale()
    .raw()
    .toBuffer();

  // 1. Gradients
  const gx = new Float32Array(targetW * targetH);
  const gy = new Float32Array(targetW * targetH);
  for (let y = 1; y < targetH - 1; y++) {
    for (let x = 1; x < targetW - 1; x++) {
      const idx = y * targetW + x;
      gx[idx] = Math.abs(
        -gray[(y - 1) * targetW + (x - 1)] + gray[(y - 1) * targetW + (x + 1)] +
        -2 * gray[y * targetW + (x - 1)] + 2 * gray[y * targetW + (x + 1)] +
        -gray[(y + 1) * targetW + (x - 1)] + gray[(y + 1) * targetW + (x + 1)]
      );
      gy[idx] = Math.abs(
        -gray[(y - 1) * targetW + (x - 1)] - 2 * gray[(y - 1) * targetW + x] - gray[(y - 1) * targetW + (x + 1)] +
        gray[(y + 1) * targetW + (x - 1)] + 2 * gray[(y + 1) * targetW + x] + gray[(y + 1) * targetW + (x + 1)]
      );
    }
  }

  // 2. Integral images for O(1) query
  // keyIntegral marks black keyboard keys / dark clutter (r<55, g<55, b<55)
  // greenIntegral marks green security tint of the CNIC card
  const keyIntegral = new Int32Array((targetW + 1) * (targetH + 1));
  const greenIntegral = new Int32Array((targetW + 1) * (targetH + 1));

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = y * targetW + x;
      const r = rgb[idx * 3];
      const g = rgb[idx * 3 + 1];
      const b = rgb[idx * 3 + 2];

      const isBlackKey = (r < 55 && g < 55 && b < 55) ? 1 : 0;
      const isCardGreen = (g > b + 5 && g > r - 12 && g > 60) ? 1 : 0;

      const offset = (y + 1) * (targetW + 1) + (x + 1);
      keyIntegral[offset] =
        isBlackKey + keyIntegral[y * (targetW + 1) + (x + 1)] + keyIntegral[(y + 1) * (targetW + 1) + x] - keyIntegral[y * (targetW + 1) + x];

      greenIntegral[offset] =
        isCardGreen + greenIntegral[y * (targetW + 1) + (x + 1)] + greenIntegral[(y + 1) * (targetW + 1) + x] - greenIntegral[y * (targetW + 1) + x];
    }
  }

  function getSum(integral, x, y, w, h) {
    const x2 = x + w;
    const y2 = y + h;
    return (
      integral[y2 * (targetW + 1) + x2] -
      integral[y * (targetW + 1) + x2] -
      integral[y2 * (targetW + 1) + x] +
      integral[y * (targetW + 1) + x]
    );
  }

  let bestScore = -1;
  let bestBox = null;

  // Search card heights
  const minH = Math.round(targetH * 0.18);
  const maxH = Math.round(targetH * 0.55);

  // Search landscape aspect ratios (standard CNIC is 85.6/54 = 1.585)
  for (let h = minH; h <= maxH; h += 2) {
    for (const ar of [1.50, 1.55, 1.585, 1.62, 1.66]) {
      const w = Math.round(h * ar);
      if (w >= targetW - 6) continue;

      for (let y = 6; y <= targetH - h - 6; y += 2) {
        for (let x = 6; x <= targetW - w - 6; x += 2) {
          // Reject boxes that contain keyboard keys
          const darkCount = getSum(keyIntegral, x, y, w, h);
          if (darkCount / (w * h) > 0.035) continue;

          // Reject empty palmrest / trackpad (CNIC must contain green security tint)
          const greenCount = getSum(greenIntegral, x, y, w, h);
          const greenRatio = greenCount / (w * h);
          if (greenRatio < 0.015) continue;

          // Border edge strength
          let topE = 0, botE = 0, leftE = 0, rightE = 0;
          for (let xi = x; xi < x + w; xi++) {
            topE += gy[y * targetW + xi];
            botE += gy[(y + h) * targetW + xi];
          }
          for (let yi = y; yi < y + h; yi++) {
            leftE += gx[yi * targetW + x];
            rightE += gx[yi * targetW + (x + w)];
          }

          const perimeter = (topE / w + botE / w + leftE / h + rightE / h) / 4;
          const score = perimeter * (1 + greenRatio * 3.5) * Math.sqrt(w * h);

          if (score > bestScore) {
            bestScore = score;
            bestBox = { x, y, w, h, score, isPortrait: false };
          }
        }
      }
    }
  }

  // If landscape didn't find a confident box, check vertical/portrait orientation
  if (!bestBox || bestScore < 100) {
    for (let h = minH; h <= maxH; h += 3) {
      for (const ar of [0.58, 0.63, 0.68]) {
        const w = Math.round(h * ar);
        if (w >= targetW - 6) continue;

        for (let y = 6; y <= targetH - h - 6; y += 3) {
          for (let x = 6; x <= targetW - w - 6; x += 3) {
            const darkCount = getSum(keyIntegral, x, y, w, h);
            if (darkCount / (w * h) > 0.035) continue;

            const greenCount = getSum(greenIntegral, x, y, w, h);
            const greenRatio = greenCount / (w * h);
            if (greenRatio < 0.015) continue;

            let topE = 0, botE = 0, leftE = 0, rightE = 0;
            for (let xi = x; xi < x + w; xi++) {
              topE += gy[y * targetW + xi];
              botE += gy[(y + h) * targetW + xi];
            }
            for (let yi = y; yi < y + h; yi++) {
              leftE += gx[yi * targetW + x];
              rightE += gx[yi * targetW + (x + w)];
            }

            const perimeter = (topE / w + botE / w + leftE / h + rightE / h) / 4;
            const score = perimeter * (1 + greenRatio * 3.5) * Math.sqrt(w * h);

            if (score > bestScore) {
              bestScore = score;
              bestBox = { x, y, w, h, score, isPortrait: true };
            }
          }
        }
      }
    }
  }

  // Fallback to centered box if no card detected
  let cropLeft, cropTop, cropW, cropH;
  if (!bestBox || bestScore < 50) {
    const defaultH = Math.round(origH * 0.40);
    const defaultW = Math.round(defaultH * 1.585);
    cropLeft = Math.max(0, Math.round((origW - defaultW) / 2));
    cropTop = Math.max(0, Math.round((origH - defaultH) / 2));
    cropW = Math.min(origW - cropLeft, defaultW);
    cropH = Math.min(origH - cropTop, defaultH);
  } else {
    // Add 1.5% safety padding
    const padX = Math.round(bestBox.w * scale * 0.015);
    const padY = Math.round(bestBox.h * scale * 0.015);

    cropLeft = Math.max(0, Math.round(bestBox.x * scale) - padX);
    cropTop = Math.max(0, Math.round(bestBox.y * scale) - padY);
    cropW = Math.min(origW - cropLeft, Math.round(bestBox.w * scale) + padX * 2);
    cropH = Math.min(origH - cropTop, Math.round(bestBox.h * scale) + padY * 2);
  }

  let pipeline = sharp(workingBuffer).extract({
    left: cropLeft,
    top: cropTop,
    width: cropW,
    height: cropH,
  });

  // Only rotate if the extracted card itself is in portrait (taller than wide)
  let wasRotated = false;
  if (cropW < cropH) {
    pipeline = pipeline.rotate(90);
    wasRotated = true;
  }

  if (enhance) {
    pipeline = pipeline
      .normalize()
      .sharpen({ sigma: 1, m1: 0.5, m2: 2 });
  }

  const outFilename = `scanned-${Date.now()}-${path.basename(storageKey)}`;
  const outPath = path.join(uploadDir, outFilename);
  await pipeline.jpeg({ quality: 95 }).toFile(outPath);

  const stats = fs.statSync(outPath);
  const newMeta = await sharp(outPath).metadata();

  return {
    filename: outFilename,
    storageKey: outFilename,
    originalName: `Scanned_${path.basename(storageKey)}`,
    size: stats.size,
    mimeType: 'image/jpeg',
    width: newMeta.width,
    height: newMeta.height,
    cropBox: { left: cropLeft, top: cropTop, width: cropW, height: cropH },
    wasRotated,
    deskewAngle,
  };
};

/**
 * Replace background color of a portrait photo with studio solid colors (White, Blue, Grey, Black, etc.)
 */
export const changeImageBackground = async ({ storageKey, backgroundColor = '#FFFFFF' }) => {
  const inputPath = path.join(uploadDir, storageKey);
  if (!fs.existsSync(inputPath)) {
    throw new AppError('Source image not found', 404);
  }

  const outFilename = `bg-${Date.now()}-${path.basename(storageKey, path.extname(storageKey))}.jpg`;
  const outputPath = path.join(uploadDir, outFilename);
  const scriptPath = path.resolve(process.cwd(), 'src/scripts/change_bg.py');

  try {
    await execFileAsync('python', [scriptPath, inputPath, outputPath, backgroundColor], {
      timeout: 60000,
    });
  } catch (err) {
    throw new AppError(`Failed to replace background: ${err.message}`, 500);
  }

  if (!fs.existsSync(outputPath)) {
    throw new AppError('Background replacement output file not created', 500);
  }

  const stats = fs.statSync(outputPath);
  const meta = await sharp(outputPath).metadata();

  return {
    filename: outFilename,
    storageKey: outFilename,
    originalName: `StudioBG_${path.basename(storageKey)}`,
    size: stats.size,
    mimeType: 'image/jpeg',
    width: meta.width,
    height: meta.height,
    backgroundColor,
  };
};
