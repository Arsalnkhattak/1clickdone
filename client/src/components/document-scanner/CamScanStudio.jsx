import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { 
  Upload, Camera, Sparkles, FileText, Download, 
  CreditCard, File, Receipt, RefreshCw, Save, Trash2, Check,
  FileCheck, Eye
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/documents';

export default function CamScanStudio() {
  const [cvReady, setCvReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [aspectPreset, setAspectPreset] = useState('free'); // free, a4, cnic, receipt
  const [filterMode, setFilterMode] = useState('magic');   // magic, bw, grayscale, original
  const [ocrText, setOcrText] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDocs, setSavedDocs] = useState([]);

  const srcCanvasRef = useRef(null);
  const dstCanvasRef = useRef(null);
  const loupeCanvasRef = useRef(null);
  const imgRef = useRef(new Image());
  const originalMatRef = useRef(null);

  const activeHandleRef = useRef(-1);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const initialCornersRef = useRef([]);

  // 4 Corner Vertices: [TL, TR, BR, BL]
  const [corners, setCorners] = useState([
    { x: 50, y: 50 },
    { x: 350, y: 50 },
    { x: 350, y: 450 },
    { x: 50, y: 450 }
  ]);

  // Check OpenCV WASM Ready Status
  useEffect(() => {
    const checkOpenCV = setInterval(() => {
      if (window.cv && window.cv.Mat) {
        setCvReady(true);
        clearInterval(checkOpenCV);
      }
    }, 200);
    fetchSavedDocs();
    return () => clearInterval(checkOpenCV);
  }, []);

  const fetchSavedDocs = async () => {
    try {
      let res = await fetch(API_BASE);
      if (!res.ok) res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) setSavedDocs(data.data);
    } catch (e) {
      try {
        const res2 = await fetch('/api/documents');
        const data2 = await res2.json();
        if (data2.success) setSavedDocs(data2.data);
      } catch (err) {
        console.warn('API connection offline:', err);
      }
    }
  };

  // Image Upload Listener
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = imgRef.current;
      img.onload = () => {
        initCanvas();
        autoDetectCorners();
        setImageLoaded(true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Initialize Source Canvas
  const initCanvas = () => {
    const canvas = srcCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    if (window.cv) {
      if (originalMatRef.current) originalMatRef.current.delete();
      try {
        originalMatRef.current = window.cv.imread(canvas);
      } catch (e) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        originalMatRef.current = window.cv.matFromImageData(imgData);
      }
    }
  };

  // Dual Engine Auto Paper Edge Detector
  const autoDetectCorners = () => {
    if (!window.cv || !originalMatRef.current) return;
    const cv = window.cv;
    const mat = originalMatRef.current;
    const w = mat.cols;
    const h = mat.rows;

    let detected = [
      { x: w * 0.05, y: h * 0.05 },
      { x: w * 0.95, y: h * 0.05 },
      { x: w * 0.95, y: h * 0.95 },
      { x: w * 0.05, y: h * 0.95 }
    ];

    try {
      let gray = new cv.Mat();
      let blur = new cv.Mat();
      let thresh = new cv.Mat();
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();

      cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
      cv.threshold(blur, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let maxArea = 0;
      let maxPoly = null;

      for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i);
        let area = cv.contourArea(cnt);
        if (area > w * h * 0.12) {
          let peri = cv.arcLength(cnt, true);
          let approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

          if (approx.rows === 4 && area > maxArea) {
            maxArea = area;
            maxPoly = approx;
          }
        }
      }

      if (maxPoly) {
        let pts = [];
        for (let i = 0; i < 4; i++) {
          pts.push({ x: maxPoly.data32S[i * 2], y: maxPoly.data32S[i * 2 + 1] });
        }
        pts.sort((a, b) => a.y - b.y);
        let top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
        let bottom = pts.slice(2, 4).sort((a, b) => b.x - a.x);
        detected = [top[0], top[1], bottom[0], bottom[1]];
      }

      gray.delete(); blur.delete(); thresh.delete(); contours.delete(); hierarchy.delete();
    } catch (err) {
      console.warn('Auto Detection Fallback:', err);
    }

    setCorners(detected);
  };

  // Re-run Homography Perspective Warp
  useEffect(() => {
    if (imageLoaded) {
      processScan();
    }
  }, [corners, filterMode, aspectPreset, imageLoaded]);

  const processScan = () => {
    if (!window.cv || !originalMatRef.current || !dstCanvasRef.current) return;
    const cv = window.cv;
    const mat = originalMatRef.current;

    let w1 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
    let w2 = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
    let outWidth = Math.max(w1, w2);

    let h1 = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
    let h2 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
    let outHeight = Math.max(h1, h2);

    if (outWidth <= 0 || outHeight <= 0) return;

    // Force Aspect Ratio Presets
    if (aspectPreset === 'a4') outHeight = outWidth * 1.414;
    else if (aspectPreset === 'cnic') outHeight = outWidth / 1.586;
    else if (aspectPreset === 'receipt') outHeight = outWidth * 2.2;

    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      corners[0].x, corners[0].y,
      corners[1].x, corners[1].y,
      corners[2].x, corners[2].y,
      corners[3].x, corners[3].y
    ]);

    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      outWidth, 0,
      outWidth, outHeight,
      0, outHeight
    ]);

    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    let warped = new cv.Mat();
    cv.warpPerspective(mat, warped, M, new cv.Size(outWidth, outHeight));

    let finalOutput = new cv.Mat();
    if (filterMode === 'magic') {
      let gray = new cv.Mat();
      cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
      cv.adaptiveThreshold(gray, finalOutput, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 10);
      gray.delete();
    } else if (filterMode === 'grayscale') {
      cv.cvtColor(warped, finalOutput, cv.COLOR_RGBA2GRAY);
    } else if (filterMode === 'bw') {
      let gray = new cv.Mat();
      cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
      cv.threshold(gray, finalOutput, 128, 255, cv.THRESH_BINARY);
      gray.delete();
    } else {
      finalOutput = warped.clone();
    }

    cv.imshow(dstCanvasRef.current, finalOutput);

    srcTri.delete(); dstTri.delete(); M.delete(); warped.delete(); finalOutput.delete();
  };

  // OCR Extraction
  const runOCR = async () => {
    if (!dstCanvasRef.current) return;
    setIsOcrProcessing(true);
    setOcrText('Scanning text...');

    try {
      const dataUrl = dstCanvasRef.current.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      setOcrText(result.data.text || 'No text found.');
    } catch (e) {
      setOcrText('OCR Failed: ' + (e.message || 'error'));
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Save Document to MongoDB Backend
  const saveDocument = async () => {
    if (!dstCanvasRef.current) return;
    setIsSaving(true);

    dstCanvasRef.current.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('scanned_image', blob, 'scan.png');
      formData.append('title', `Scan ${new Date().toLocaleTimeString()}`);
      formData.append('ocrText', ocrText);
      formData.append('aspectPreset', aspectPreset);
      formData.append('filterMode', filterMode);

      try {
        let res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
          res = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData
          });
        }
        const data = await res.json();
        if (data.success) {
          fetchSavedDocs();
          alert('Document saved to database!');
        } else {
          alert(data.message || 'Failed to save document');
        }
      } catch (e) {
        try {
          const res2 = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData
          });
          const data2 = await res2.json();
          if (data2.success) {
            fetchSavedDocs();
            alert('Document saved to database!');
            return;
          }
        } catch (err) {}
        alert('Failed to connect to backend.');
      } finally {
        setIsSaving(false);
      }
    }, 'image/png');
  };

  // Delete Document
  const deleteDocument = async (id) => {
    try {
      let res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      fetchSavedDocs();
    } catch (e) {
      try {
        await fetch(`/api/documents/${id}`, { method: 'DELETE' });
        fetchSavedDocs();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Download local copy
  const downloadScan = () => {
    if (!dstCanvasRef.current) return;
    const a = document.createElement('a');
    a.download = `camscan-${Date.now()}.png`;
    a.href = dstCanvasRef.current.toDataURL('image/png');
    a.click();
  };

  // 8 Handles Pointer Drag Handlers
  const handlePointerDown = (e, idx) => {
    activeHandleRef.current = idx;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialCornersRef.current = corners.map(pt => ({ ...pt }));
    if (loupeCanvasRef.current) loupeCanvasRef.current.style.display = 'block';
  };

  const handlePointerMove = (e) => {
    if (activeHandleRef.current === -1 || !srcCanvasRef.current) return;

    const canvas = srcCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const deltaX = (e.clientX - dragStartPosRef.current.x) * scaleX;
    const deltaY = (e.clientY - dragStartPosRef.current.y) * scaleY;

    const idx = activeHandleRef.current;
    const init = initialCornersRef.current;

    setCorners(() => {
      const next = [...init];
      if (idx < 4) {
        // Corner handle
        next[idx] = {
          x: Math.max(0, Math.min(canvas.width, init[idx].x + deltaX)),
          y: Math.max(0, Math.min(canvas.height, init[idx].y + deltaY))
        };
      } else {
        // Midpoint handle (Translates both adjacent corners)
        let c1, c2;
        if (idx === 4) { c1 = 0; c2 = 1; }      // Top Mid
        else if (idx === 5) { c1 = 1; c2 = 2; } // Right Mid
        else if (idx === 6) { c1 = 2; c2 = 3; } // Bottom Mid
        else if (idx === 7) { c1 = 3; c2 = 0; } // Left Mid

        next[c1] = {
          x: Math.max(0, Math.min(canvas.width, init[c1].x + deltaX)),
          y: Math.max(0, Math.min(canvas.height, init[c1].y + deltaY))
        };
        next[c2] = {
          x: Math.max(0, Math.min(canvas.width, init[c2].x + deltaX)),
          y: Math.max(0, Math.min(canvas.height, init[c2].y + deltaY))
        };
      }
      return next;
    });

    updateLoupe(e);
  };

  const updateLoupe = (e) => {
    const srcCanvas = srcCanvasRef.current;
    const loupe = loupeCanvasRef.current;
    if (!srcCanvas || !loupe) return;

    const ctx = loupe.getContext('2d');
    const rect = srcCanvas.getBoundingClientRect();

    const scaleX = srcCanvas.width / rect.width;
    const scaleY = srcCanvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    loupe.style.left = `${e.clientX - rect.left - 60}px`;
    loupe.style.top = `${e.clientY - rect.top - 80}px`;

    ctx.clearRect(0, 0, 120, 120);
    ctx.drawImage(srcCanvas, mouseX - 24, mouseY - 24, 48, 48, 0, 0, 120, 120);

    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 0); ctx.lineTo(60, 120);
    ctx.moveTo(0, 60); ctx.lineTo(120, 60);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    activeHandleRef.current = -1;
    if (loupeCanvasRef.current) loupeCanvasRef.current.style.display = 'none';
  };

  // Sample Documents Loaders
  const loadSampleDoc = () => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 1500;
    const ctx = c.getContext('2d');

    // Patterned background
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

    // Tilted A4 Document Paper Sheet
    ctx.save();
    ctx.translate(600, 750);
    ctx.rotate(-0.12);

    const docW = 750, docH = 1050;
    const x = -docW / 2, y = -docH / 2;

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
    ctx.moveTo(x + 50, y + 190); ctx.lineTo(x + docW - 50, y + 190); ctx.stroke();

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
      'Verified by Computer Vision Engine | Date: ' + new Date().toLocaleDateString()
    ];
    let curY = y + 230;
    lines.forEach(l => {
      ctx.fillText(l, x + 50, curY);
      curY += 32;
    });

    ctx.restore();

    const img = imgRef.current;
    img.onload = () => {
      initCanvas();
      const rad = -0.12;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const cornersRel = [
        { x: -docW/2, y: -docH/2 },
        { x: docW/2, y: -docH/2 },
        { x: docW/2, y: docH/2 },
        { x: -docW/2, y: docH/2 },
      ];
      const pts = cornersRel.map(pt => ({
        x: Math.round(600 + pt.x * cos - pt.y * sin),
        y: Math.round(750 + pt.x * sin + pt.y * cos)
      }));
      setCorners(pts);
      setAspectPreset('a4');
      setImageLoaded(true);
    };
    img.src = c.toDataURL('image/png');
  };

  const loadSampleCNIC = () => {
    const c = document.createElement('canvas');
    c.width = 1000;
    c.height = 700;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.save();
    ctx.translate(500, 350);
    ctx.rotate(-0.08);

    const cardW = 700, cardH = 440;
    const x = -cardW / 2, y = -cardH / 2;

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

    const img = imgRef.current;
    img.onload = () => {
      initCanvas();
      const rad = -0.08;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const cornersRel = [
        { x: -cardW/2, y: -cardH/2 },
        { x: cardW/2, y: -cardH/2 },
        { x: cardW/2, y: cardH/2 },
        { x: -cardW/2, y: cardH/2 },
      ];
      const pts = cornersRel.map(pt => ({
        x: Math.round(500 + pt.x * cos - pt.y * sin),
        y: Math.round(350 + pt.x * sin + pt.y * cos)
      }));
      setCorners(pts);
      setAspectPreset('cnic');
      setImageLoaded(true);
    };
    img.src = c.toDataURL('image/png');
  };

  // Midpoint calculations
  const midpoints = [
    { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 },
    { x: (corners[1].x + corners[2].x) / 2, y: (corners[1].y + corners[2].y) / 2 },
    { x: (corners[2].x + corners[3].x) / 2, y: (corners[2].y + corners[3].y) / 2 },
    { x: (corners[3].x + corners[0].x) / 2, y: (corners[3].y + corners[0].y) / 2 }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      
      {/* App Header */}
      <div className="flex flex-wrap justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Sparkles size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              CamScan Auto AI & Deskew Studio
            </h1>
            <p className="text-xs text-slate-400">Auto Edge Detection, Perspective Homography & Midpoint Edge Resize</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            8-POINT CROP & STRAIGHTEN
          </span>
          <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${cvReady ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
            {cvReady ? '✓ OpenCV.js Ready' : 'Loading OpenCV...'}
          </span>
          <button
            onClick={loadSampleDoc}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <FileText size={13} /> Try Sample Proposal
          </button>
          <button
            onClick={loadSampleCNIC}
            className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <CreditCard size={13} /> Try Sample CNIC
          </button>
          <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg cursor-pointer text-xs font-bold transition flex items-center gap-1.5 shadow-lg">
            <Upload size={14} /> Upload Image(s)
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Control Bars: Format Aspect & Filters */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between text-xs">
        
        {/* Format Aspect Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Format Aspect:</span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 flex-wrap gap-1">
            <button onClick={() => setAspectPreset('free')} className={`px-3 py-1.5 rounded-md font-medium transition ${aspectPreset === 'free' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Auto Free
            </button>
            <button onClick={() => setAspectPreset('a4')} className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 ${aspectPreset === 'a4' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <File size={12} /> A4 Document
            </button>
            <button onClick={() => setAspectPreset('cnic')} className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 ${aspectPreset === 'cnic' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <CreditCard size={12} /> CNIC Card (1.58:1)
            </button>
            <button onClick={() => setAspectPreset('receipt')} className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 ${aspectPreset === 'receipt' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Receipt size={12} /> Receipt
            </button>
          </div>
        </div>

        {/* Filter Modes */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Filter Mode:</span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 flex-wrap gap-1">
            <button onClick={() => setFilterMode('magic')} className={`px-3 py-1.5 rounded-md font-medium transition ${filterMode === 'magic' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              ✨ Magic Color
            </button>
            <button onClick={() => setFilterMode('bw')} className={`px-3 py-1.5 rounded-md font-medium transition ${filterMode === 'bw' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              B&W Clean
            </button>
            <button onClick={() => setFilterMode('grayscale')} className={`px-3 py-1.5 rounded-md font-medium transition ${filterMode === 'grayscale' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Grayscale
            </button>
            <button onClick={() => setFilterMode('original')} className={`px-3 py-1.5 rounded-md font-medium transition ${filterMode === 'original' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Original
            </button>
          </div>
        </div>

      </div>

      {/* Main Canvas Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Source Image View (With 8 Drag Handles & Loupe) */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Original Photo (Drag 8 Handles)</h3>
            <button onClick={autoDetectCorners} className="text-xs text-emerald-400 flex items-center gap-1 hover:underline">
              <RefreshCw size={12} /> Auto Edge Snap
            </button>
          </div>

          <div className="relative inline-block w-full min-h-[360px] overflow-hidden rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
            {!imageLoaded && (
              <div className="p-8 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Upload size={28} />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">No Image Loaded</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Upload an image from your device or test instantly with one of the sample templates above.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={loadSampleDoc}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1"
                  >
                    <FileText size={13} /> Try Sample Proposal
                  </button>
                  <button
                    onClick={loadSampleCNIC}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1 border border-slate-700"
                  >
                    <CreditCard size={13} /> Try CNIC
                  </button>
                </div>
              </div>
            )}

            <canvas ref={srcCanvasRef} className={`max-w-full h-auto block mx-auto ${!imageLoaded ? 'hidden' : ''}`} />

            {/* Polygon Boundary Overlay */}
            {imageLoaded && srcCanvasRef.current && (
              <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <polygon
                  points={corners.map((p) => {
                    const canvas = srcCanvasRef.current;
                    const scaleX = canvas.clientWidth / canvas.width;
                    const scaleY = canvas.clientHeight / canvas.height;
                    return `${p.x * scaleX},${p.y * scaleY}`;
                  }).join(' ')}
                  fill="rgba(16, 185, 129, 0.2)"
                  stroke="#10B981"
                  strokeWidth="2"
                />
              </svg>
            )}

            {/* Render 4 Corner Handles (Green) */}
            {imageLoaded && corners.map((p, idx) => {
              const canvas = srcCanvasRef.current;
              if (!canvas) return null;
              const scaleX = canvas.clientWidth / canvas.width;
              const scaleY = canvas.clientHeight / canvas.height;

              return (
                <div
                  key={`corner-${idx}`}
                  onPointerDown={(e) => handlePointerDown(e, idx)}
                  style={{
                    left: `${p.x * scaleX}px`,
                    top: `${p.y * scaleY}px`,
                    position: 'absolute',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#10B981',
                    border: '2px solid white',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'move',
                    zIndex: 20
                  }}
                />
              );
            })}

            {/* Render 4 Edge Midpoint Handles (Blue) */}
            {imageLoaded && midpoints.map((p, idx) => {
              const canvas = srcCanvasRef.current;
              if (!canvas) return null;
              const scaleX = canvas.clientWidth / canvas.width;
              const scaleY = canvas.clientHeight / canvas.height;

              return (
                <div
                  key={`mid-${idx}`}
                  onPointerDown={(e) => handlePointerDown(e, idx + 4)}
                  style={{
                    left: `${p.x * scaleX}px`,
                    top: `${p.y * scaleY}px`,
                    position: 'absolute',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#3B82F6',
                    border: '2px solid white',
                    borderRadius: '3px',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'move',
                    zIndex: 20
                  }}
                />
              );
            })}

            {/* Dynamic Magnifying Loupe Lens */}
            <canvas
              ref={loupeCanvasRef}
              width="120"
              height="120"
              className="absolute pointer-events-none rounded-full border-2 border-emerald-400 shadow-2xl hidden z-30"
            />
          </div>
        </div>

        {/* Destination View (Flattened Scan + OCR Panel) */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Scanned & Straightened Output</h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadScan}
                  disabled={!imageLoaded}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1"
                >
                  <Download size={12} /> Download
                </button>
                <button
                  onClick={runOCR}
                  disabled={isOcrProcessing || !imageLoaded}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1"
                >
                  <FileText size={12} /> {isOcrProcessing ? 'Extracting...' : 'Extract OCR'}
                </button>
                <button
                  onClick={saveDocument}
                  disabled={isSaving || !imageLoaded}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1"
                >
                  <Save size={12} /> Save Scan
                </button>
              </div>
            </div>

            <div className="w-full min-h-[360px] overflow-hidden rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
              {!imageLoaded ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Transformed and deskewed result will appear here.
                </div>
              ) : (
                <canvas ref={dstCanvasRef} className="max-w-full h-auto block mx-auto" />
              )}
            </div>
          </div>

          {/* OCR Result Box */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <label className="text-xs font-bold text-purple-400 mb-1 block">Extracted OCR Text:</label>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              rows={3}
              placeholder="OCR extracted text will appear here..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

      </div>

      {/* Saved Database Scans */}
      {savedDocs.length > 0 && (
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Scans in Database ({savedDocs.length})</h3>
            <button
              onClick={fetchSavedDocs}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {savedDocs.map((doc) => (
              <div key={doc._id} className="bg-slate-950 p-2 rounded border border-slate-800 relative group">
                <img 
                  src={doc.imageUrl?.startsWith('http') ? doc.imageUrl : `http://localhost:5000${doc.imageUrl}`} 
                  alt="Scan" 
                  className="w-full h-24 object-cover rounded mb-1"
                  onError={(e) => {
                    if (!e.target.src.includes(doc.imageUrl)) {
                      e.target.src = doc.imageUrl;
                    }
                  }}
                />
                <p className="text-[10px] text-slate-300 truncate font-medium">{doc.title}</p>
                <p className="text-[9px] text-slate-500 capitalize">{doc.aspectPreset || 'Free'} • {doc.filterMode || 'Magic'}</p>
                <button
                  onClick={() => deleteDocument(doc._id)}
                  title="Delete scan"
                  className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
