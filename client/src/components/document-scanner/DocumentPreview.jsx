import React, { useState } from 'react';
import {
  HiOutlineZoomIn,
  HiOutlineZoomOut,
  HiOutlineArrowsExpand,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineScissors,
  HiOutlineEye,
  HiOutlineSparkles,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineViewBoards,
} from 'react-icons/hi';
import DocumentCropper from './DocumentCropper';
import Button from '../ui/Button';

export default function DocumentPreview({
  activeDocument,
  currentIndex,
  totalCount,
  onPreviousPage,
  onNextPage,
  onUpdateCorners,
  onAutoDetectCorners,
  onResetCorners,
  onApplyCrop,
  onAutoStraighten,
  onRotate,
  onUpdateSettings,
  onOpenOcr,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);
  const [viewMode, setViewMode] = useState('dual'); // 'dual', 'crop', 'scan'

  if (!activeDocument) {
    return (
      <div className="bg-slate-900/5 rounded-2xl border-2 border-dashed border-gray-300 h-96 flex flex-col items-center justify-center text-center p-6 text-gray-400">
        <HiOutlineEye className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-sm font-semibold text-gray-600">No document selected</p>
        <p className="text-xs text-gray-400 mt-1">Upload or capture photos to preview and scan.</p>
      </div>
    );
  }

  const previewSrc = showOriginal
    ? activeDocument.originalDataUrl
    : activeDocument.processedDataUrl || activeDocument.originalDataUrl;

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const handleResetZoom = () => setZoomLevel(1);

  const activePreset = activeDocument.preset || 'auto';
  const straightenAngle = activeDocument.straightenAngle || 0;

  return (
    <div className="space-y-3">
      {/* 1. Format Aspect & Filter Mode Bar */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-3 shadow-md space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Format Aspect Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Format Aspect:
            </span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs gap-1">
              {[
                { id: 'auto', label: 'Auto Free', icon: '⚡' },
                { id: 'a4', label: 'A4 Document', icon: '📄' },
                { id: 'cnic', label: 'CNIC Card (1.58:1)', icon: '🪪' },
                { id: 'receipt', label: 'Receipt', icon: '🧾' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onUpdateSettings?.({ preset: p.id })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    activePreset === p.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-1">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* OCR Quick Launcher */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenOcr}
              className="flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            >
              <HiOutlineDocumentText className="w-4 h-4 text-emerald-400" />
              <span>Extract Text (OCR)</span>
            </Button>
          </div>
        </div>

        {/* 2. Straighten / Deskew & Rotation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <HiOutlineRefresh className="w-3.5 h-3.5 text-emerald-400" />
              Straighten / Deskew:
            </span>

            <button
              type="button"
              onClick={onAutoStraighten}
              className="px-3 py-1 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white text-xs shadow flex items-center gap-1 transition"
              title="Automatically calculate tilt angle and align document horizontally"
            >
              <HiOutlineSparkles className="w-3.5 h-3.5" />
              Auto Straighten
            </button>

            <button
              type="button"
              onClick={() => onRotate?.(-90)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              title="Rotate 90 degrees left"
            >
              -90°
            </button>

            <button
              type="button"
              onClick={() => onRotate?.(90)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              title="Rotate 90 degrees right"
            >
              +90°
            </button>

            {/* Fine Angle Slider */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
              <span className="text-[11px] font-mono text-emerald-400 w-9 text-right font-bold">
                {straightenAngle > 0 ? `+${straightenAngle}` : straightenAngle}°
              </span>
              <input
                type="range"
                min="-45"
                max="45"
                step="0.5"
                value={straightenAngle}
                onChange={(e) => onUpdateSettings?.({ straightenAngle: parseFloat(e.target.value) })}
                className="w-24 accent-emerald-500 cursor-pointer"
                title="Fine tilt angle adjust (-45° to +45°)"
              />
              {straightenAngle !== 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateSettings?.({ straightenAngle: 0 })}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Quick Corner Re-Detect */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAutoDetectCorners}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium"
            >
              Re-Detect Quad
            </button>
            <button
              type="button"
              onClick={onResetCorners}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium"
            >
              Full Inset Box
            </button>
          </div>
        </div>
      </div>

      {/* 3. Navigation & Mode Switcher Bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        {/* Navigation & Page counter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={onPreviousPage}
              className="p-1 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
              title="Previous page"
            >
              <HiOutlineChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-gray-800">
              Page {currentIndex + 1} of {totalCount}
            </span>
            <button
              type="button"
              disabled={currentIndex >= totalCount - 1}
              onClick={onNextPage}
              className="p-1 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
              title="Next page"
            >
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-gray-300">|</span>

          {/* View Modes */}
          <div className="flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('dual')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                viewMode === 'dual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Side-by-side Dual View: 8-Handle Crop on Left + Scanned Output on Right"
            >
              <HiOutlineViewBoards className="w-3.5 h-3.5" />
              <span>Dual Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('crop')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                viewMode === 'crop'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Full Width Interactive 8-Point Crop"
            >
              <HiOutlineScissors className="w-3.5 h-3.5" />
              <span>Crop Handles</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('scan')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                viewMode === 'scan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Full Width Scanned Output"
            >
              <HiOutlineEye className="w-3.5 h-3.5" />
              <span>Scanned View</span>
            </button>
          </div>
        </div>

        {/* View Toggle & Zoom */}
        <div className="flex items-center gap-2">
          {viewMode === 'scan' && (
            <div className="flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShowOriginal(false)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  !showOriginal ? 'bg-white text-emerald-600 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Enhanced Scan
              </button>
              <button
                type="button"
                onClick={() => setShowOriginal(true)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  showOriginal ? 'bg-white text-emerald-600 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Original Photo
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded"
              title="Zoom out"
            >
              <HiOutlineZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-gray-500 w-9 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded"
              title="Zoom in"
            >
              <HiOutlineZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded"
              title="Fit to screen"
            >
              <HiOutlineArrowsExpand className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE VIEWPORT */}
      {viewMode === 'dual' ? (
        /* DUAL SPLIT VIEW (Source 8-Handle Crop on Left, Straightened Scanned Output on Right) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Left Panel: 8-Point Interactive Crop */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 space-y-2 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Source (Drag Corners & Edge Handles)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {activeDocument.originalWidth} × {activeDocument.originalHeight} px
              </span>
            </div>

            <DocumentCropper
              documentPage={activeDocument}
              onUpdateCorners={onUpdateCorners}
              onAutoDetect={onAutoDetectCorners}
              onResetCorners={onResetCorners}
              onApplyCrop={onApplyCrop}
            />
          </div>

          {/* Right Panel: Real-time Straightened & Filtered Scan Output */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 space-y-2 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <HiOutlineSparkles className="w-4 h-4" />
                Straightened Output ("Sedaa Scan")
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {activePreset.toUpperCase()}
              </span>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 min-h-[380px] max-h-[560px] flex items-center justify-center overflow-auto relative">
              <img
                src={activeDocument.processedDataUrl || activeDocument.originalDataUrl}
                alt="Straightened Scanned Output"
                className="max-h-[520px] max-w-full object-contain rounded shadow-2xl block"
              />
            </div>

            <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                ✓ Non-destructive perspective deskewed
              </span>
              <button
                type="button"
                onClick={onOpenOcr}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
              >
                Extract Text (OCR) →
              </button>
            </div>
          </div>
        </div>
      ) : viewMode === 'crop' ? (
        /* FULL WIDTH 8-POINT CROPPER */
        <DocumentCropper
          documentPage={activeDocument}
          onUpdateCorners={onUpdateCorners}
          onAutoDetect={onAutoDetectCorners}
          onResetCorners={onResetCorners}
          onApplyCrop={() => {
            onApplyCrop();
            setViewMode('dual');
          }}
        />
      ) : (
        /* FULL WIDTH SCAN PREVIEW */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 h-[440px] sm:h-[500px] flex items-center justify-center overflow-auto relative select-none">
          <div
            className="transition-transform duration-100 flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={previewSrc}
              alt="Document Preview"
              className="max-h-[400px] sm:max-h-[460px] max-w-full object-contain rounded-lg shadow-2xl block"
            />
          </div>

          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur text-white px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{showOriginal ? 'Raw Original Photo' : 'Straightened & Enhanced Scan'}</span>
            <span className="text-gray-400 text-[10px]">
              ({activeDocument.originalWidth} × {activeDocument.originalHeight} px)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
