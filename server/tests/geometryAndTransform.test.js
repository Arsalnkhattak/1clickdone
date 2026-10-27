import test from 'node:test';
import assert from 'node:assert';

function pointDistance(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function sortCorners(pts) {
  if (!pts || pts.length !== 4) return pts;
  const center = {
    x: pts.reduce((sum, p) => sum + p.x, 0) / 4,
    y: pts.reduce((sum, p) => sum + p.y, 0) / 4,
  };

  const tl = pts.find((p) => p.x < center.x && p.y < center.y);
  const tr = pts.find((p) => p.x >= center.x && p.y < center.y);
  const br = pts.find((p) => p.x >= center.x && p.y >= center.y);
  const bl = pts.find((p) => p.x < center.x && p.y >= center.y);

  if (tl && tr && br && bl) {
    return [tl, tr, br, bl];
  }

  const sorted = [...pts]
    .map((p) => ({ ...p, angle: Math.atan2(p.y - center.y, p.x - center.x) }))
    .sort((a, b) => a.angle - b.angle);

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

function computeOutputDimensions(corners) {
  const [tl, tr, br, bl] = corners;
  const widthTop = pointDistance(tl, tr);
  const widthBottom = pointDistance(bl, br);
  const outWidth = Math.round(Math.max(widthTop, widthBottom));

  const heightLeft = pointDistance(tl, bl);
  const heightRight = pointDistance(tr, br);
  const outHeight = Math.round(Math.max(heightLeft, heightRight));

  return {
    width: Math.max(10, outWidth),
    height: Math.max(10, outHeight),
    aspectRatio: outWidth / outHeight,
  };
}

function getDefaultCorners(width, height, insetPercent = 0.05) {
  const dx = Math.round(width * insetPercent);
  const dy = Math.round(height * insetPercent);
  return [
    { x: dx, y: dy },
    { x: width - dx, y: dy },
    { x: width - dx, y: height - dy },
    { x: dx, y: height - dy },
  ];
}

test('Geometry - Distance calculation', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 300, y: 400 };
  assert.strictEqual(pointDistance(p1, p2), 500);
});

test('Geometry - Clockwise corner sorting', () => {
  // Input in scrambled order
  const scrambled = [
    { x: 800, y: 1000 }, // BR
    { x: 100, y: 100 },  // TL
    { x: 100, y: 1000 }, // BL
    { x: 800, y: 100 },  // TR
  ];

  const sorted = sortCorners(scrambled);
  assert.strictEqual(sorted[0].x, 100);
  assert.strictEqual(sorted[0].y, 100);  // TL
  assert.strictEqual(sorted[1].x, 800);
  assert.strictEqual(sorted[1].y, 100);  // TR
  assert.strictEqual(sorted[2].x, 800);
  assert.strictEqual(sorted[2].y, 1000); // BR
  assert.strictEqual(sorted[3].x, 100);
  assert.strictEqual(sorted[3].y, 1000); // BL
});

test('Geometry - Inset corners generation', () => {
  const corners = getDefaultCorners(1000, 2000, 0.05);
  assert.deepStrictEqual(corners[0], { x: 50, y: 100 });
  assert.deepStrictEqual(corners[1], { x: 950, y: 100 });
  assert.deepStrictEqual(corners[2], { x: 950, y: 1900 });
  assert.deepStrictEqual(corners[3], { x: 50, y: 1900 });
});

test('Geometry - Compute rectified dimensions for tilted A4 document', () => {
  // Tilted quadrilateral coordinates of an A4 page photographed at perspective
  const tiltedCorners = [
    { x: 150, y: 120 },  // TL
    { x: 850, y: 80 },   // TR (slight upward tilt)
    { x: 920, y: 1100 }, // BR (trapezoidal flare)
    { x: 110, y: 1050 }, // BL
  ];

  const dims = computeOutputDimensions(tiltedCorners);
  assert.ok(dims.width >= 700, `Expected width >= 700, got ${dims.width}`);
  assert.ok(dims.height >= 950, `Expected height >= 950, got ${dims.height}`);
  assert.ok(dims.aspectRatio < 1, 'Portrait document should have aspectRatio < 1');
});
