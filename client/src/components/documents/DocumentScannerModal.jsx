/**
 * DocumentScannerModal — CamScanner-like scanner with smart mode selection.
 *
 * Mode A — RAW PHOTO: user took a photo with phone/camera → OpenCV auto-detects
 *           document edges, shows draggable corner handles, perspective warp.
 *
 * Mode B — ALREADY SCANNED: image was already processed by CamScanner or similar
 *           → skip all OpenCV processing, upload directly as-is. No distortion.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useOpenCV } from '../../hooks/useOpenCV';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  HiOutlineCamera,
  HiOutlineUpload,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlinePhotograph,
  HiOutlineLightningBolt,
} from 'react-icons/hi';

// ─── OpenCV helpers ──────────────────────────────────────────────────────────

function findDocumentCorners(cv, src) {
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 75, 200);

    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, edges, kernel);
    kernel.delete();

    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let bestCorners = null;
    let bestArea = 0;
    const imgArea = src.rows * src.cols;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      if (approx.rows === 4) {
        const area = Math.abs(cv.contourArea(approx));
        if (area > imgArea * 0.15 && area > bestArea) {
          bestArea = area;
          bestCorners = [];
          for (let j = 0; j < 4; j++) {
            bestCorners.push({
              x: approx.data32S[j * 2],
              y: approx.data32S[j * 2 + 1],
            });
          }
        }
      }
      approx.delete();
      cnt.delete();
    }

    if (bestCorners) bestCorners = sortCorners(bestCorners);
    return bestCorners;
  } finally {
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }
}

function sortCorners(pts) {
  const center = {
    x: pts.reduce((s, p) => s + p.x, 0) / 4,
    y: pts.reduce((s, p) => s + p.y, 0) / 4,
  };
  const tl = pts.find((p) => p.x < center.x && p.y < center.y);
  const tr = pts.find((p) => p.x >= center.x && p.y < center.y);
  const br = pts.find((p) => p.x >= center.x && p.y >= center.y);
  const bl = pts.find((p) => p.x < center.x && p.y >= center.y);

  if (!tl || !tr || !br || !bl) {
    return pts
      .map((p) => ({ ...p, angle: Math.atan2(p.y - center.y, p.x - center.x) }))
      .sort((a, b) => a.angle - b.angle)
      .map(({ angle, ...p }) => p);
  }
  return [tl, tr, br, bl];
}

function perspectiveWarp(cv, src, corners) {
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

  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(outW, outH),
    cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  srcPts.delete(); dstPts.delete(); M.delete();
  return dst;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HANDLE_RADIUS = 14;

const MODE = { NONE: 'none', RAW: 'raw', CLEAN: 'clean' };
const STEP = { MODE: 'mode', SELECT: 'select', CROP: 'crop', PROCESSING: 'proc', DONE: 'done' };

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentScannerModal({ isOpen, onClose, onScanned }) {
  const { cvReady, cvError } = useOpenCV();  // only runs when modal is mounted AND isOpen

  const [mode, setMode]               = useState(MODE.NONE);
  const [step, setStep]               = useState(STEP.MODE);
  const [originalImage, setOriginalImage] = useState(null);
  const [corners, setCorners]         = useState(null);
  const [resultDataUrl, setResultDataUrl] = useState(null);
  const [error, setError]             = useState(null);

  const cropCanvasRef    = useRef(null);
  const cameraVideoRef   = useRef(null);
  const cameraStreamRef  = useRef(null);
  const dragRef          = useRef({ active: false, index: -1 });
  const scaleRef         = useRef({ sx: 1, sy: 1 });

  // ── Reset on close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode(MODE.NONE);
      setStep(STEP.MODE);
      setOriginalImage(null);
      setCorners(null);
      setResultDataUrl(null);
      setError(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redraw canvas when corners/image change ─────────────────────────────────
  useEffect(() => {
    if (step === STEP.CROP && originalImage && cropCanvasRef.current) drawCropCanvas();
  }, [step, originalImage, corners]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera ──────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
    } catch {
      setError('Camera access denied. Use file upload instead.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
  }, []);

  const captureFromCamera = useCallback(() => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    loadImageFromDataUrl(c.toDataURL('image/jpeg', 0.95));
  }, [stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Image loading ────────────────────────────────────────────────────────────
  const loadImageFromFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => loadImageFromDataUrl(e.target.result);
    reader.readAsDataURL(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadImageFromDataUrl = useCallback((dataUrl) => {
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      if (mode === MODE.RAW) {
        // Go to crop step — auto-detect edges
        setStep(STEP.CROP);
        autoDetectCorners(img);
      } else {
        // CLEAN mode — skip all processing, go straight to done preview
        setResultDataUrl(dataUrl);
        setStep(STEP.DONE);
      }
    };
    img.src = dataUrl;
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-detect corners ─────────────────────────────────────────────────────
  const autoDetectCorners = useCallback((img) => {
    if (!cvReady || !window.cv) {
      setCorners(fullCorners(img.naturalWidth, img.naturalHeight));
      return;
    }
    const cv = window.cv;
    const tmp = document.createElement('canvas');
    tmp.width = img.naturalWidth; tmp.height = img.naturalHeight;
    tmp.getContext('2d').drawImage(img, 0, 0);

    const src = cv.imread(tmp);
    const detected = findDocumentCorners(cv, src);
    src.delete();

    setCorners(detected?.length === 4
      ? detected
      : fullCorners(img.naturalWidth, img.naturalHeight, 0.04));
  }, [cvReady]);

  function fullCorners(w, h, inset = 0) {
    const dx = w * inset, dy = h * inset;
    return [
      { x: dx,     y: dy     },
      { x: w - dx, y: dy     },
      { x: w - dx, y: h - dy },
      { x: dx,     y: h - dy },
    ];
  }

  // ── Draw crop canvas ─────────────────────────────────────────────────────────
  const drawCropCanvas = useCallback(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !originalImage) return;

    const maxW = canvas.parentElement?.clientWidth || 680;
    const maxH = window.innerHeight * 0.55;
    const scale = Math.min(maxW / originalImage.naturalWidth, maxH / originalImage.naturalHeight, 1);

    canvas.width  = Math.round(originalImage.naturalWidth  * scale);
    canvas.height = Math.round(originalImage.naturalHeight * scale);
    scaleRef.current = { sx: scale, sy: scale };

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    if (!corners) return;
    const sc = corners.map((p) => ({ x: p.x * scale, y: p.y * scale }));

    // Dark overlay outside quad
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(sc[0].x, sc[0].y);
    sc.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Quad border
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sc[0].x, sc[0].y);
    sc.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();

    // Corner handles
    sc.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = dragRef.current.index === i ? '#2563eb' : '#fff';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(['↖','↗','↘','↙'][i], p.x, p.y);
    });
    ctx.restore();
  }, [originalImage, corners]);

  useEffect(() => {
    const fn = () => { if (step === STEP.CROP) drawCropCanvas(); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [step, drawCropCanvas]);

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const canvasPt = (e, canvas) => {
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
    const canvas = cropCanvasRef.current;
    if (!canvas || !corners) return;
    const pt = canvasPt(e, canvas);
    const { sx, sy } = scaleRef.current;
    let found = -1;
    corners.forEach((c, i) => {
      if (Math.hypot(pt.x - c.x * sx, pt.y - c.y * sy) < HANDLE_RADIUS * 1.8) found = i;
    });
    if (found !== -1) dragRef.current = { active: true, index: found };
  }, [corners]);

  const handlePointerMove = useCallback((e) => {
    e.preventDefault();
    if (!dragRef.current.active || !cropCanvasRef.current || !corners) return;
    const pt = canvasPt(e, cropCanvasRef.current);
    const { sx, sy } = scaleRef.current;
    setCorners((prev) => {
      const next = [...prev];
      next[dragRef.current.index] = {
        x: Math.max(0, Math.min(originalImage.naturalWidth,  pt.x / sx)),
        y: Math.max(0, Math.min(originalImage.naturalHeight, pt.y / sy)),
      };
      return next;
    });
  }, [corners, originalImage]);

  const handlePointerUp = useCallback((e) => {
    e.preventDefault();
    dragRef.current = { active: false, index: -1 };
    drawCropCanvas();
  }, [drawCropCanvas]);

  // ── Perspective warp ─────────────────────────────────────────────────────────
  const handleCrop = useCallback(() => {
    if (!cvReady || !window.cv || !originalImage || !corners) return;
    setStep(STEP.PROCESSING);
    setTimeout(() => {
      try {
        const cv = window.cv;
        const tmp = document.createElement('canvas');
        tmp.width = originalImage.naturalWidth; tmp.height = originalImage.naturalHeight;
        tmp.getContext('2d').drawImage(originalImage, 0, 0);
        const src = cv.imread(tmp);
        const dst = perspectiveWarp(cv, src, corners);
        const out = document.createElement('canvas');
        cv.imshow(out, dst);
        src.delete(); dst.delete();
        setResultDataUrl(out.toDataURL('image/jpeg', 0.95));
        setStep(STEP.DONE);
      } catch (err) {
        setError('Crop failed: ' + err.message);
        setStep(STEP.CROP);
      }
    }, 50);
  }, [cvReady, originalImage, corners]);

  // ── Accept / send back ───────────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!resultDataUrl) return;

    if (mode === MODE.CLEAN) {
      // Already-clean image: send back the original File, not a re-encoded canvas
      // We stored it in originalFile ref
      onScanned(originalFileRef.current);
    } else {
      const res  = await fetch(resultDataUrl);
      const blob = await res.blob();
      onScanned(new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }
    onClose();
  }, [resultDataUrl, mode, onScanned, onClose]);

  // Keep a ref to the original File for CLEAN mode (avoid re-encoding)
  const originalFileRef = useRef(null);

  const loadCleanFile = useCallback((file) => {
    originalFileRef.current = file;
    loadImageFromFile(file);
  }, [loadImageFromFile]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Document Scanner" size="2xl">
      <div className="space-y-4">

        {/* Error */}
        {(error || cvError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <span>⚠</span> {error || cvError}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP: MODE SELECTION  ← the key new screen
            ═══════════════════════════════════════════════ */}
        {step === STEP.MODE && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center pb-1">
              What kind of image are you adding?
            </p>

            {/* RAW PHOTO card */}
            <button
              onClick={() => { setMode(MODE.RAW); setStep(STEP.SELECT); }}
              className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
                <HiOutlineCamera className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Raw Photo (needs cropping)</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Photo taken directly with a phone or camera. The document has a background around it.
                  <span className="text-orange-600 font-medium"> OpenCV will auto-detect edges and let you adjust the crop.</span>
                </div>
              </div>
            </button>

            {/* ALREADY SCANNED card */}
            <button
              onClick={() => { setMode(MODE.CLEAN); setStep(STEP.SELECT); }}
              className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                <HiOutlinePhotograph className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">Already Scanned / Clean Image</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Already processed by CamScanner, a scanner app, or a flatbed scanner.
                  <span className="text-emerald-600 font-medium"> Added directly — no processing, no distortion.</span>
                </div>
              </div>
            </button>

            <p className="text-center text-xs text-gray-400 pt-1">
              Choose correctly — wrong mode on a clean image will distort it
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP: SELECT IMAGE SOURCE
            ═══════════════════════════════════════════════ */}
        {step === STEP.SELECT && (
          <div className="space-y-4">
            {/* Mode badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold w-fit ${
              mode === MODE.RAW
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {mode === MODE.RAW ? <HiOutlineCamera className="w-4 h-4" /> : <HiOutlinePhotograph className="w-4 h-4" />}
              {mode === MODE.RAW ? 'Raw Photo Mode — edges will be detected' : 'Clean Image Mode — no processing'}
            </div>

            {/* Camera (RAW mode only) */}
            {mode === MODE.RAW && (
              <>
                <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: 200 }}>
                  <video
                    ref={cameraVideoRef}
                    autoPlay playsInline muted
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: '45vh' }}
                  />
                  {!cameraStreamRef.current && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/50">
                      <HiOutlineCamera className="w-10 h-10" />
                      <span className="text-xs">Camera not started</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" onClick={startCamera} className="flex items-center justify-center gap-2">
                    <HiOutlineCamera className="w-4 h-4" /> Start Camera
                  </Button>
                  <Button variant="primary" onClick={captureFromCamera} disabled={!cameraStreamRef.current} className="flex items-center justify-center gap-2">
                    <HiOutlineLightningBolt className="w-4 h-4" /> Capture
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">OR upload a photo</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </>
            )}

            {/* File upload */}
            <label className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full py-6 border-2 border-dashed rounded-xl transition-colors
              border-blue-300 text-blue-600 hover:bg-blue-50">
              <HiOutlineUpload className="w-8 h-8" />
              <span className="text-sm font-semibold">
                {mode === MODE.RAW ? 'Upload Raw Photo' : 'Upload Scanned Image'}
              </span>
              <span className="text-xs text-gray-400">JPG, PNG, WebP</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (mode === MODE.CLEAN) loadCleanFile(f);
                  else loadImageFromFile(f);
                }}
              />
            </label>

            <button
              onClick={() => { setStep(STEP.MODE); stopCamera(); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline w-full text-center"
            >
              ← Change mode
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP: CROP (RAW mode only)
            ═══════════════════════════════════════════════ */}
        {step === STEP.CROP && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Drag the <span className="font-semibold text-blue-600">4 corner handles</span> to frame your document.
              </p>
              <button
                onClick={() => autoDetectCorners(originalImage)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <HiOutlineRefresh className="w-4 h-4" /> Re-detect
              </button>
            </div>

            <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-slate-900 select-none touch-none cursor-crosshair">
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

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button variant="secondary" onClick={() => { setStep(STEP.SELECT); setOriginalImage(null); setCorners(null); }}>
                ← Back
              </Button>
              <Button variant="primary" onClick={handleCrop} disabled={!cvReady || !corners} className="flex items-center gap-2">
                <HiOutlineCheck className="w-5 h-5" />
                {cvReady ? 'Crop & Warp' : 'Loading OpenCV…'}
              </Button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP: PROCESSING
            ═══════════════════════════════════════════════ */}
        {step === STEP.PROCESSING && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <svg className="animate-spin w-12 h-12 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-sm font-medium text-gray-600">Applying perspective correction…</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP: DONE — preview
            ═══════════════════════════════════════════════ */}
        {step === STEP.DONE && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border ${
              mode === MODE.CLEAN
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <HiOutlineCheck className="w-4 h-4 shrink-0" />
              {mode === MODE.CLEAN
                ? 'Clean image loaded — no processing applied, original quality preserved'
                : 'Document cropped and perspective-corrected'}
            </div>

            <div className="rounded-xl overflow-hidden border border-gray-200 bg-slate-100 flex items-center justify-center p-3" style={{ maxHeight: '55vh' }}>
              <img
                src={resultDataUrl}
                alt="Scanned document"
                className="max-h-full max-w-full object-contain rounded shadow"
                style={{ maxHeight: '50vh' }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  if (mode === MODE.RAW) { setStep(STEP.CROP); setResultDataUrl(null); }
                  else { setStep(STEP.SELECT); setOriginalImage(null); setResultDataUrl(null); }
                }}
              >
                ← {mode === MODE.RAW ? 'Adjust Crop' : 'Choose Different'}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => { setStep(STEP.MODE); setMode(MODE.NONE); setOriginalImage(null); setCorners(null); setResultDataUrl(null); }}
                >
                  Scan Another
                </Button>
                <Button variant="primary" onClick={handleAccept} className="flex items-center gap-2">
                  <HiOutlineCheck className="w-5 h-5" />
                  Use This Scan
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
