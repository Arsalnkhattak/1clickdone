import React from 'react';

export const CORNER_HANDLE_RADIUS = 12;
export const EDGE_HANDLE_RADIUS = 9;

export const HANDLE_LABELS = [
  'TL ↖', 'TR ↗', 'BR ↘', 'BL ↙',
  'Top Edge ↕', 'Right Edge ↔', 'Bottom Edge ↕', 'Left Edge ↔'
];

/**
 * Calculates the 8 control points from 4 corners:
 * 0: TL, 1: TR, 2: BR, 3: BL (Corners)
 * 4: Top-Middle, 5: Right-Middle, 6: Bottom-Middle, 7: Left-Middle (Edge Handles)
 */
export function get8ControlPoints(corners) {
  if (!corners || corners.length !== 4) return [];

  const [c0, c1, c2, c3] = corners;

  const tm = { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
  const rm = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
  const bm = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 };
  const lm = { x: (c3.x + c0.x) / 2, y: (c3.y + c0.y) / 2 };

  return [c0, c1, c2, c3, tm, rm, bm, lm];
}

/**
 * Draws the quadrilateral polygon, 8 control handles (corners + edge midpoints),
 * darkened outer mask, and alignment grid on a 2D canvas context.
 */
export function renderCropOverlay(ctx, canvasWidth, canvasHeight, corners, activeIndex = -1) {
  if (!corners || corners.length !== 4) return;

  const pts = get8ControlPoints(corners);
  const [c0, c1, c2, c3] = corners;

  // 1. Draw darkened overlay outside the quad
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)'; // Slate 900
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Cut out the selected quad
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(c0.x, c0.y);
  ctx.lineTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c3.x, c3.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Draw quadrilateral outline (Emerald / Green border)
  ctx.save();
  ctx.strokeStyle = '#10b981'; // Emerald 500
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(c0.x, c0.y);
  ctx.lineTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c3.x, c3.y);
  ctx.closePath();
  ctx.stroke();

  // Draw rule of thirds grid inside quad for alignment
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let step = 1; step <= 2; step++) {
    const t = step / 3;
    // Horizontal grid line
    const leftX = c0.x + (c3.x - c0.x) * t;
    const leftY = c0.y + (c3.y - c0.y) * t;
    const rightX = c1.x + (c2.x - c1.x) * t;
    const rightY = c1.y + (c2.y - c1.y) * t;

    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();

    // Vertical grid line
    const topX = c0.x + (c1.x - c0.x) * t;
    const topY = c0.y + (c1.y - c0.y) * t;
    const botX = c3.x + (c2.x - c3.x) * t;
    const botY = c3.y + (c2.y - c3.y) * t;

    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(botX, botY);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Draw 4 Edge Midpoint Handles (Teal circles with dark outline)
  for (let i = 4; i < 8; i++) {
    const p = pts[i];
    const isActive = activeIndex === i;

    ctx.save();
    if (isActive) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, EDGE_HANDLE_RADIUS + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(45, 212, 191, 0.4)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, EDGE_HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#0d9488' : '#2dd4bf'; // Teal 400/600
    ctx.fill();

    ctx.strokeStyle = '#0f172a'; // Slate 900
    ctx.lineWidth = 2;
    ctx.stroke();

    // Small white center dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  // 4. Draw 4 Corner Handles (Emerald Green circles with white ring & labels)
  for (let i = 0; i < 4; i++) {
    const p = pts[i];
    const isActive = activeIndex === i;

    ctx.save();
    // Outer glow for active handle
    if (isActive) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, CORNER_HANDLE_RADIUS + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.fill();
    }

    // Handle circle
    ctx.beginPath();
    ctx.arc(p.x, p.y, CORNER_HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#059669' : '#10b981'; // Emerald 500/600
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner white dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Corner badge label
    const labelOffsets = [
      { x: -16, y: -16 },
      { x: 16, y: -16 },
      { x: 16, y: 16 },
      { x: -16, y: 16 },
    ];
    const off = labelOffsets[i] || { x: 0, y: -16 };

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(p.x + off.x - 11, p.y + off.y - 8, 22, 16);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x + off.x - 11, p.y + off.y - 8, 22, 16);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(['TL', 'TR', 'BR', 'BL'][i], p.x + off.x, p.y + off.y);

    ctx.restore();
  }
}
