/**
 * sampleGenerators.js
 * Generates test images and calculates ground-truth corner coordinates.
 */

export function generateSampleProposal() {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 1500;
  const ctx = c.getContext('2d');

  // Patterned background surface
  ctx.fillStyle = '#1e2029';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#2d3245';
  ctx.lineWidth = 15;
  for (let i = -1000; i < 2500; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 1000, 1500);
    ctx.stroke();
  }

  // Tilted A4 Document Sheet
  const rad = -0.12;
  const cx = 600;
  const cy = 750;
  const docW = 750;
  const docH = 1050;
  const x = -docW / 2;
  const y = -docH / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;

  ctx.fillStyle = '#fbfcfd';
  ctx.fillRect(x, y, docW, docH);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Project Proposal & Agreement', 0, y + 90);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#059669';
  ctx.fillText('Smart Document Scanner & OCR Engine', 0, y + 130);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Automatic 8-Point Edge Detection & Perspective Rectification', 0, y + 160);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 50, y + 190);
  ctx.lineTo(x + docW - 50, y + 190);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = '14px sans-serif';
  const lines = [
    '1. EXECUTIVE SUMMARY:',
    'This document certifies the processing of scanned media using',
    'OpenCV WASM-based homography matrix and adaptive computer vision filters.',
    '',
    '2. KEY FEATURES & CAPABILITIES:',
    ' - 8-point vertex and midpoint drag handles for rapid repositioning.',
    ' - Real-time perspective correction and planar deskewing.',
    ' - Adaptive Gaussian B&W document thresholding.',
    ' - Full client-side Tesseract.js optical character recognition (OCR).',
    ' - Automated persistence to MongoDB with document gallery management.',
    '',
    '3. SIGNATURE & VERIFICATION:',
    'Verified by Computer Vision Engine | Date: ' + new Date().toLocaleDateString(),
  ];
  let curY = y + 230;
  lines.forEach((l) => {
    ctx.fillText(l, x + 50, curY);
    curY += 32;
  });

  ctx.restore();

  // Calculate actual rotated 4 corners
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cornersRel = [
    { x: -docW / 2, y: -docH / 2 },
    { x: docW / 2, y: -docH / 2 },
    { x: docW / 2, y: docH / 2 },
    { x: -docW / 2, y: docH / 2 },
  ];
  const corners = cornersRel.map((pt) => ({
    x: Math.round(cx + pt.x * cos - pt.y * sin),
    y: Math.round(cy + pt.x * sin + pt.y * cos),
  }));

  return {
    dataUrl: c.toDataURL('image/png'),
    corners,
    aspectPreset: 'a4',
  };
}

export function generateSampleCNIC() {
  const c = document.createElement('canvas');
  c.width = 1000;
  c.height = 700;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, c.width, c.height);

  const rad = -0.08;
  const cx = 500;
  const cy = 350;
  const cardW = 700;
  const cardH = 440;
  const x = -cardW / 2;
  const y = -cardH / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, 20);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = '#047857';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('IDENTITY CARD: 14201-1037793-3', x + 50, y + 60);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Name: MUHAMMAD BILAL KHAN', x + 50, y + 120);
  ctx.fillText('Father Name: TARIQ MEHMOOD', x + 50, y + 170);
  ctx.fillText('Gender: M | Country of Stay: Pakistan', x + 50, y + 220);
  ctx.fillText('Date of Birth: 14.08.1995', x + 50, y + 270);
  ctx.fillText('Date of Issue: 01.01.2020 | Date of Expiry: Lifetime', x + 50, y + 320);

  ctx.restore();

  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cornersRel = [
    { x: -cardW / 2, y: -cardH / 2 },
    { x: cardW / 2, y: -cardH / 2 },
    { x: cardW / 2, y: cardH / 2 },
    { x: -cardW / 2, y: cardH / 2 },
  ];
  const corners = cornersRel.map((pt) => ({
    x: Math.round(cx + pt.x * cos - pt.y * sin),
    y: Math.round(cy + pt.x * sin + pt.y * cos),
  }));

  return {
    dataUrl: c.toDataURL('image/png'),
    corners,
    aspectPreset: 'cnic',
  };
}
