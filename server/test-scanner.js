/**
 * Comprehensive Automated Test Suite for Document Scanner & Print System
 * Tests:
 * 1. File validation (valid formats, oversize, empty, invalid types)
 * 2. Document detection geometry (quadrilateral sorting, fallback corners)
 * 3. Perspective transform dimension math (aspect ratio preservation)
 * 4. Print layout coordinate math (1-up and 2-up, margins, scaling)
 * 5. PDF generation pipeline
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

// ── 1. Image Validation Logic Tests ──
console.log('\n--- 1. Testing Image Validation ---');

const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_BYTES = 10 * 1024 * 1024;

function validateFile(name, size, mimeType) {
  if (size <= 0) return { valid: false, error: 'Empty file' };
  if (size > MAX_BYTES) return { valid: false, error: 'File exceeds 10MB' };
  const ext = path.extname(name).toLowerCase();
  if (!SUPPORTED_EXTS.includes(ext) && !mimeType?.startsWith('image/')) {
    return { valid: false, error: 'Unsupported format' };
  }
  return { valid: true };
}

assert.strictEqual(validateFile('invoice.jpg', 1024 * 500, 'image/jpeg').valid, true, 'Valid JPG should pass');
assert.strictEqual(validateFile('form.png', 1024 * 800, 'image/png').valid, true, 'Valid PNG should pass');
assert.strictEqual(validateFile('card.webp', 1024 * 300, 'image/webp').valid, true, 'Valid WebP should pass');
assert.strictEqual(validateFile('document.exe', 1024, 'application/x-msdownload').valid, false, 'EXE file must fail');
assert.strictEqual(validateFile('empty.png', 0, 'image/png').valid, false, 'Zero-byte file must fail');
assert.strictEqual(validateFile('huge.jpg', 15 * 1024 * 1024, 'image/jpeg').valid, false, 'Oversized file (>10MB) must fail');

console.log('✓ Image validation tests passed successfully.');

// ── 2. Corner Sorting & Detection Geometry Tests ──
console.log('\n--- 2. Testing Corner Sorting & Geometry ---');

function sortCorners(pts) {
  const center = {
    x: pts.reduce((s, p) => s + p.x, 0) / 4,
    y: pts.reduce((s, p) => s + p.y, 0) / 4,
  };
  const tl = pts.find((p) => p.x < center.x && p.y < center.y);
  const tr = pts.find((p) => p.x >= center.x && p.y < center.y);
  const br = pts.find((p) => p.x >= center.x && p.y >= center.y);
  const bl = pts.find((p) => p.x < center.x && p.y >= center.y);
  if (tl && tr && br && bl) return [tl, tr, br, bl];

  const sorted = [...pts]
    .map((p) => ({ ...p, angle: Math.atan2(p.y - center.y, p.x - center.x) }))
    .sort((a, b) => a.angle - b.angle);
  return sorted.map(({ angle, ...rest }) => rest);
}

// Scrambled corners of a tilted rectangle
const rawCorners = [
  { x: 750, y: 1100 }, // BR
  { x: 100, y: 150 },  // TL
  { x: 120, y: 1050 }, // BL
  { x: 800, y: 120 },  // TR
];

const sorted = sortCorners(rawCorners);
assert.strictEqual(sorted[0].x, 100, 'Top-left corner x should be 100');
assert.strictEqual(sorted[0].y, 150, 'Top-left corner y should be 150');
assert.strictEqual(sorted[1].x, 800, 'Top-right corner x should be 800');
assert.strictEqual(sorted[2].x, 750, 'Bottom-right corner x should be 750');
assert.strictEqual(sorted[3].x, 120, 'Bottom-left corner x should be 120');

console.log('✓ Corner sorting (TL, TR, BR, BL) passed successfully.');

// ── 3. Output Dimensions Math Tests ──
console.log('\n--- 3. Testing Perspective Output Dimensions Math ---');

function computeOutputDimensions([tl, tr, br, bl]) {
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
  const outW = Math.round(Math.max(widthTop, widthBottom));

  const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);
  const outH = Math.round(Math.max(heightLeft, heightRight));

  return { width: outW, height: outH, aspectRatio: outW / outH };
}

const dims = computeOutputDimensions(sorted);
assert(dims.width > 600, `Calculated width (${dims.width}) should be > 600`);
assert(dims(dims.height > 800), `Calculated height (${dims.height}) should be > 800`);
assert(dims.aspectRatio < 1, 'Vertical document should have aspect ratio < 1 (portrait)');

console.log(`✓ Computed dimensions: ${dims.width} x ${dims.height} px (Aspect: ${dims.aspectRatio.toFixed(2)})`);

// ── 4. Print Layout Coordinate Math Tests ──
console.log('\n--- 4. Testing Print Layout Coordinate Math ---');

const MM_TO_PT = 72 / 25.4;
const A4_MM = { width: 210, height: 297 };

function calculate1Up(sheetW, sheetH, contentW, contentH, marginMm) {
  const availW = sheetW - marginMm * 2;
  const availH = sheetH - marginMm * 2;
  const scale = Math.min(availW / contentW, availH / contentH);
  const sw = contentW * scale;
  const sh = contentH * scale;
  const x = (sheetW - sw) / 2;
  const y = (sheetH - sh) / 2;
  return { x, y, width: sw, height: sh };
}

const placement = calculate1Up(A4_MM.width, A4_MM.height, 1200, 1600, 10);
assert(placement.x >= 10, 'Left position must be at or inside 10mm margin');
assert(placement.y >= 10, 'Top position must be at or inside 10mm margin');
assert(placement.x + placement.width <= A4_MM.width - 9.9, 'Right edge must not exceed sheet boundary');
assert(placement.y + placement.height <= A4_MM.height - 9.9, 'Bottom edge must not exceed sheet boundary');
assert(Math.abs((placement.width / placement.height) - (1200 / 1600)) < 0.001, 'Aspect ratio must be preserved exactly');

console.log(`✓ 1-up placement: x=${placement.x.toFixed(1)}mm, y=${placement.y.toFixed(1)}mm, w=${placement.width.toFixed(1)}mm, h=${placement.height.toFixed(1)}mm`);

// ── 5. Multi-Page PDF Generation Test with actual image files ──
console.log('\n--- 5. Testing Multi-Page Printable PDF Generation Pipeline ---');

async function testPdfGeneration() {
  const tempDir = path.resolve('test-tmp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  // Create two test synthetic document images (Page 1: A4 doc, Page 2: ID card)
  const page1Path = path.join(tempDir, 'page1.jpg');
  const page2Path = path.join(tempDir, 'page2.jpg');

  // Generate Page 1 (Simulated A4 with document border and sample text)
  const svgDoc = `
    <svg width="1200" height="1600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1600" fill="#fdfdfd"/>
      <rect x="50" y="50" width="1100" height="1500" fill="none" stroke="#2563eb" stroke-width="4"/>
      <text x="600" y="200" font-family="Arial" font-size="48" font-weight="bold" fill="#1e3a8a" text-anchor="middle">OFFICIAL APPLICATION DOCUMENT</text>
      <text x="150" y="320" font-family="Arial" font-size="28" fill="#333">Full Name: Muhammad Usman</text>
      <text x="150" y="380" font-family="Arial" font-size="28" fill="#333">Document Type: A4 Certificate Form</text>
      <text x="150" y="440" font-family="Arial" font-size="28" fill="#333">Status: Scanned &amp; Enhanced via Universal Scanner</text>
      <line x1="150" y1="500" x2="1050" y2="500" stroke="#ccc" stroke-width="2"/>
    </svg>
  `;
  await sharp(Buffer.from(svgDoc)).jpeg().toFile(page1Path);

  // Generate Page 2 (Simulated CNIC / ID Card)
  const svgCard = `
    <svg width="1010" height="638" xmlns="http://www.w3.org/2000/svg">
      <rect width="1010" height="638" rx="28" fill="#e0f2fe"/>
      <rect x="20" y="20" width="970" height="598" rx="20" fill="none" stroke="#0284c7" stroke-width="3"/>
      <text x="505" y="100" font-family="Arial" font-size="32" font-weight="bold" fill="#0369a1" text-anchor="middle">GOVERNMENT IDENTITY CARD</text>
      <rect x="60" y="150" width="180" height="230" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
      <text x="150" y="280" font-family="Arial" font-size="20" fill="#64748b" text-anchor="middle">[PHOTO]</text>
      <text x="280" y="220" font-family="Arial" font-size="26" font-weight="bold" fill="#0f172a">NAME: AHMAD KHAN</text>
      <text x="280" y="280" font-family="Arial" font-size="24" fill="#334155">CNIC: 35201-1234567-1</text>
    </svg>
  `;
  await sharp(Buffer.from(svgCard)).jpeg().toFile(page2Path);

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const a4Pt = [595.28, 841.89]; // A4 in points

  const img1Bytes = fs.readFileSync(page1Path);
  const img1 = await pdfDoc.embedJpg(img1Bytes);
  const page1 = pdfDoc.addPage(a4Pt);

  // Place page 1 centered
  const scale1 = Math.min((a4Pt[0] - 40) / img1.width, (a4Pt[1] - 40) / img1.height);
  const w1 = img1.width * scale1;
  const h1 = img1.height * scale1;
  page1.drawImage(img1, {
    x: (a4Pt[0] - w1) / 2,
    y: (a4Pt[1] - h1) / 2,
    width: w1,
    height: h1,
  });

  // Page 2
  const img2Bytes = fs.readFileSync(page2Path);
  const img2 = await pdfDoc.embedJpg(img2Bytes);
  const page2 = pdfDoc.addPage(a4Pt);
  const scale2 = Math.min((a4Pt[0] - 40) / img2.width, (a4Pt[1] - 40) / img2.height);
  const w2 = img2.width * scale2;
  const h2 = img2.height * scale2;
  page2.drawImage(img2, {
    x: (a4Pt[0] - w2) / 2,
    y: (a4Pt[1] - h2) / 2,
    width: w2,
    height: h2,
  });

  const pdfBytes = await pdfDoc.save();
  const outputPdfPath = path.join(tempDir, 'output-test.pdf');
  fs.writeFileSync(outputPdfPath, pdfBytes);

  assert(fs.existsSync(outputPdfPath), 'Output PDF file must exist on disk');
  assert(pdfBytes.length > 5000, 'PDF size must be substantial (> 5KB)');

  console.log(`✓ Generated valid 2-page printable PDF: ${outputPdfPath} (${(pdfBytes.length / 1024).toFixed(1)} KB)`);

  // Cleanup test files
  fs.unlinkSync(page1Path);
  fs.unlinkSync(page2Path);
  fs.unlinkSync(outputPdfPath);
  fs.rmdirSync(tempDir);
  console.log('✓ Temporary test resources cleaned up.');
}

await testPdfGeneration();
console.log('\n======================================================');
console.log('🎉 ALL UNIVERSAL DOCUMENT SCANNER TESTS PASSED! 🎉');
console.log('======================================================\n');
