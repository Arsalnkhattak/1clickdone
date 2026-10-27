import React, { useState } from 'react';
import {
  HiOutlineZoomIn,
  HiOutlineZoomOut,
  HiOutlineArrowsExpand,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineScissors,
  HiOutlineEye,
} from 'react-icons/hi';
import DocumentCropper from './DocumentCropper';

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
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isCroppingMode, setIsCroppingMode] = useState(false);

  if (!activeDocument) {
    return (
      <div className="bg-slate-900/5 rounded-2xl border-2 border-dashed border-gray-300 h-96 flex flex-col items-center justify-center text-center p-6 text-gray-400">
        <HiOutlineEye className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-sm font-semibold text-gray-600">No document selected</p>
        <p className="text-xs text-gray-400 mt-1">Upload photos to preview and scan.</p>
      </div>
    );
  }

  const previewSrc = showOriginal
    ? activeDocument.originalDataUrl
    : activeDocument.processedDataUrl || activeDocument.originalDataUrl;

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="space-y-3">
      {/* Top Preview Controls Bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        {/* Navigation & Page counter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={onPreviousPage}
              className="p-1 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
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
              className="p-1 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
              title="Next page"
            >
              <HiOutlineChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-gray-300">|</span>

          {/* Mode Switcher: View vs Crop */}
          <button
            type="button"
            onClick={() => setIsCroppingMode(!isCroppingMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              isCroppingMode
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <HiOutlineScissors className="w-3.5 h-3.5" />
            {isCroppingMode ? 'Exit Crop Mode' : 'Adjust Perspective Crop'}
          </button>
        </div>

        {/* View Toggle & Zoom */}
        <div className="flex items-center gap-2">
          {!isCroppingMode && (
            <div className="flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShowOriginal(false)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  !showOriginal
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Enhanced Scan
              </button>
              <button
                type="button"
                onClick={() => setShowOriginal(true)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  showOriginal
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900'
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
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
              title="Zoom out"
            >
              <HiOutlineZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-gray-500 w-10 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
              title="Zoom in"
            >
              <HiOutlineZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
              title="Fit to screen"
            >
              <HiOutlineArrowsExpand className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Viewport */}
      {isCroppingMode ? (
        <DocumentCropper
          documentPage={activeDocument}
          onUpdateCorners={onUpdateCorners}
          onAutoDetect={onAutoDetectCorners}
          onResetCorners={onResetCorners}
          onApplyCrop={() => {
            onApplyCrop();
            setIsCroppingMode(false);
          }}
        />
      ) : (
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

          {/* Mode watermark badge */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{showOriginal ? 'Raw Original Camera Photo' : 'Enhanced Printable Scan'}</span>
            <span className="text-gray-400 text-[10px]">
              ({activeDocument.originalWidth} × {activeDocument.originalHeight} px)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
