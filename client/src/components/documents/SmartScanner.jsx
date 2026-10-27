/**
 * SmartScanner — Production-quality document scanner component.
 *
 * Algorithm (matches the reference HTML demo):
 *   1. Load image → draw on canvas → cv.imread
 *   2. Grayscale → GaussianBlur → Otsu threshold → findContours
 *   3. Find largest 4-point polygon (≥ 15% image area)
 *   4. Sort corners TL→TR→BR→BL
 *   5. Render draggable green handles on canvas overlay
 *   6. On "Scan": getPerspectiveTransform → warpPerspective
 *   7. Apply filter: Magic (adaptiveThreshold) / B&W / Grayscale / Original
 *   8. Preview warped result, allow filter change live
 *   9. "Use Scan" → returns File object via onScanned callback
 *
 * Props:
 *   isOpen       — controls visibility (if used standalone set to true always)
 *   onClose      — called when user cancels
 *   onScanned    — called with File when user confirms result
 *   embedded     — if true renders inline (no Modal wrapper), used inside CNIC studio
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useOpenCV } from '../../hooks/useOpenCV';
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

// ─── OpenCV pipeline ─────────────────────────────────────────────────────────

/** Sort 4 pts → [TL, TR, BR, BL] */
function sortCorners(pts) {
  const sorted = [...pts].sort((a, b) => a.y - b.y);
  const top    = sorted.slice(0, 2).sort((a, b) => a.x - b.x);   // [TL, TR]
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);   // [BL, BR]
  return [top[0], top[1], bottom[1], bottom[0]];                  // TL TR BR BL
}

/** Detect largest quad using Otsu threshold + contour approx */
function detectCorners(cv, mat) {
  const w = mat.cols, h = mat.rows;
  const fallback = [
    { x: w * 0.05, y: h * 0.05 },
    { x: w * 0.95, y: h * 0.05 },
    { x: w * 0.95, y: h * 0.95 },
    { x: w * 0.05, y: h * 0.95 },
  ];

  const gray      = new cv.Mat();
  const blur      = new cv.Mat();
  const thresh    = new cv.Mat();
  const contours  = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    // Otsu — same as the reference implementation
    cv.threshold(blur, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestArea = 0, bestPoly = null;
    for (let i = 0; i < contours.size(); i++) {
      const cnt  = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area > w * h * 0.15) {
        const peri   = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows === 4 && area > bestArea) {
          bestArea = area;
          bestPoly?.delete();
          bestPoly = approx;
        } else {
          approx.delete();
        }
      }
      cnt.delete();
    }

    if (bestPoly) {
      const pts = [];
      for (let i = 0; i < 4; i++) {
        pts.push({ x: bestPoly.data32S[i * 2], y: bestPoly.data32S[i * 2 + 1] });
      }
      bestPoly.delete();
      return sortCorners(pts);
    }
  } finally {
    gray.delete(); blur.delete(); thresh.delete();
    contours.delete(); hierarchy.delete();
  }
  return fallback;
}

/** Perspective warp + filter application, returns a canvas */
function warpAndFilter(cv, srcMat, corners, filter) {
  const [tl, tr, br, bl] = corners;

  const outW = Math.round(Math.max(
    Math.hypot(tr.x - tl.x, tr.y - tl.y),
    Math.hypot(br.x - bl.x, br.y - bl.y)
  ));
  const outH = Math.round(Math.max(
    Math.hypot(bl.x - tl.x, bl.y - tl.y),
    Math.hypot(br.x - tr.x, br.y - tr.y)
  ));

  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
  ]);
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0, outW, 0, outW, outH, 0, outH,
  ]);

  const M      = cv.getPerspectiveTransform(srcPts, dstPts);
  const warped = new cv.Mat();
  cv.warpPerspective(srcMat, warped, M, new cv.Size(outW, outH));
  srcPts.delete(); dstPts.delete(); M.delete();

  let output = new cv.Mat();

  if (filter === 'magic') {
    // CamScanner "Magic Color" — adaptive threshold gives crisp black text
    const gray = new cv.Mat();
    cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(gray, output, 255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 10);
    gray.delete();
  } else if (filter === 'grayscale') {
    cv.cvtColor(warped, output, cv.COLOR_RGBA2GRAY);
  } else if (filter === 'bw') {
    const gray = new cv.Mat();
    cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
    cv.threshold(gray, output, 128, 255, cv.THRESH_BINARY);
    gray.delete();
  } else {
    output = warped.clone();
  }

  warped.delete();

  // Draw onto an offscreen canvas and return it
  const outCanvas = document.createElement('canvas');
  cv.imshow(outCanvas, output);
  output.delete();
  return outCanvas;
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

const HANDLE_R = 12; // display px

function drawOverlay(canvas, img, corners, activeIdx) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (!corners || corners.length !== 4) return;

  const sx = canvas.width  / img.naturalWidth;
  const sy = canvas.height / img.naturalHeight;
  const sc = corners.map(p => ({ x: p.x * sx, y: p.y * sy }));

  // Darken outside quad
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

  // Quad border — green like the reference
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
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle      = i === activeIdx ? '#fff' : '#065f46';
    ctx.font           = 'bold 10px sans-serif';
    ctx.textAlign      = 'center';
    ctx.textBaseline   = 'middle';
    ctx.fillText(labels[i], p.x, p.y);
  });
}

// ─── Filters list ─────────────────────────────────────────────────────────────

const FILTERS = [
  { value: 'magic',     label: '✨ Magic Color (CamScanner)' },
  { value: 'bw',        label: '⬛ B&W Document' },
  { value: 'grayscale', label: '🩶 Grayscale' },
  { value: 'original',  label: '🖼 Original Color' },
];

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEP = { UPLOAD: 'upload', CROP: 'crop', RESULT: 'result' };

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartScanner({ isOpen, onClose, onScanned, embedded = false }) {
  const { cvReady, cvLoading, cvError, loadCV } = useOpenCV();

  const [step,          setStep]          = useState(STEP.UPLOAD);
  const [originalImage, setOriginalImage] = useState(null);   // HTMLImageElement
  const [srcMat,        setSrcMat]        = useState(null);   // cv.Mat
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
  const originalFileRef = useRef(null); // kept for "already clean" uploads

  // ── Reset on close ────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    stopCamera();
    if (srcMat) { try { srcMat.delete(); } catch {} }
    setSrcMat(null);
    setOriginalImage(null);
    setCorners(null);
    setResultUrl(null);
    setError(null);
    setStep(STEP.UPLOAD);
    setFilter('magic');
  }, [srcMat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen && !embedded) resetAll();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redraw crop canvas whenever corners/image change ─────────────────────
  useEffect(() => {
    if (step === STEP.CROP && originalImage && cropCanvasRef.current) {
      const canvas = cropCanvasRef.current;
      const maxW   = canvas.parentElement?.clientWidth  || 680;
      const maxH   = window.innerHeight * 0.52;
      const scale  = Math.min(maxW / originalImage.naturalWidth,
                              maxH / originalImage.naturalHeight, 1);
      canvas.width  = Math.round(originalImage.naturalWidth  * scale);
      canvas.height = Math.round(originalImage.naturalHeight * scale);
      scaleRef.current = { sx: scale, sy: scale };
      drawOverlay(canvas, originalImage, corners, dragRef.current.idx);
    }
  }, [step, originalImage, corners]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize listener
  useEffect(() => {
    const fn = () => {
      if (step === STEP.CROP && originalImage && cropCanvasRef.current) {
        const canvas = cropCanvasRef.current;
        const maxW   = canvas.parentElement?.clientWidth  || 680;
        const maxH   = window.innerHeight * 0.52;
        const scale  = Math.min(maxW / originalImage.naturalWidth,
                                maxH / originalImage.naturalHeight, 1);
        canvas.width  = Math.round(originalImage.naturalWidth  * scale);
        canvas.height = Math.round(originalImage.naturalHeight * scale);
        scaleRef.current = { sx: scale, sy: scale };
        drawOverlay(canvas, originalImage, corners, dragRef.current.idx);
      }
    };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [step, originalImage, corners]);

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
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

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
  }, []);

  const captureFromCamera = useCallback(() => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth) return;
    const c = document.createElement('canvas');
    c.width  = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    loadImage(c.toDataURL('image/jpeg', 0.95));
  }, [stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load image (file or data URL) ─────────────────────────────────────────
  const loadImageFromFile = useCallback((file) => {
    originalFileRef.current = file;
    const reader = new FileReader();
    reader.onload = e => loadImage(e.target.result);
    reader.readAsDataURL(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadImage = useCallback(async (dataUrl) => {
    setError(null);
    setProcessing(true);
    const img = new Image();
    img.onload = async () => {
      setOriginalImage(img);

      // Load OpenCV on demand — only triggers the actual download once
      const cv = await loadCV();

      // Build srcMat from a temp canvas
      const tmp  = document.createElement('canvas');
      tmp.width  = img.naturalWidth;
      tmp.height = img.naturalHeight;
      tmp.getContext('2d').drawImage(img, 0, 0);

      if (srcMat) { try { srcMat.delete(); } catch {} }

      if (cv) {
        const mat = cv.imread(tmp);
        setSrcMat(mat);
        const detected = detectCorners(cv, mat);
        setCorners(detected);
      } else {
        // No OpenCV — default corners, user can still drag
        setSrcMat(null);
        setCorners([
          { x: img.naturalWidth  * 0.05, y: img.naturalHeight * 0.05 },
          { x: img.naturalWidth  * 0.95, y: img.naturalHeight * 0.05 },
          { x: img.naturalWidth  * 0.95, y: img.naturalHeight * 0.95 },
          { x: img.naturalWidth  * 0.05, y: img.naturalHeight * 0.95 },
        ]);
      }
      setStep(STEP.CROP);
      setProcessing(false);
    };
    img.src = dataUrl;
  }, [loadCV, srcMat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-detect ─────────────────────────────────────────────────────────────
  const handleRedetect = useCallback(() => {
    if (!srcMat || !window.cv?.Mat) return;
    const detected = detectCorners(window.cv, srcMat);
    setCorners(detected);
  }, [srcMat]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
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
    if (!dragRef.current.active) return;
    const canvas = cropCanvasRef.current;
    if (!canvas || !corners || !originalImage) return;
    const pt = canvasPt(e, canvas);
    const { sx, sy } = scaleRef.current;
    const newCorners = [...corners];
    newCorners[dragRef.current.idx] = {
      x: Math.max(0, Math.min(originalImage.naturalWidth,  pt.x / sx)),
      y: Math.max(0, Math.min(originalImage.naturalHeight, pt.y / sy)),
    };
    setCorners(newCorners);
  }, [corners, originalImage]);

  const handlePointerUp = useCallback((e) => {
    e.preventDefault();
    dragRef.current = { active: false, idx: -1 };
  }, []);

  // ── Apply warp + filter → result ─────────────────────────────────────────
  const handleScan = useCallback(() => {
    if (!originalImage || !corners) return;
    setProcessing(true);
    setError(null);
    setTimeout(() => {
      try {
        const cv = window.cv;
        if (!cv?.Mat) throw new Error('OpenCV not ready');

        // If srcMat was freed or missing, rebuild it
        let mat = srcMat;
        if (!mat) {
          const tmp  = document.createElement('canvas');
          tmp.width  = originalImage.naturalWidth;
          tmp.height = originalImage.naturalHeight;
          tmp.getContext('2d').drawImage(originalImage, 0, 0);
          mat = cv.imread(tmp);
          setSrcMat(mat);
        }

        const outCanvas = warpAndFilter(cv, mat, corners, filter);
        setResultUrl(outCanvas.toDataURL('image/jpeg', 0.95));
        setStep(STEP.RESULT);
      } catch (err) {
        setError('Scan failed: ' + err.message);
      } finally {
        setProcessing(false);
      }
    }, 40);
  }, [originalImage, corners, srcMat, filter]);

  // Re-apply filter when it changes on the result screen
  useEffect(() => {
    if (step !== STEP.RESULT || !originalImage || !corners) return;
    const cv = window.cv;
    if (!cv?.Mat) return;
    let mat = srcMat;
    if (!mat) return;
    try {
      const outCanvas = warpAndFilter(cv, mat, corners, filter);
      setResultUrl(outCanvas.toDataURL('image/jpeg', 0.95));
    } catch {}
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Accept result ─────────────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!resultUrl) return;
    const res  = await fetch(resultUrl);
    const blob = await res.blob();
    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onScanned(file);
    if (!embedded) { resetAll(); onClose(); }
  }, [resultUrl, onScanned, onClose, embedded, resetAll]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const content = (
    <div className="space-y-4">

      {/* Status bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {cvLoading && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Loading OpenCV engine…
          </span>
        )}
        {cvReady && !cvLoading && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            ⚡ OpenCV WASM Engine Ready
          </span>
        )}
        {cvError && (
          <span className="text-xs text-amber-600">OpenCV unavailable — manual crop only</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* ═══ STEP 1: UPLOAD ══════════════════════════════════════════════════ */}
      {step === STEP.UPLOAD && (
        <div className="space-y-4">
          {/* Camera section */}
          <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ minHeight: 220 }}>
            <video
              ref={cameraVideoRef}
              autoPlay playsInline muted
              className="w-full object-cover rounded-xl"
              style={{ maxHeight: '42vh' }}
            />
            {!cameraStreamRef.current && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
                <HiOutlineCamera className="w-12 h-12" />
                <span className="text-xs">Camera not started</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={startCamera} className="flex items-center justify-center gap-2">
              <HiOutlineCamera className="w-4 h-4" /> Start Camera
            </Button>
            <Button variant="primary" onClick={captureFromCamera}
              disabled={!cameraStreamRef.current}
              className="flex items-center justify-center gap-2">
              <HiOutlineLightningBolt className="w-4 h-4" /> Capture Photo
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <label className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full py-6
            border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors">
            <HiOutlineUpload className="w-7 h-7" />
            <span className="text-sm font-semibold">Upload Image</span>
            <span className="text-xs text-gray-400">JPG · PNG · WebP · max 25 MB</span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) loadImageFromFile(f); e.target.value = ''; }} />
          </label>

          {processing && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Detecting document edges…
            </div>
          )}
        </div>
      )}

      {/* ═══ STEP 2: CROP — drag handles ═════════════════════════════════════ */}
      {step === STEP.CROP && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Drag the <span className="font-semibold text-emerald-600">green handles</span> to frame your document exactly.
            </p>
            <button onClick={handleRedetect}
              disabled={!cvReady}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-40">
              <HiOutlineRefresh className="w-4 h-4" /> Re-detect
            </button>
          </div>

          {/* Canvas crop editor */}
          <div className="relative w-full rounded-xl border border-gray-200 bg-slate-900 overflow-hidden
            select-none touch-none cursor-crosshair">
            <canvas
              ref={cropCanvasRef}
              className="block w-full"
              style={{ touchAction: 'none' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          </div>

          {/* Filter selector — choose before scanning */}
          <div className="flex items-center gap-2 flex-wrap">
            <HiOutlineAdjustments className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="text-xs text-gray-500 font-medium">Output filter:</span>
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    filter === f.value
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400 hover:text-emerald-700'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button variant="secondary" onClick={() => { setStep(STEP.UPLOAD); setOriginalImage(null); setCorners(null); }}>
              ← Back
            </Button>
            <Button variant="primary" onClick={handleScan}
              disabled={!corners || processing}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
              {processing ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Processing…
                </>
              ) : (
                <><HiOutlineLightningBolt className="w-4 h-4" /> Scan & Straighten</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: RESULT ══════════════════════════════════════════════════ */}
      {step === STEP.RESULT && resultUrl && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-emerald-800 font-medium">
            <HiOutlineCheck className="w-4 h-4 shrink-0" />
            Document scanned, straightened &amp; filter applied
          </div>

          {/* Live filter toggle on result */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Change filter:</span>
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    filter === f.value
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200 bg-slate-100 flex items-center
            justify-center p-3" style={{ maxHeight: '52vh' }}>
            <img src={resultUrl} alt="Scanned"
              className="max-h-full max-w-full object-contain rounded shadow"
              style={{ maxHeight: '48vh' }} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => { setStep(STEP.CROP); setResultUrl(null); }}>
              ← Adjust Crop
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary"
                onClick={() => { resetAll(); }}>
                Scan Another
              </Button>
              <Button variant="primary" onClick={handleAccept}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                <HiOutlineCheck className="w-4 h-4" /> Use This Scan
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // ── If embedded (CNIC studio), render without Modal wrapper ───────────────
  if (embedded) return content;

  return (
    <Modal isOpen={isOpen} onClose={() => { resetAll(); onClose(); }}
      title="📄 Smart Document Scanner" size="2xl">
      {content}
    </Modal>
  );
}
