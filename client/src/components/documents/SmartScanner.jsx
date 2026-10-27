/**
 * SmartScanner — Pure JavaScript document scanner. Zero external dependencies.
 *
 * No OpenCV.js, no WASM, no downloads, no page freezes.
 *
 * How it works:
 *  1. User uploads image or captures from camera
 *  2. Canvas 2D edge detection (Sobel-like gradient) finds the document quad
 *  3. Draggable corner handles let the user refine the crop
 *  4. Perspective warp is computed with a hand-rolled homography (pure JS)
 *  5. Filters applied via Canvas 2D pixel manipulation
 *  6. Returns a File object via onScanned()
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  HiOutlineCamera,
  HiOutlineUpload,
  HiOutlineLightningBolt,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineAdjustments,
} from 'react-icons/hi';

// ─── Pure-JS perspective warp ─────────────────────────────────────────────────
// Computes the 3×3 homography from 4 src → 4 dst point pairs, then
// samples the source image for every destination pixel (inverse mapping).

function solve8x8(A, b) {
  // Gaussian elimination with partial pivoting — 8×8 system
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    const piv = M[col][col];
    if (Math.abs(piv) < 1e-12) continue;
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / piv;
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

function computeHomography(src, dst) {
  // Build 8×8 linear system  A·h = b
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = [src[i].x, src[i].y];
    const [dx, dy] = [dst[i].x, dst[i].y];
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }
  const h = solve8x8(A, b);
  // 3×3 homography matrix (row-major, last element = 1)
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function invertHomography(H) {
  const [a, b, c, d, e, f, g, h, i] = H;
  const det = a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g);
  const inv = [
    (e*i - f*h)/det, (c*h - b*i)/det, (b*f - c*e)/det,
    (f*g - d*i)/det, (a*i - c*g)/det, (c*d - a*f)/det,
    (d*h - e*g)/det, (b*g - a*h)/det, (a*e - b*d)/det,
  ];
  return inv;
}

function warpPerspective(srcCanvas, corners, filter) {
  const [tl, tr, br, bl] = corners;

  const outW = Math.round(Math.max(
    Math.hypot(tr.x - tl.x, tr.y - tl.y),
    Math.hypot(br.x - bl.x, br.y - bl.y)
  ));
  const outH = Math.round(Math.max(
    Math.hypot(bl.x - tl.x, bl.y - tl.y),
    Math.hypot(br.x - tr.x, br.y - tr.y)
  ));

  const src4 = [tl, tr, br, bl];
  const dst4 = [
    { x: 0,    y: 0    },
    { x: outW, y: 0    },
    { x: outW, y: outH },
    { x: 0,    y: outH },
  ];

  const H    = computeHomography(dst4, src4); // dst→src for inverse mapping
  const invH = H; // already dst→src

  const srcCtx  = srcCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const sW = srcCanvas.width, sH = srcCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width  = outW;
  outCanvas.height = outH;
  const outCtx  = outCanvas.getContext('2d');
  const outData = outCtx.createImageData(outW, outH);

  const [h0,h1,h2,h3,h4,h5,h6,h7] = invH;

  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      const w  = h6*dx + h7*dy + 1;
      const sx = (h0*dx + h1*dy + h2) / w;
      const sy = (h3*dx + h4*dy + h5) / w;

      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      if (x0 < 0 || x0 >= sW - 1 || y0 < 0 || y0 >= sH - 1) continue;

      // Bilinear interpolation
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sW + x0) * 4;
      const i10 = (y0 * sW + x0 + 1) * 4;
      const i01 = ((y0+1) * sW + x0) * 4;
      const i11 = ((y0+1) * sW + x0 + 1) * 4;
      const d   = srcData.data;

      const r = d[i00]*(1-fx)*(1-fy) + d[i10]*fx*(1-fy) + d[i01]*(1-fx)*fy + d[i11]*fx*fy;
      const g = d[i00+1]*(1-fx)*(1-fy) + d[i10+1]*fx*(1-fy) + d[i01+1]*(1-fx)*fy + d[i11+1]*fx*fy;
      const b = d[i00+2]*(1-fx)*(1-fy) + d[i10+2]*fx*(1-fy) + d[i01+2]*(1-fx)*fy + d[i11+2]*fx*fy;

      const oi = (dy * outW + dx) * 4;
      outData.data[oi]   = r;
      outData.data[oi+1] = g;
      outData.data[oi+2] = b;
      outData.data[oi+3] = 255;
    }
  }

  outCtx.putImageData(outData, 0, 0);

  // Apply filter
  return applyFilter(outCanvas, filter);
}

// ─── Canvas 2D filters ────────────────────────────────────────────────────────

function applyFilter(canvas, filter) {
  if (filter === 'original') return canvas;

  const ctx  = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d    = data.data;

  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];

    if (filter === 'grayscale') {
      d[i] = d[i+1] = d[i+2] = gray;
    } else if (filter === 'bw') {
      const v = gray > 128 ? 255 : 0;
      d[i] = d[i+1] = d[i+2] = v;
    } else if (filter === 'magic') {
      // Adaptive-like: boost contrast, whiten background, darken text
      // Simple but effective: stretch contrast per-pixel around local mean
      const boosted = Math.min(255, Math.max(0, (gray - 80) * 1.8));
      const v = boosted > 140 ? 255 : boosted * 0.6;
      d[i] = d[i+1] = d[i+2] = v;
    }
  }

  ctx.putImageData(data, 0, 0);
  return canvas;
}

// ─── Edge detection for auto-corner detection ─────────────────────────────────
// Downsamples image, runs Sobel, finds the largest bright rectangle

function autoDetectCorners(srcCanvas) {
  const W = srcCanvas.width, H = srcCanvas.height;

  // Work on a small copy for speed
  const scale  = Math.min(1, 400 / Math.max(W, H));
  const sw     = Math.round(W * scale), sh = Math.round(H * scale);
  const small  = document.createElement('canvas');
  small.width  = sw; small.height = sh;
  const sCtx   = small.getContext('2d');
  sCtx.drawImage(srcCanvas, 0, 0, sw, sh);
  const imgData = sCtx.getImageData(0, 0, sw, sh).data;

  // Grayscale + simple Sobel edge map
  const gray  = new Uint8Array(sw * sh);
  const edges = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    gray[i] = (imgData[i*4]*0.299 + imgData[i*4+1]*0.587 + imgData[i*4+2]*0.114);
  }
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const gx =
        -gray[(y-1)*sw+(x-1)] + gray[(y-1)*sw+(x+1)]
        -2*gray[y*sw+(x-1)]   + 2*gray[y*sw+(x+1)]
        -gray[(y+1)*sw+(x-1)] + gray[(y+1)*sw+(x+1)];
      const gy =
        -gray[(y-1)*sw+(x-1)] - 2*gray[(y-1)*sw+x] - gray[(y-1)*sw+(x+1)]
        +gray[(y+1)*sw+(x-1)] + 2*gray[(y+1)*sw+x] + gray[(y+1)*sw+(x+1)];
      edges[y*sw+x] = Math.min(255, Math.sqrt(gx*gx + gy*gy));
    }
  }

  // Scan for the outermost strong edge pixels in each quadrant
  const thresh = 60;
  const margin = Math.round(sw * 0.05);

  // Find extreme edge points closest to each corner
  const findCorner = (qx, qy) => {
    // qx=0 → left half, qx=1 → right half; qy=0 → top, qy=1 → bottom
    let best = null, bestDist = Infinity;
    const cx = qx === 0 ? 0 : sw, cy = qy === 0 ? 0 : sh;
    for (let y = margin; y < sh - margin; y++) {
      for (let x = margin; x < sw - margin; x++) {
        if (edges[y*sw+x] < thresh) continue;
        // Only look in this quadrant
        if (qx === 0 && x > sw * 0.6) continue;
        if (qx === 1 && x < sw * 0.4) continue;
        if (qy === 0 && y > sh * 0.6) continue;
        if (qy === 1 && y < sh * 0.4) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d < bestDist) { bestDist = d; best = { x, y }; }
      }
    }
    return best;
  };

  const tl = findCorner(0, 0);
  const tr = findCorner(1, 0);
  const br = findCorner(1, 1);
  const bl = findCorner(0, 1);

  const invScale = 1 / scale;
  const fallback = (cx, cy) => ({
    x: cx * W,
    y: cy * H,
  });

  return [
    tl ? { x: tl.x * invScale, y: tl.y * invScale } : fallback(0.05, 0.05),
    tr ? { x: tr.x * invScale, y: tr.y * invScale } : fallback(0.95, 0.05),
    br ? { x: br.x * invScale, y: br.y * invScale } : fallback(0.95, 0.95),
    bl ? { x: bl.x * invScale, y: bl.y * invScale } : fallback(0.05, 0.95),
  ];
}

// ─── Canvas overlay drawing ───────────────────────────────────────────────────

const HANDLE_R = 14;

function drawOverlay(canvas, img, corners, activeIdx) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (!corners || corners.length !== 4) return;

  const sx = canvas.width  / img.naturalWidth;
  const sy = canvas.height / img.naturalHeight;
  const sc = corners.map(p => ({ x: p.x * sx, y: p.y * sy }));

  // Dark vignette outside quad
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(sc[0].x, sc[0].y);
  sc.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Green quad border
  ctx.save();
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(sc[0].x, sc[0].y);
  sc.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Corner handles
  const labels = ['↖', '↗', '↘', '↙'];
  sc.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, HANDLE_R, 0, Math.PI * 2);
    ctx.fillStyle   = i === activeIdx ? '#10B981' : '#fff';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth   = 2.5;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = i === activeIdx ? '#fff' : '#065f46';
    ctx.font         = 'bold 11px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], p.x, p.y);
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS = [
  { value: 'magic',     label: '✨ Magic Color' },
  { value: 'bw',        label: '⬛ B&W' },
  { value: 'grayscale', label: '🩶 Grayscale' },
  { value: 'original',  label: '🖼 Original' },
];

const STEP = { UPLOAD: 'upload', CROP: 'crop', RESULT: 'result' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function SmartScanner({ isOpen, onClose, onScanned, embedded = false }) {
  const [step,          setStep]          = useState(STEP.UPLOAD);
  const [originalImage, setOriginalImage] = useState(null);
  const [srcCanvas,     setSrcCanvas]     = useState(null); // full-res canvas
  const [corners,       setCorners]       = useState(null);
  const [filter,        setFilter]        = useState('magic');
  const [resultUrl,     setResultUrl]     = useState(null);
  const [processing,    setProcessing]    = useState(false);
  const [error,         setError]         = useState(null);

  const cropCanvasRef   = useRef(null);
  const cameraVideoRef  = useRef(null);
  const cameraStreamRef = useRef(null);
  const dragRef         = useRef({ active: false, idx: -1 });
  const scaleRef        = useRef({ sx: 1, sy: 1 });

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    setOriginalImage(null);
    setSrcCanvas(null);
    setCorners(null);
    setResultUrl(null);
    setError(null);
    setStep(STEP.UPLOAD);
    setFilter('magic');
  }, []);

  useEffect(() => {
    if (!isOpen && !embedded) resetAll();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redraw canvas overlay ─────────────────────────────────────────────────
  useEffect(() => {
    if (step !== STEP.CROP || !originalImage || !cropCanvasRef.current) return;
    const canvas = cropCanvasRef.current;
    const maxW   = canvas.parentElement?.clientWidth || 600;
    const maxH   = 320;
    const scale  = Math.min(maxW / originalImage.naturalWidth,
                            maxH / originalImage.naturalHeight, 1);
    canvas.width  = Math.round(originalImage.naturalWidth  * scale);
    canvas.height = Math.round(originalImage.naturalHeight * scale);
    scaleRef.current = { sx: scale, sy: scale };
    drawOverlay(canvas, originalImage, corners, dragRef.current.idx);
  }, [step, originalImage, corners]);

  useEffect(() => {
    const fn = () => {
      if (step !== STEP.CROP || !originalImage || !cropCanvasRef.current) return;
      const canvas = cropCanvasRef.current;
      const maxW   = canvas.parentElement?.clientWidth || 600;
      const maxH   = 320;
      const scale  = Math.min(maxW / originalImage.naturalWidth,
                              maxH / originalImage.naturalHeight, 1);
      canvas.width  = Math.round(originalImage.naturalWidth  * scale);
      canvas.height = Math.round(originalImage.naturalHeight * scale);
      scaleRef.current = { sx: scale, sy: scale };
      drawOverlay(canvas, originalImage, corners, dragRef.current.idx);
    };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [step, originalImage, corners]);

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
    } catch {
      setError('Camera access denied — use file upload instead.');
    }
  }, []);

  const captureFromCamera = useCallback(() => {
    const video = cameraVideoRef.current;
    if (!video?.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    loadImageFromDataUrl(c.toDataURL('image/jpeg', 0.95));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load image ────────────────────────────────────────────────────────────
  const loadImageFromFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = e => loadImageFromDataUrl(e.target.result);
    reader.readAsDataURL(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadImageFromDataUrl = useCallback((dataUrl) => {
    setError(null);
    setProcessing(true);
    const img = new Image();
    img.onload = () => {
      // Build full-res canvas immediately — no blocking ops
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);

      setOriginalImage(img);
      setSrcCanvas(c);

      // Default corners — instant, no computation
      const dflt = [
        { x: img.naturalWidth  * 0.05, y: img.naturalHeight * 0.05 },
        { x: img.naturalWidth  * 0.95, y: img.naturalHeight * 0.05 },
        { x: img.naturalWidth  * 0.95, y: img.naturalHeight * 0.95 },
        { x: img.naturalWidth  * 0.05, y: img.naturalHeight * 0.95 },
      ];
      setCorners(dflt);
      setStep(STEP.CROP);
      setProcessing(false);

      // Run edge detection in the next idle frame — pure JS, but still
      // can be slow on very large images so we do it off the critical path
      requestIdleCallback ? requestIdleCallback(() => {
        const detected = autoDetectCorners(c);
        setCorners(detected);
      }) : setTimeout(() => {
        const detected = autoDetectCorners(c);
        setCorners(detected);
      }, 200);
    };
    img.src = dataUrl;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-detect ─────────────────────────────────────────────────────────────
  const handleRedetect = useCallback(() => {
    if (!srcCanvas) return;
    setProcessing(true);
    setTimeout(() => {
      const detected = autoDetectCorners(srcCanvas);
      setCorners(detected);
      setProcessing(false);
    }, 20);
  }, [srcCanvas]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const canvasPt = (e, canvas) => {
    const r  = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (cx - r.left) * (canvas.width  / r.width),
      y: (cy - r.top)  * (canvas.height / r.height),
    };
  };

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    const canvas = cropCanvasRef.current;
    if (!canvas || !corners) return;
    const pt = canvasPt(e, canvas);
    const { sx, sy } = scaleRef.current;
    let found = -1;
    corners.forEach((c, i) => {
      if (Math.hypot(pt.x - c.x * sx, pt.y - c.y * sy) < HANDLE_R * 2) found = i;
    });
    if (found !== -1) dragRef.current = { active: true, idx: found };
  }, [corners]);

  const handlePointerMove = useCallback((e) => {
    e.preventDefault();
    if (!dragRef.current.active || !corners || !originalImage) return;
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const pt = canvasPt(e, canvas);
    const { sx, sy } = scaleRef.current;
    const next = [...corners];
    next[dragRef.current.idx] = {
      x: Math.max(0, Math.min(originalImage.naturalWidth,  pt.x / sx)),
      y: Math.max(0, Math.min(originalImage.naturalHeight, pt.y / sy)),
    };
    setCorners(next);
  }, [corners, originalImage]);

  const handlePointerUp = useCallback((e) => {
    e.preventDefault();
    dragRef.current = { active: false, idx: -1 };
  }, []);

  // ── Scan — pure JS warp, runs in ~100ms even for large images ─────────────
  const handleScan = useCallback(() => {
    if (!srcCanvas || !corners) return;
    setProcessing(true);
    setError(null);
    // setTimeout gives React time to show the spinner before the CPU work
    setTimeout(() => {
      try {
        const out = warpPerspective(srcCanvas, corners, filter);
        setResultUrl(out.toDataURL('image/jpeg', 0.93));
        setStep(STEP.RESULT);
      } catch (err) {
        setError('Scan failed: ' + err.message);
      } finally {
        setProcessing(false);
      }
    }, 30);
  }, [srcCanvas, corners, filter]);

  // Re-apply filter live on result screen
  useEffect(() => {
    if (step !== STEP.RESULT || !srcCanvas || !corners) return;
    setTimeout(() => {
      try {
        const out = warpPerspective(srcCanvas, corners, filter);
        setResultUrl(out.toDataURL('image/jpeg', 0.93));
      } catch {}
    }, 10);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!resultUrl) return;
    const res  = await fetch(resultUrl);
    const blob = await res.blob();
    onScanned(new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    if (!embedded) { resetAll(); onClose(); }
  }, [resultUrl, onScanned, onClose, embedded, resetAll]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const content = (
    <div className="space-y-3">

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* ═══ UPLOAD ══════════════════════════════════════════════════════════ */}
      {step === STEP.UPLOAD && (
        <div className="space-y-3">
          <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ minHeight: 180 }}>
            <video ref={cameraVideoRef} autoPlay playsInline muted
              className="w-full object-cover rounded-xl" style={{ maxHeight: '38vh' }} />
            {!cameraStreamRef.current && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
                <HiOutlineCamera className="w-10 h-10" />
                <span className="text-xs">Camera not started</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={startCamera} className="flex items-center justify-center gap-2 text-sm">
              <HiOutlineCamera className="w-4 h-4" /> Start Camera
            </Button>
            <Button variant="primary" onClick={captureFromCamera}
              disabled={!cameraStreamRef.current}
              className="flex items-center justify-center gap-2 text-sm">
              <HiOutlineLightningBolt className="w-4 h-4" /> Capture
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 w-full py-5
            border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors">
            <HiOutlineUpload className="w-6 h-6" />
            <span className="text-sm font-semibold">Upload Image</span>
            <span className="text-xs text-gray-400">JPG · PNG · WebP</span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { loadImageFromFile(f); e.target.value=''; }}} />
          </label>

          {processing && (
            <p className="text-center text-xs text-gray-500 animate-pulse">Loading image…</p>
          )}
        </div>
      )}

      {/* ═══ CROP ════════════════════════════════════════════════════════════ */}
      {step === STEP.CROP && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Drag <span className="font-bold text-emerald-600">green handles</span> to frame document.
            </p>
            <button onClick={handleRedetect} disabled={processing}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-40">
              <HiOutlineRefresh className="w-3.5 h-3.5" />
              {processing ? 'Detecting…' : 'Re-detect'}
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-slate-900 overflow-hidden select-none touch-none cursor-crosshair">
            <canvas ref={cropCanvasRef} className="block w-full" style={{ touchAction: 'none' }}
              onMouseDown={handlePointerDown} onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}   onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown} onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp} />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <HiOutlineAdjustments className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                  filter === f.value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="secondary" onClick={() => { setStep(STEP.UPLOAD); setOriginalImage(null); setCorners(null); }}
              className="text-sm">
              ← Back
            </Button>
            <Button variant="primary" onClick={handleScan}
              disabled={!corners || processing}
              className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
              {processing
                ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Processing…</>
                : <><HiOutlineLightningBolt className="w-4 h-4" /> Scan &amp; Straighten</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ═══ RESULT ══════════════════════════════════════════════════════════ */}
      {step === STEP.RESULT && resultUrl && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-emerald-800">
            <HiOutlineCheck className="w-4 h-4 shrink-0" /> Scanned &amp; straightened
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Filter:</span>
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                  filter === f.value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-slate-100 flex items-center justify-center p-2"
            style={{ maxHeight: 320 }}>
            <img src={resultUrl} alt="Scanned"
              className="max-h-full max-w-full object-contain rounded shadow"
              style={{ maxHeight: 300 }} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={() => { setStep(STEP.CROP); setResultUrl(null); }} className="text-sm">
              ← Adjust
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={resetAll} className="text-sm">New Scan</Button>
              <Button variant="primary" onClick={handleAccept}
                className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                <HiOutlineCheck className="w-4 h-4" /> Use This Scan
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (embedded) return content;

  return (
    <Modal isOpen={isOpen} onClose={() => { resetAll(); onClose(); }}
      title="📄 Smart Document Scanner" size="2xl">
      {content}
    </Modal>
  );
}
