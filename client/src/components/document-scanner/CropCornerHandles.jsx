import React from 'react';

export const HANDLE_RADIUS = 12;

export const CORNER_LABELS = ['TL ↖', 'TR ↗', 'BR ↘', 'BL ↙'];

/**
 * Draws the quadrilateral polygon, corner border, darkened overlay, and handles on a 2D canvas context.
 */
export function renderCropOverlay(ctx, canvasWidth, canvasHeight, corners, activeIndex = -1) {
  if (!corners || corners.length !== 4) return;

  // 1. Draw darkened overlay outside the quad
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)'; // Slate 900 with 65% opacity
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Cut out the selected quad
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Draw quadrilateral outline
  ctx.save();
  ctx.strokeStyle = '#2563eb'; // Blue 600
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.stroke();

  // Draw 3x3 rule of thirds grid inside quad for alignment
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Interpolated grid lines
  for (let step = 1; step <= 2; step++) {
    const t = step / 3;
    // Horizontal grid line
    const leftX = corners[0].x + (corners[3].x - corners[0].x) * t;
    const leftY = corners[0].y + (corners[3].y - corners[0].y) * t;
    const rightX = corners[1].x + (corners[2].x - corners[1].x) * t;
    const rightY = corners[1].y + (corners[2].y - corners[1].y) * t;

    ctx.beginPath();
    ctx.moveTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.stroke();

    // Vertical grid line
    const topX = corners[0].x + (corners[1].x - corners[0].x) * t;
    const topY = corners[0].y + (corners[1].y - corners[0].y) * t;
    const botX = corners[3].x + (corners[2].x - corners[3].x) * t;
    const botY = corners[3].y + (corners[2].y - corners[3].y) * t;

    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(botX, botY);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Draw draggable corner handles
  corners.forEach((p, i) => {
    const isActive = activeIndex === i;

    ctx.save();
    // Outer glow for active handle
    if (isActive) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, HANDLE_RADIUS + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.35)';
      ctx.fill();
    }

    // Handle circle
    ctx.beginPath();
    ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#1d4ed8' : '#ffffff';
    ctx.fill();

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? '#ffffff' : '#2563eb';
    ctx.fill();

    // Corner badge label
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelOffsets = [
      { x: -14, y: -14 },
      { x: 14, y: -14 },
      { x: 14, y: 14 },
      { x: -14, y: 14 },
    ];
    const off = labelOffsets[i] || { x: 0, y: -14 };

    // Small pill background for label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(p.x + off.x - 10, p.y + off.y - 7, 20, 14);
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x + off.x - 10, p.y + off.y - 7, 20, 14);

    ctx.fillStyle = '#1e40af';
    ctx.fillText(['TL', 'TR', 'BR', 'BL'][i], p.x + off.x, p.y + off.y);

    ctx.restore();
  });
}
