/**
 * SmartScanner — Full CamScan Studio ported from scanner.html into React.
 *
 * Features (identical to the HTML reference):
 *  • Upload images (file picker + drag-drop) or capture from webcam
 *  • 8-point interactive crop: 4 corner handles + 4 edge-midpoint handles
 *  • Magnifying loupe while dragging
 *  • Format presets: Auto Free / A4 Document / CNIC Card / Receipt
 *  • Rotation: -90° / +90° + fine angle slider (−45° to +45°)
 *  • Auto deskew (geometry-based, no OpenCV needed)
 *  • Re-detect crop / Full Inset Box reset
 *  • Dual-view: original with handles on left, warped output on right
 *  • Filters: Magic Color / B&W Clean / Grayscale / Original
 *  • Export: Download scanned image as JPEG/PNG
 *  • Returns a File to parent via onScanned() callback
 *
 * Props:
 *   isOpen    — controls visibility when used as a modal
 *   onClose   — called when user cancels
 *   onScanned — called with File object when "Use This Scan" is clicked
 *   embedded  — if true, renders inline (no Modal wrapper)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  HiOutlineUpload, HiOutlineCamera, HiOutlineLightningBolt,
  HiOutlineRefresh, HiOutlineCheck, HiOutlineAdjustments,
  HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineX,
  HiOutlineDownload,
} from 'react-icons/hi';

// ─── Pure-JS homography (same Gaussian elimination as scanner.html) ──────────

function gaussianElimination(A, b) {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++)
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    if (Math.abs(M[i][i]) < 1e-10) return null;
    for (let k = i + 1; k < n; k++) {
      const c = -M[k][i] / M[i][i];
      for (let j = i; j <= n; j++)
        M[k][j] = i === j ? 0 : M[k][j] + c * M[i][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let k = i - 1; k >= 0; k--) M[k][n] -= M[k][i] * x[i];
  }
  return x;
}

function solveHomography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = [dst[i].x, dst[i].y];
    const [x, y] = [src[i].x, src[i].y];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  const h = gaussianElimination(A, b);
  if (!h) return null;
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1.0]];
}

// ─── 8 control points from corners (normalized 0-1) ──────────────────────────

function get8Points(corners, w, h) {
  const c = corners.map(p => ({ x: p.x * w, y: p.y * h }));
  return [
    c[0], c[1], c[2], c[3],                               // 4 corners
    { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 }, // top-mid
    { x: (c[1].x + c[2].x) / 2, y: (c[1].y + c[2].y) / 2 }, // right-mid
    { x: (c[2].x + c[3].x) / 2, y: (c[2].y + c[3].y) / 2 }, // bottom-mid
    { x: (c[3].x + c[0].x) / 2, y: (c[3].y + c[0].y) / 2 }, // left-mid
  ];
}

// ─── Build rotated canvas from raw image ─────────────────────────────────────

function buildRotatedCanvas(img, baseDeg, fineDeg) {
  const totalRad = ((baseDeg + fineDeg) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(totalRad));
  const sin = Math.abs(Math.sin(totalRad));
  const newW = Math.round(img.width * cos + img.height * sin);
  const newH = Math.round(img.width * sin + img.height * cos);
  const c = document.createElement('canvas');
  c.width = newW; c.height = newH;
  const ctx = c.getContext('2d');
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(totalRad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return c;
}

// ─── Warp + filter ───────────────────────────────────────────────────────────

function applyWarpAndFilter(rotCanvas, corners, preset, filter) {
  const W = rotCanvas.width, H = rotCanvas.height;
  const srcPts = corners.map(p => ({ x: p.x * W, y: p.y * H }));

  let targetW = Math.round(Math.max(
    Math.hypot(srcPts[1].x - srcPts[0].x, srcPts[1].y - srcPts[0].y),
    Math.hypot(srcPts[2].x - srcPts[3].x, srcPts[2].y - srcPts[3].y)
  ));
  let targetH = Math.round(Math.max(
    Math.hypot(srcPts[3].x - srcPts[0].x, srcPts[3].y - srcPts[0].y),
    Math.hypot(srcPts[2].x - srcPts[1].x, srcPts[2].y - srcPts[1].y)
  ));

  if (preset === 'a4') {
    if (targetW >= targetH) targetH = Math.round(targetW / 1.414);
    else targetW = Math.round(targetH / 1.414);
  } else if (preset === 'cnic') {
    if (targetW >= targetH) targetH = Math.round(targetW / 1.586);
    else targetW = Math.round(targetH / 1.586);
  }

  if (targetW < 10 || targetH < 10) return null;

  const dstPts = [
    { x: 0, y: 0 }, { x: targetW, y: 0 },
    { x: targetW, y: targetH }, { x: 0, y: targetH },
  ];

  const H3 = solveHomography(srcPts, dstPts);
  if (!H3) return null;

  const warpC = document.createElement('canvas');
  warpC.width = targetW; warpC.height = targetH;
  const warpCtx = warpC.getContext('2d');
  const srcData = rotCanvas.getContext('2d').getImageData(0, 0, W, H);
  const dstData = warpCtx.createImageData(targetW, targetH);
  const sD = srcData.data, dD = dstData.data;

  for (let v = 0; v < targetH; v++) {
    for (let u = 0; u < targetW; u++) {
      const den = H3[2][0] * u + H3[2][1] * v + H3[2][2];
      const sx  = (H3[0][0] * u + H3[0][1] * v + H3[0][2]) / den;
      const sy  = (H3[1][0] * u + H3[1][1] * v + H3[1][2]) / den;
      if (sx >= 0 && sx < W - 1 && sy >= 0 && sy < H - 1) {
        const x1 = Math.floor(sx), y1 = Math.floor(sy);
        const dx = sx - x1, dy = sy - y1;
        const i11 = (y1 * W + x1) * 4, i21 = (y1 * W + x1 + 1) * 4;
        const i12 = ((y1+1)*W + x1) * 4, i22 = ((y1+1)*W + x1 + 1) * 4;
        const di = (v * targetW + u) * 4;
        for (let c = 0; c < 3; c++) {
          dD[di+c] = (1-dx)*(1-dy)*sD[i11+c] + dx*(1-dy)*sD[i21+c]
                   + (1-dx)*dy*sD[i12+c]  + dx*dy*sD[i22+c];
        }
        dD[di+3] = 255;
      }
    }
  }
  warpCtx.putImageData(dstData, 0, 0);

  // Apply filter
  const fData = warpCtx.getImageData(0, 0, targetW, targetH);
  const fd = fData.data;
  for (let i = 0; i < fd.length; i += 4) {
    let r = fd[i], g = fd[i+1], b = fd[i+2];
    const lum = 0.299*r + 0.587*g + 0.114*b;
    if (filter === 'magic') {
      if (lum > 115) {
        r = Math.min(255, r * 1.25 + 10);
        g = Math.min(255, g * 1.25 + 10);
        b = Math.min(255, b * 1.25 + 10);
      } else {
        r = Math.max(0, r * 0.7);
        g = Math.max(0, g * 0.7);
        b = Math.max(0, b * 0.7);
      }
    } else if (filter === 'bw') {
      r = g = b = lum > 128 ? 255 : 0;
    } else if (filter === 'gray') {
      r = g = b = lum;
    }
    fd[i] = r; fd[i+1] = g; fd[i+2] = b;
  }
  warpCtx.putImageData(fData, 0, 0);
  return warpC;
}

// ─── Draw interactive overlay with 8 handles ─────────────────────────────────

function drawInteractive(canvas, rotCanvas, corners, isDragging, activeIdx) {
  if (!rotCanvas || !canvas) return;
  const W = rotCanvas.width, H = rotCanvas.height;
  const maxW = canvas.parentElement?.clientWidth || 600;
  const maxH = 400;
  const scale = Math.min(maxW / W, maxH / H, 1);
  canvas.width  = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const dW = canvas.width, dH = canvas.height;
  const ctx = canvas.getContext('2d');

  // Base image
  ctx.drawImage(rotCanvas, 0, 0, dW, dH);

  const pts = get8Points(corners, dW, dH);

  // Dark overlay
  ctx.fillStyle = 'rgba(15,23,42,0.45)';
  ctx.fillRect(0, 0, dW, dH);

  // Bright cutout inside quad
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(rotCanvas, 0, 0, dW, dH);
  ctx.restore();

  // Green border
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.stroke();

  // 4 corner handles (green)
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }

  // 4 edge midpoint handles (teal)
  for (let i = 4; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2dd4bf'; ctx.fill();
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();
  }

  // Magnifier loupe while dragging
  if (isDragging && activeIdx !== -1) {
    const tp = pts[activeIdx];
    const lr = 45, zoom = 2.2;
    let lx = tp.x, ly = tp.y - 65;
    if (ly < lr + 10) ly = tp.y + 65;

    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#000';
    ctx.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
    const sw = (lr * 2) / zoom, sh = (lr * 2) / zoom;
    const srcX = (tp.x / dW) * W - sw / 2;
    const srcY = (tp.y / dH) * H - sh / 2;
    ctx.drawImage(rotCanvas, srcX, srcY, sw, sh, lx - lr, ly - lr, lr * 2, lr * 2);
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx - 12, ly); ctx.lineTo(lx + 12, ly);
    ctx.moveTo(lx, ly - 12); ctx.lineTo(lx, ly + 12);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  }

  return scale;
}

// ─── Auto edge detection (improved — finds bright card on dark background) ────

function autoDetectCorners(canvas) {
  const W = canvas.width, H = canvas.height;
  // Work on small copy for speed
  const scale = Math.min(1, 600 / Math.max(W, H));
  const sw = Math.round(W * scale), sh = Math.round(H * scale);
  const small = document.createElement('canvas');
  small.width = sw; small.height = sh;
  small.getContext('2d').drawImage(canvas, 0, 0, sw, sh);
  const d = small.getContext('2d').getImageData(0, 0, sw, sh).data;

  // Build grayscale
  const gray = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++)
    gray[i] = Math.round(0.299*d[i*4] + 0.587*d[i*4+1] + 0.114*d[i*4+2]);

  // Otsu threshold to separate card from background
  const hist = new Int32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maxVar = 0, otsu = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) { maxVar = v; otsu = t; }
  }

  // Binary mask
  const mask = new Uint8Array(sw * sh);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] > otsu ? 1 : 0;

  // Morphological close (fill small holes) — simple box dilation then erosion
  const margin = Math.round(sw * 0.03);
  const kSize = 5;

  // Find connected bright region closest to center
  const cx = sw / 2, cy = sh / 2;
  // Scan outward from center to find a bright pixel, then flood-fill bounds
  let startX = -1, startY = -1;
  for (let r = 0; r < Math.max(sw, sh) / 2; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = Math.round(cx + dx), y = Math.round(cy + dy);
        if (x < 0 || x >= sw || y < 0 || y >= sh) continue;
        if (mask[y * sw + x]) { startX = x; startY = y; }
      }
      if (startX !== -1) break;
    }
    if (startX !== -1) break;
  }

  if (startX === -1) {
    // Fallback: use bounding box of all bright pixels
    let minX = sw, minY = sh, maxX = 0, maxY = 0;
    for (let y = margin; y < sh - margin; y++) {
      for (let x = margin; x < sw - margin; x++) {
        if (mask[y*sw+x]) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) {
      return [ {x:0.05,y:0.05},{x:0.95,y:0.05},{x:0.95,y:0.95},{x:0.05,y:0.95} ];
    }
    const inv = 1 / scale;
    return [
      { x: Math.max(0.01, (minX*inv)/W), y: Math.max(0.01, (minY*inv)/H) },
      { x: Math.min(0.99, (maxX*inv)/W), y: Math.max(0.01, (minY*inv)/H) },
      { x: Math.min(0.99, (maxX*inv)/W), y: Math.min(0.99, (maxY*inv)/H) },
      { x: Math.max(0.01, (minX*inv)/W), y: Math.min(0.99, (maxY*inv)/H) },
    ];
  }

  // BFS flood fill from startX,startY to get bounding box
  const visited = new Uint8Array(sw * sh);
  const queue = [startY * sw + startX];
  visited[startY * sw + startX] = 1;
  let minX = startX, minY = startY, maxX = startX, maxY = startY;
  while (queue.length) {
    const idx = queue.pop();
    const x = idx % sw, y = Math.floor(idx / sw);
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    const neighbors = [
      [x-1,y],[x+1,y],[x,y-1],[x,y+1],
      [x-1,y-1],[x+1,y-1],[x-1,y+1],[x+1,y+1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= sw || ny < 0 || ny >= sh) continue;
      const ni = ny * sw + nx;
      if (!visited[ni] && mask[ni]) {
        visited[ni] = 1;
        queue.push(ni);
      }
    }
  }

  // Add small padding
  const pad = Math.round(sw * 0.01);
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(sw - 1, maxX + pad); maxY = Math.min(sh - 1, maxY + pad);

  const inv = 1 / scale;
  return [
    { x: Math.max(0.01, (minX*inv)/W), y: Math.max(0.01, (minY*inv)/H) },
    { x: Math.min(0.99, (maxX*inv)/W), y: Math.max(0.01, (minY*inv)/H) },
    { x: Math.min(0.99, (maxX*inv)/W), y: Math.min(0.99, (maxY*inv)/H) },
    { x: Math.max(0.01, (minX*inv)/W), y: Math.min(0.99, (maxY*inv)/H) },
  ];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CORNERS = [
  { x: 0.08, y: 0.08 }, { x: 0.92, y: 0.08 },
  { x: 0.92, y: 0.92 }, { x: 0.08, y: 0.92 },
];

const PRESETS = [
  { id: 'auto',    label: 'Auto Free' },
  { id: 'a4',      label: 'A4 Document' },
  { id: 'cnic',    label: 'CNIC Card' },
  { id: 'receipt', label: 'Receipt' },
];

const FILTERS = [
  { id: 'magic',    label: '✨ Magic Color' },
  { id: 'bw',       label: '⬛ B&W Clean' },
  { id: 'gray',     label: '🩶 Grayscale' },
  { id: 'original', label: '🖼 Original' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SmartScanner({ isOpen, onClose, onScanned, embedded = false, lockedPreset = null }) {
  // Image state
  const [rawImage,     setRawImage]     = useState(null);  // HTMLImageElement
  const [rotCanvas,    setRotCanvas]    = useState(null);  // rotated canvas
  const [outputCanvas, setOutputCanvas] = useState(null);  // warped output canvas
  const [hasImage,     setHasImage]     = useState(false);

  // Controls
  const [corners,    setCorners]    = useState(DEFAULT_CORNERS);
  const [baseDeg,    setBaseDeg]    = useState(0);
  const [fineDeg,    setFineDeg]    = useState(0);
  const [preset,     setPreset]     = useState(lockedPreset || 'auto');
  const [filter,     setFilter]     = useState('magic');
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState(null);
  const [dragLabel,  setDragLabel]  = useState('Drag points to crop');

  // Refs
  const interactiveRef = useRef(null);
  const outputRef      = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const dragRef        = useRef({ active: false, idx: -1 });
  const dragStart      = useRef({ x: 0, y: 0 });
  const cornersOnDrag  = useRef(null);
  const scaleRef       = useRef(1);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setRawImage(null); setRotCanvas(null); setOutputCanvas(null);
    setHasImage(false); setCorners(DEFAULT_CORNERS);
    setBaseDeg(0); setFineDeg(0); setPreset('auto'); setFilter('magic');
    setError(null); setProcessing(false);
  }, []);

  useEffect(() => { if (!isOpen && !embedded) resetAll(); }, [isOpen]); // eslint-disable-line

  // ── Rebuild rotated canvas when rotation changes ──────────────────────────
  useEffect(() => {
    if (!rawImage) return;
    const c = buildRotatedCanvas(rawImage, baseDeg, fineDeg);
    setRotCanvas(c);
  }, [rawImage, baseDeg, fineDeg]);

  // ── Redraw interactive + output when anything changes ────────────────────
  useEffect(() => {
    if (!rotCanvas) return;
    const scale = drawInteractive(
      interactiveRef.current, rotCanvas, corners,
      dragRef.current.active, dragRef.current.idx
    );
    if (scale) scaleRef.current = scale;

    // Warp output in next frame
    requestAnimationFrame(() => {
      const out = applyWarpAndFilter(rotCanvas, corners, preset, filter);
      if (out) {
        setOutputCanvas(out);
        if (outputRef.current) {
          const ctx = outputRef.current.getContext('2d');
          outputRef.current.width  = out.width;
          outputRef.current.height = out.height;
          ctx.drawImage(out, 0, 0);
        }
      }
    });
  }, [rotCanvas, corners, preset, filter]);

  // ── Load image ────────────────────────────────────────────────────────────
  const loadImage = useCallback((img) => {
    // Build canvas from image to run edge detection
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);

    // Auto-detect corners using Sobel edge detection
    const detected = autoDetectCorners(c);

    setRawImage(img);
    setBaseDeg(0); setFineDeg(0);
    setCorners(detected);
    setHasImage(true);
    setError(null);
  }, []);

  const loadFromFile = useCallback((file) => {
    setProcessing(true);
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => { loadImage(img); setProcessing(false); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, [loadImage]);

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
    } catch { setError('Camera access denied — use file upload instead.'); }
  }, []);

  const captureCamera = useCallback(() => {
    const v = cameraVideoRef.current;
    if (!v?.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    const img = new Image();
    img.onload = () => loadImage(img);
    img.src = c.toDataURL('image/jpeg', 0.95);
  }, [loadImage]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const getCanvasPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (cx - r.left) * (canvas.width / r.width),
      y: (cy - r.top)  * (canvas.height / r.height),
    };
  };

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    const canvas = interactiveRef.current;
    if (!canvas || !rotCanvas) return;
    const pos = getCanvasPos(e, canvas);
    const dW = canvas.width, dH = canvas.height;
    const pts = get8Points(corners, dW, dH);

    let found = -1, minD = 28;
    pts.forEach((p, i) => {
      const d = Math.hypot(p.x - pos.x, p.y - pos.y);
      if (d < minD) { minD = d; found = i; }
    });

    if (found !== -1) {
      dragRef.current = { active: true, idx: found };
      dragStart.current = pos;
      cornersOnDrag.current = corners.map(c => ({ ...c }));
      setDragLabel(found < 4 ? `Dragging Corner ${found + 1}` : 'Resizing Edge Handle');
    }
  }, [corners, rotCanvas]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    e.preventDefault();
    const canvas = interactiveRef.current;
    if (!canvas) return;
    const pos = getCanvasPos(e, canvas);
    const dW = canvas.width, dH = canvas.height;
    const dx = (pos.x - dragStart.current.x) / dW;
    const dy = (pos.y - dragStart.current.y) / dH;
    const ic = cornersOnDrag.current;
    const idx = dragRef.current.idx;
    const next = ic.map(c => ({ ...c }));
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    if (idx < 4) {
      next[idx] = { x: clamp(ic[idx].x + dx, 0, 1), y: clamp(ic[idx].y + dy, 0, 1) };
    } else if (idx === 4) { // top edge
      next[0].y = clamp(ic[0].y + dy, 0, next[3].y - 0.05);
      next[1].y = clamp(ic[1].y + dy, 0, next[2].y - 0.05);
      next[0].x = clamp(ic[0].x + dx, 0, next[1].x - 0.05);
      next[1].x = clamp(ic[1].x + dx, 0, 1);
    } else if (idx === 5) { // right edge
      next[1].x = clamp(ic[1].x + dx, next[0].x + 0.05, 1);
      next[2].x = clamp(ic[2].x + dx, next[3].x + 0.05, 1);
      next[1].y = clamp(ic[1].y + dy, 0, next[2].y - 0.05);
      next[2].y = clamp(ic[2].y + dy, 0, 1);
    } else if (idx === 6) { // bottom edge
      next[2].y = clamp(ic[2].y + dy, next[1].y + 0.05, 1);
      next[3].y = clamp(ic[3].y + dy, next[0].y + 0.05, 1);
      next[2].x = clamp(ic[2].x + dx, next[3].x + 0.05, 1);
      next[3].x = clamp(ic[3].x + dx, 0, next[2].x - 0.05);
    } else if (idx === 7) { // left edge
      next[0].x = clamp(ic[0].x + dx, 0, next[1].x - 0.05);
      next[3].x = clamp(ic[3].x + dx, 0, next[2].x - 0.05);
      next[0].y = clamp(ic[0].y + dy, 0, next[3].y - 0.05);
      next[3].y = clamp(ic[3].y + dy, 0, 1);
    }
    setCorners(next);
  }, []);

  const handlePointerUp = useCallback((e) => {
    e?.preventDefault();
    dragRef.current = { active: false, idx: -1 };
    setDragLabel('Drag points to crop');
  }, []);

  // ── Rotation ──────────────────────────────────────────────────────────────
  const rotate = (deg) => setBaseDeg(b => (b + deg) % 360);

  // ── Auto deskew (geometry-only, no OpenCV needed) ─────────────────────────
  const autoStraighten = useCallback(() => {
    const dy = (corners[1].y - corners[0].y);
    const dx = (corners[1].x - corners[0].x);
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (Math.abs(angleDeg) > 0.2) {
      setFineDeg(-angleDeg);
    }
  }, [corners]);

  // ── Reset corners ─────────────────────────────────────────────────────────
  const resetCorners = () => setCorners([
    { x: 0.04, y: 0.04 }, { x: 0.96, y: 0.04 },
    { x: 0.96, y: 0.96 }, { x: 0.04, y: 0.96 },
  ]);

  // ── Download ──────────────────────────────────────────────────────────────
  const downloadOutput = (fmt) => {
    if (!outputCanvas) return;
    const link = document.createElement('a');
    link.download = `Scanned_${Date.now()}.${fmt}`;
    link.href = outputCanvas.toDataURL(fmt === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    link.click();
  };

  // ── Use scan — returns File to parent ─────────────────────────────────────
  const handleUseScan = useCallback(async () => {
    if (!outputCanvas) return;
    outputCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onScanned(file);
      if (!embedded) { resetAll(); onClose(); }
    }, 'image/jpeg', 0.93);
  }, [outputCanvas, onScanned, onClose, embedded, resetAll]);

  // ── Drag-drop ─────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) loadFromFile(file);
  }, [loadFromFile]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const content = (
    <div className="space-y-3 text-sm">

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">⚠ {error}</div>
      )}

      {/* ── UPLOAD STATE ── */}
      {!hasImage && (
        <div className="space-y-3">
          {/* Camera */}
          <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ minHeight: 180 }}>
            <video ref={cameraVideoRef} autoPlay playsInline muted
              className="w-full object-cover rounded-xl" style={{ maxHeight: '36vh' }} />
            {!cameraStreamRef.current && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
                <HiOutlineCamera className="w-10 h-10" />
                <span className="text-xs">Camera not started</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={startCamera} className="flex items-center justify-center gap-2 text-xs">
              <HiOutlineCamera className="w-4 h-4" /> Start Camera
            </Button>
            <Button variant="primary" onClick={captureCamera} disabled={!cameraStreamRef.current}
              className="flex items-center justify-center gap-2 text-xs">
              <HiOutlineLightningBolt className="w-4 h-4" /> Capture
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <label
            className="cursor-pointer flex flex-col items-center justify-center gap-1.5 w-full py-5
              border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600
              hover:bg-emerald-50 transition-colors"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <HiOutlineUpload className="w-6 h-6" />
            <span className="text-sm font-semibold">Drop or Upload Image</span>
            <span className="text-xs text-gray-400">JPG · PNG · WebP</span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) loadFromFile(f); e.target.value=''; }} />
          </label>
          {processing && <p className="text-center text-xs text-gray-400 animate-pulse">Loading…</p>}
        </div>
      )}

      {/* ── WORKSPACE ── */}
      {hasImage && (
        <div className="space-y-3">

          {/* Toolbar row 1 — rotation + auto straighten */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide shrink-0">Straighten:</span>
            <button onClick={autoStraighten}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
              <HiOutlineAdjustments className="w-3.5 h-3.5" /> Auto
            </button>
            <button onClick={() => rotate(-90)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-1">
              <HiOutlineArrowLeft className="w-3.5 h-3.5" /> -90°
            </button>
            <button onClick={() => rotate(90)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-1">
              +90° <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
              <span className="text-xs font-mono text-gray-500 w-8 text-right">{fineDeg.toFixed(1)}°</span>
              <input type="range" min="-45" max="45" step="0.5" value={fineDeg}
                onChange={e => setFineDeg(parseFloat(e.target.value))}
                className="w-20 accent-emerald-500 cursor-pointer" />
              <button onClick={() => setFineDeg(0)} className="text-[10px] text-gray-400 hover:text-emerald-600">Reset</button>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={resetCorners}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600">
                Full Frame
              </button>
              <button onClick={() => { setHasImage(false); setRawImage(null); setRotCanvas(null); }}
                className="p-1.5 rounded-lg bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-600">
                <HiOutlineX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Toolbar row 2 — presets + filters (presets hidden when locked) */}
          <div className="flex flex-wrap items-center gap-2">
            {!lockedPreset && (
              <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 gap-0.5">
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => setPreset(p.id)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      preset === p.id
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 gap-0.5">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    filter === f.id
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dual panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

            {/* Left — interactive crop */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Original — Drag Handles
                </span>
                <span className="text-[11px] font-mono text-emerald-600">{dragLabel}</span>
              </div>
              <div className="bg-slate-900 rounded-lg overflow-hidden select-none touch-none cursor-crosshair">
                <canvas ref={interactiveRef} className="block w-full" style={{ touchAction: 'none' }}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> 4 Corners
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" /> 4 Edge Handles
                </span>
              </div>
            </div>

            {/* Right — warped output */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 space-y-1.5">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block">
                ✅ Scanned Output
              </span>
              <div className="bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center"
                style={{ minHeight: 180 }}>
                <canvas ref={outputRef} className="block max-w-full max-h-64 object-contain" />
              </div>
              {/* Download + Use buttons */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex gap-1.5">
                  <button onClick={() => downloadOutput('jpg')}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-1">
                    <HiOutlineDownload className="w-3.5 h-3.5" /> JPG
                  </button>
                  <button onClick={() => downloadOutput('png')}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center gap-1">
                    <HiOutlineDownload className="w-3.5 h-3.5" /> PNG
                  </button>
                </div>
                <Button variant="primary" onClick={handleUseScan}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 border-emerald-600 px-3 py-1.5">
                  <HiOutlineCheck className="w-4 h-4" /> Use This Scan
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="secondary" onClick={resetAll} className="text-xs">
              ← New Image
            </Button>
            <p className="text-xs text-gray-400">
              Drag the <span className="font-semibold text-emerald-600">green corners</span> &amp; <span className="font-semibold text-teal-500">teal edge handles</span> to precisely frame your document
            </p>
          </div>

        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <Modal isOpen={isOpen} onClose={() => { resetAll(); onClose(); }}
      title="📄 Smart Document Scanner" size="4xl">
      {content}
    </Modal>
  );
}
