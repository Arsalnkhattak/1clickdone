import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import toast from 'react-hot-toast';

import ScannerHeader from './components/ScannerHeader';
import ScannerControlBar from './components/ScannerControlBar';
import SourceCanvasPanel from './components/SourceCanvasPanel';
import OutputCanvasPanel from './components/OutputCanvasPanel';
import SavedScansGallery from './components/SavedScansGallery';

import {
  isCvReady,
  canvasToMat,
  autoDetectDocumentCorners,
  warpAndFilterDocument,
  defaultCorners,
} from './utils/scannerCvEngine';
import {
  generateSampleProposal,
  generateSampleCNIC,
} from './utils/sampleGenerators';

const API_BASE = '/api/documents';
const DIRECT_API_BASE = 'http://localhost:5000/api/documents';

export default function DocumentScanner() {
  const [cvReady, setCvReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [aspectPreset, setAspectPreset] = useState('free'); // free, a4, cnic, receipt
  const [filterMode, setFilterMode] = useState('magic'); // magic, bw, grayscale, original
  const [ocrText, setOcrText] = useState('');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDocs, setSavedDocs] = useState([]);

  const srcCanvasRef = useRef(null);
  const dstCanvasRef = useRef(null);
  const loupeCanvasRef = useRef(null);
  const imgRef = useRef(new Image());
  const originalMatRef = useRef(null);
  const scanRafRef = useRef(null);

  const activeHandleRef = useRef(-1);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const initialCornersRef = useRef([]);

  // 4 Corner Vertices: [TL, TR, BR, BL]
  const [corners, setCorners] = useState([
    { x: 50, y: 50 },
    { x: 350, y: 50 },
    { x: 350, y: 450 },
    { x: 50, y: 450 },
  ]);

  // Check OpenCV WASM Ready Status
  useEffect(() => {
    if (isCvReady()) {
      setCvReady(true);
    } else {
      const checkOpenCV = setInterval(() => {
        if (isCvReady()) {
          setCvReady(true);
          clearInterval(checkOpenCV);
        }
      }, 200);
      return () => clearInterval(checkOpenCV);
    }
  }, []);

  // Fetch saved database scans on mount
  const fetchSavedDocs = useCallback(async () => {
    try {
      let res = await fetch(API_BASE);
      if (!res.ok) res = await fetch(DIRECT_API_BASE);
      const data = await res.json();
      if (data.success) setSavedDocs(data.data);
    } catch (e) {
      try {
        const res2 = await fetch(DIRECT_API_BASE);
        const data2 = await res2.json();
        if (data2.success) setSavedDocs(data2.data);
      } catch (err) {
        console.warn('Backend documents API unavailable:', err.message);
      }
    }
  }, []);

  useEffect(() => {
    fetchSavedDocs();
  }, [fetchSavedDocs]);

  // Initialize Source Canvas from Loaded Image
  const initCanvas = useCallback(() => {
    const canvas = srcCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    if (originalMatRef.current) {
      try {
        originalMatRef.current.delete();
      } catch (e) {}
    }
    originalMatRef.current = canvasToMat(canvas);
  }, []);

  // Dual Engine Auto Paper Edge Detector
  const handleAutoDetectCorners = useCallback(() => {
    const canvas = srcCanvasRef.current;
    const w = canvas ? canvas.width : 800;
    const h = canvas ? canvas.height : 600;

    const detected = autoDetectDocumentCorners(originalMatRef.current, w, h);
    setCorners(detected);
    toast.success('Auto edge boundaries detected!');
  }, []);

  // Image Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = imgRef.current;
      img.onload = () => {
        initCanvas();
        handleAutoDetectCorners();
        setImageLoaded(true);
        toast.success('Image loaded successfully');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Sample Documents Handlers
  const handleLoadSampleDoc = () => {
    const sample = generateSampleProposal();
    const img = imgRef.current;
    img.onload = () => {
      initCanvas();
      setCorners(sample.corners);
      setAspectPreset(sample.aspectPreset);
      setImageLoaded(true);
      toast.success('Sample Project Proposal loaded!');
    };
    img.src = sample.dataUrl;
  };

  const handleLoadSampleCNIC = () => {
    const sample = generateSampleCNIC();
    const img = imgRef.current;
    img.onload = () => {
      initCanvas();
      setCorners(sample.corners);
      setAspectPreset(sample.aspectPreset);
      setImageLoaded(true);
      toast.success('Sample CNIC loaded!');
    };
    img.src = sample.dataUrl;
  };

  // Scheduled Homography Perspective Warp (RAF-optimized for 60fps responsiveness)
  useEffect(() => {
    if (!imageLoaded) return;

    if (scanRafRef.current) cancelAnimationFrame(scanRafRef.current);
    scanRafRef.current = requestAnimationFrame(() => {
      warpAndFilterDocument({
        sourceMat: originalMatRef.current,
        dstCanvas: dstCanvasRef.current,
        corners,
        aspectPreset,
        filterMode,
      });
    });

    return () => {
      if (scanRafRef.current) cancelAnimationFrame(scanRafRef.current);
    };
  }, [corners, filterMode, aspectPreset, imageLoaded]);

  // OCR Extraction with Tesseract.js
  const handleRunOCR = async () => {
    if (!dstCanvasRef.current) return;
    setIsOcrProcessing(true);
    setOcrText('Scanning text with Tesseract engine...');

    try {
      const dataUrl = dstCanvasRef.current.toDataURL('image/png');
      const result = await Tesseract.recognize(dataUrl, 'eng');
      const text = result.data.text?.trim() || 'No text detected.';
      setOcrText(text);
      toast.success('OCR text extraction complete!');
    } catch (e) {
      setOcrText('OCR Failed: ' + (e.message || 'Error occurred'));
      toast.error('OCR Extraction failed');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Save Document to Database
  const handleSaveDocument = async () => {
    if (!dstCanvasRef.current) return;
    setIsSaving(true);

    dstCanvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        setIsSaving(false);
        return;
      }
      const formData = new FormData();
      formData.append('scanned_image', blob, 'scan.png');
      formData.append('title', `Scan ${new Date().toLocaleTimeString()}`);
      formData.append('ocrText', ocrText);
      formData.append('aspectPreset', aspectPreset);
      formData.append('filterMode', filterMode);

      try {
        let res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          res = await fetch(`${DIRECT_API_BASE}/upload`, {
            method: 'POST',
            body: formData,
          });
        }
        const data = await res.json();
        if (data.success) {
          fetchSavedDocs();
          toast.success('Document saved to database!');
        } else {
          toast.error(data.message || 'Failed to save document');
        }
      } catch (e) {
        toast.error('Could not connect to database backend');
      } finally {
        setIsSaving(false);
      }
    }, 'image/png');
  };

  // Delete Document
  const handleDeleteDocument = async (id) => {
    try {
      let res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok) res = await fetch(`${DIRECT_API_BASE}/${id}`, { method: 'DELETE' });
      fetchSavedDocs();
      toast.success('Document removed');
    } catch (e) {
      toast.error('Failed to delete document');
    }
  };

  // Download local PNG
  const handleDownloadScan = () => {
    if (!dstCanvasRef.current) return;
    const a = document.createElement('a');
    a.download = `scan-${Date.now()}.png`;
    a.href = dstCanvasRef.current.toDataURL('image/png');
    a.click();
    toast.success('Download initiated');
  };

  // 8-Point Handle Drag Engine
  const handlePointerDown = (e, idx) => {
    activeHandleRef.current = idx;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialCornersRef.current = corners.map((pt) => ({ ...pt }));
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
        // Corner handle (0: TL, 1: TR, 2: BR, 3: BL)
        next[idx] = {
          x: Math.max(0, Math.min(canvas.width, init[idx].x + deltaX)),
          y: Math.max(0, Math.min(canvas.height, init[idx].y + deltaY)),
        };
      } else {
        // Midpoint handle (translates both adjacent corners)
        let c1, c2;
        if (idx === 4) { c1 = 0; c2 = 1; }      // Top Mid
        else if (idx === 5) { c1 = 1; c2 = 2; } // Right Mid
        else if (idx === 6) { c1 = 2; c2 = 3; } // Bottom Mid
        else if (idx === 7) { c1 = 3; c2 = 0; } // Left Mid

        next[c1] = {
          x: Math.max(0, Math.min(canvas.width, init[c1].x + deltaX)),
          y: Math.max(0, Math.min(canvas.height, init[c1].y + deltaY)),
        };
        next[c2] = {
          x: Math.max(0, Math.min(canvas.width, init[c2].x + deltaX)),
          y: Math.max(0, Math.min(canvas.height, init[c2].y + deltaY)),
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
    ctx.moveTo(60, 0);
    ctx.lineTo(60, 120);
    ctx.moveTo(0, 60);
    ctx.lineTo(120, 60);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    activeHandleRef.current = -1;
    if (loupeCanvasRef.current) loupeCanvasRef.current.style.display = 'none';
  };

  // Midpoints calculation
  const midpoints = [
    { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 },
    { x: (corners[1].x + corners[2].x) / 2, y: (corners[1].y + corners[2].y) / 2 },
    { x: (corners[2].x + corners[3].x) / 2, y: (corners[2].y + corners[3].y) / 2 },
    { x: (corners[3].x + corners[0].x) / 2, y: (corners[3].y + corners[0].y) / 2 },
  ];

  return (
    <div
      className="max-w-7xl mx-auto p-4 space-y-4"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <ScannerHeader
        onUploadFile={handleFileUpload}
      />

      <ScannerControlBar
        aspectPreset={aspectPreset}
        setAspectPreset={setAspectPreset}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SourceCanvasPanel
          srcCanvasRef={srcCanvasRef}
          loupeCanvasRef={loupeCanvasRef}
          imageLoaded={imageLoaded}
          corners={corners}
          midpoints={midpoints}
          onAutoDetectCorners={handleAutoDetectCorners}
          onPointerDown={handlePointerDown}
          onUploadFile={handleFileUpload}
        />

        <OutputCanvasPanel
          dstCanvasRef={dstCanvasRef}
          imageLoaded={imageLoaded}
          isOcrProcessing={isOcrProcessing}
          isSaving={isSaving}
          ocrText={ocrText}
          setOcrText={setOcrText}
          onRunOCR={handleRunOCR}
          onSaveDocument={handleSaveDocument}
          onDownloadScan={handleDownloadScan}
        />
      </div>

      <SavedScansGallery
        savedDocs={savedDocs}
        onRefresh={fetchSavedDocs}
        onDeleteDocument={handleDeleteDocument}
      />
    </div>
  );
}
