import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { renderCropOverlay, HANDLE_RADIUS } from './CropCornerHandles';
import Button from '../ui/Button';
import {
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineArrowsExpand,
} from 'react-icons/hi';

export default function DocumentCropper({
  documentPage,
  onUpdateCorners,
  onAutoDetect,
  onResetCorners,
  onApplyCrop,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const [activeCornerIdx, setActiveCornerIdx] = useState(-1);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [magnifierInfo, setMagnifierInfo] = useState(null); // { x, y, canvasX, canvasY }
  const [dragCorners, setDragCorners] = useState(null);

  const corners = useMemo(() => documentPage?.corners || [], [documentPage?.corners]);
  const activeCorners = dragCorners || corners;

  // Redraw canvas with source image and overlay
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const containerWidth = containerRef.current?.clientWidth || 700;
    const maxViewportHeight = Math.min(window.innerHeight * 0.65, 560);

    const scale = Math.min(
      containerWidth / img.naturalWidth,
      maxViewportHeight / img.naturalHeight,
      1
    );

    const displayW = Math.round(img.naturalWidth * scale);
    const displayH = Math.round(img.naturalHeight * scale);

    canvas.width = displayW;
    canvas.height = displayH;
    setScaleFactor(scale);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, displayW, displayH);

    // Draw base image
    ctx.drawImage(img, 0, 0, displayW, displayH);

    // Scale corners to display dimensions
    const displayCorners = activeCorners.map((p) => ({
      x: p.x * scale,
      y: p.y * scale,
    }));

    renderCropOverlay(ctx, displayW, displayH, displayCorners, activeCornerIdx);
  }, [activeCorners, activeCornerIdx]);

  // Load original image
  useEffect(() => {
    if (!documentPage?.originalDataUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      draw();
    };
    img.src = documentPage.originalDataUrl;
  }, [documentPage?.originalDataUrl, draw]);

  // Redraw when corners or active index change
  useEffect(() => {
    draw();
  }, [draw]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Pointer event helpers
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getCanvasCoordinates(e);
    const scale = scaleFactor || 1;

    // Find if pointer is near any corner handle
    let foundIdx = -1;
    corners.forEach((c, idx) => {
      const cx = c.x * scale;
      const cy = c.y * scale;
      if (Math.hypot(x - cx, y - cy) <= HANDLE_RADIUS * 2.2) {
        foundIdx = idx;
      }
    });

    if (foundIdx !== -1) {
      e.preventDefault();
      setActiveCornerIdx(foundIdx);
      setDragCorners([...corners]);
      setMagnifierInfo({
        cornerIdx: foundIdx,
        x: corners[foundIdx].x,
        y: corners[foundIdx].y,
        canvasX: x,
        canvasY: y,
      });
    }
  };

  const handlePointerMove = (e) => {
    if (activeCornerIdx === -1 || !imageRef.current) return;
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    const scale = scaleFactor || 1;

    const imgW = imageRef.current.naturalWidth;
    const imgH = imageRef.current.naturalHeight;

    const naturalX = Math.max(0, Math.min(imgW, Math.round(x / scale)));
    const naturalY = Math.max(0, Math.min(imgH, Math.round(y / scale)));

    const baseCorners = dragCorners || corners;
    const nextCorners = baseCorners.map((c, i) =>
      i === activeCornerIdx ? { x: naturalX, y: naturalY } : c
    );

    setDragCorners(nextCorners);

    setMagnifierInfo({
      cornerIdx: activeCornerIdx,
      x: naturalX,
      y: naturalY,
      canvasX: x,
      canvasY: y,
    });
  };

  const handlePointerUp = () => {
    if (dragCorners) {
      onUpdateCorners(dragCorners);
      setDragCorners(null);
    }
    setActiveCornerIdx(-1);
    setMagnifierInfo(null);
  };

  return (
    <div className="space-y-3">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-800">
            Perspective Boundary Cropping
          </span>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            Drag the 4 corner targets to frame the document edges.
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={onAutoDetect}
            className="flex items-center gap-1.5 text-xs text-blue-700 hover:bg-blue-50"
            title="Attempt automatic document boundary detection"
          >
            <HiOutlineSparkles className="w-4 h-4 text-amber-500" />
            Auto-Detect
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onResetCorners}
            className="flex items-center gap-1.5 text-xs"
            title="Reset corners to full image frame"
          >
            <HiOutlineArrowsExpand className="w-3.5 h-3.5" />
            Full Frame
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={onApplyCrop}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 font-bold"
          >
            <HiOutlineCheck className="w-4 h-4" />
            Apply Perspective Crop
          </Button>
        </div>
      </div>

      {/* Main Canvas Viewport with Touch/Mouse handlers */}
      <div
        ref={containerRef}
        className="relative bg-slate-950 rounded-xl border border-slate-800 p-2 flex items-center justify-center overflow-hidden select-none touch-none min-h-[380px]"
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          className="rounded shadow-xl cursor-crosshair max-w-full block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        />

        {/* Real-time Magnifier Loupe during corner dragging */}
        {magnifierInfo && imageRef.current && (
          <div
            className="absolute top-4 right-4 pointer-events-none rounded-2xl border-2 border-white shadow-2xl overflow-hidden bg-slate-900 flex flex-col items-center"
            style={{ width: 140, height: 140 }}
          >
            <div className="relative w-full h-full overflow-hidden">
              <img
                src={documentPage.originalDataUrl}
                alt="Magnifier"
                className="absolute max-w-none"
                style={{
                  width: `${imageRef.current.naturalWidth * 2.5}px`,
                  height: `${imageRef.current.naturalHeight * 2.5}px`,
                  left: `${-magnifierInfo.x * 2.5 + 70}px`,
                  top: `${-magnifierInfo.y * 2.5 + 70}px`,
                }}
              />
              {/* Crosshair target in center of loupe */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-1 bg-black/75 text-white font-mono text-[9px] px-2 py-0.5 rounded-full font-bold">
              {Math.round(magnifierInfo.x)}, {Math.round(magnifierInfo.y)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
