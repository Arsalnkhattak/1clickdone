import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  renderCropOverlay,
  get8ControlPoints,
  CORNER_HANDLE_RADIUS,
  EDGE_HANDLE_RADIUS,
} from './CropCornerHandles';
import Button from '../ui/Button';
import {
  HiOutlineSparkles,
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

  const [activeHandleIdx, setActiveHandleIdx] = useState(-1);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [magnifierInfo, setMagnifierInfo] = useState(null);
  const [dragCorners, setDragCorners] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [initialCornersOnDrag, setInitialCornersOnDrag] = useState([]);

  const corners = useMemo(() => documentPage?.corners || [], [documentPage?.corners]);
  const activeCorners = dragCorners || corners;

  // Redraw canvas with source image and 8-handle overlay
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

    renderCropOverlay(ctx, displayW, displayH, displayCorners, activeHandleIdx);
  }, [activeCorners, activeHandleIdx]);

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

    const displayCorners = corners.map((p) => ({
      x: p.x * scale,
      y: p.y * scale,
    }));

    const pts = get8ControlPoints(displayCorners);
    let foundIdx = -1;
    let minDist = 32;

    pts.forEach((pt, idx) => {
      const dist = Math.hypot(pt.x - x, pt.y - y);
      const hitRadius = idx < 4 ? CORNER_HANDLE_RADIUS * 2.2 : EDGE_HANDLE_RADIUS * 2.5;
      if (dist < hitRadius && dist < minDist) {
        minDist = dist;
        foundIdx = idx;
      }
    });

    if (foundIdx !== -1) {
      e.preventDefault();
      setActiveHandleIdx(foundIdx);
      setDragStartPos({ x, y });
      setInitialCornersOnDrag(JSON.parse(JSON.stringify(corners)));
      setDragCorners([...corners]);

      const targetPt = pts[foundIdx];
      setMagnifierInfo({
        handleIdx: foundIdx,
        x: targetPt.x / scale,
        y: targetPt.y / scale,
        canvasX: x,
        canvasY: y,
      });
    }
  };

  const handlePointerMove = (e) => {
    if (activeHandleIdx === -1 || !imageRef.current) return;
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    const scale = scaleFactor || 1;

    const imgW = imageRef.current.naturalWidth;
    const imgH = imageRef.current.naturalHeight;

    const init = initialCornersOnDrag;
    if (!init || init.length !== 4) return;

    let nextCorners = JSON.parse(JSON.stringify(init));

    if (activeHandleIdx < 4) {
      // Direct corner manipulation
      const naturalX = Math.max(0, Math.min(imgW, Math.round(x / scale)));
      const naturalY = Math.max(0, Math.min(imgH, Math.round(y / scale)));
      nextCorners[activeHandleIdx] = { x: naturalX, y: naturalY };

      setMagnifierInfo({
        handleIdx: activeHandleIdx,
        x: naturalX,
        y: naturalY,
        canvasX: x,
        canvasY: y,
      });
    } else {
      // 8-Point Edge Handle manipulation ("Dermyan me resize")
      const dxNat = Math.round((x - dragStartPos.x) / scale);
      const dyNat = Math.round((y - dragStartPos.y) / scale);

      if (activeHandleIdx === 4) {
        // Top-Middle edge -> Adjusts TL (0) & TR (1)
        nextCorners[0] = {
          x: Math.max(0, Math.min(init[1].x - 20, init[0].x + dxNat)),
          y: Math.max(0, Math.min(init[3].y - 20, init[0].y + dyNat)),
        };
        nextCorners[1] = {
          x: Math.max(init[0].x + 20, Math.min(imgW, init[1].x + dxNat)),
          y: Math.max(0, Math.min(init[2].y - 20, init[1].y + dyNat)),
        };
      } else if (activeHandleIdx === 5) {
        // Right-Middle edge -> Adjusts TR (1) & BR (2)
        nextCorners[1] = {
          x: Math.max(init[0].x + 20, Math.min(imgW, init[1].x + dxNat)),
          y: Math.max(0, Math.min(init[2].y - 20, init[1].y + dyNat)),
        };
        nextCorners[2] = {
          x: Math.max(init[3].x + 20, Math.min(imgW, init[2].x + dxNat)),
          y: Math.max(init[1].y + 20, Math.min(imgH, init[2].y + dyNat)),
        };
      } else if (activeHandleIdx === 6) {
        // Bottom-Middle edge -> Adjusts BR (2) & BL (3)
        nextCorners[2] = {
          x: Math.max(init[3].x + 20, Math.min(imgW, init[2].x + dxNat)),
          y: Math.max(init[1].y + 20, Math.min(imgH, init[2].y + dyNat)),
        };
        nextCorners[3] = {
          x: Math.max(0, Math.min(init[2].x - 20, init[3].x + dxNat)),
          y: Math.max(init[0].y + 20, Math.min(imgH, init[3].y + dyNat)),
        };
      } else if (activeHandleIdx === 7) {
        // Left-Middle edge -> Adjusts BL (3) & TL (0)
        nextCorners[0] = {
          x: Math.max(0, Math.min(init[1].x - 20, init[0].x + dxNat)),
          y: Math.max(0, Math.min(init[3].y - 20, init[0].y + dyNat)),
        };
        nextCorners[3] = {
          x: Math.max(0, Math.min(init[2].x - 20, init[3].x + dxNat)),
          y: Math.max(init[0].y + 20, Math.min(imgH, init[3].y + dyNat)),
        };
      }

      setMagnifierInfo({
        handleIdx: activeHandleIdx,
        x: Math.round(x / scale),
        y: Math.round(y / scale),
        canvasX: x,
        canvasY: y,
      });
    }

    setDragCorners(nextCorners);
  };

  const handlePointerUp = () => {
    if (dragCorners) {
      onUpdateCorners(dragCorners);
      setDragCorners(null);
    }
    setActiveHandleIdx(-1);
    setMagnifierInfo(null);
  };

  const getHandleStatusText = () => {
    if (activeHandleIdx === -1) return 'Drag 4 corners or 4 middle edge handles to crop';
    const labels = [
      'Moving Top-Left Corner (TL)',
      'Moving Top-Right Corner (TR)',
      'Moving Bottom-Right Corner (BR)',
      'Moving Bottom-Left Corner (BL)',
      'Resizing Top Edge (TL + TR)',
      'Resizing Right Edge (TR + BR)',
      'Resizing Bottom Edge (BR + BL)',
      'Resizing Left Edge (BL + TL)',
    ];
    return labels[activeHandleIdx] || 'Adjusting boundary';
  };

  return (
    <div className="space-y-3">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-slate-100 rounded-xl px-3.5 py-2.5 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            8-Point Interactive Crop
          </span>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            {getHandleStatusText()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={onAutoDetect}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 border-slate-700"
            title="Attempt automatic document boundary detection"
          >
            <HiOutlineSparkles className="w-4 h-4 text-emerald-400" />
            Auto-Detect
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onResetCorners}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            title="Reset crop to full image bounds"
          >
            <HiOutlineArrowsExpand className="w-3.5 h-3.5" />
            Full Frame
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={onApplyCrop}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/30"
          >
            <HiOutlineCheck className="w-4 h-4" />
            Apply Crop
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
          className="rounded shadow-2xl cursor-crosshair max-w-full block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        />

        {/* Real-time Magnifier Loupe during dragging */}
        {magnifierInfo && imageRef.current && (
          <div
            className="absolute top-4 right-4 pointer-events-none rounded-2xl border-2 border-emerald-400 shadow-2xl overflow-hidden bg-slate-950 flex flex-col items-center z-30"
            style={{ width: 140, height: 140 }}
          >
            <div className="relative w-full h-full overflow-hidden">
              <img
                src={documentPage.originalDataUrl}
                alt="Magnifier"
                className="absolute max-w-none"
                style={{
                  width: `${imageRef.current.naturalWidth * 2.2}px`,
                  height: `${imageRef.current.naturalHeight * 2.2}px`,
                  left: `${-magnifierInfo.x * 2.2 + 70}px`,
                  top: `${-magnifierInfo.y * 2.2 + 70}px`,
                }}
              />
              {/* Crosshair target in center of loupe */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 rounded-full border border-emerald-400/80 shadow flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-1 bg-black/80 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/40">
              {Math.round(magnifierInfo.x)}, {Math.round(magnifierInfo.y)}
            </div>
          </div>
        )}
      </div>

      {/* Control Handle Guide Legend */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white"></span>
            <span className="text-slate-700 font-medium">4 Corners (Position Angles)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block border border-slate-800"></span>
            <span className="text-slate-700 font-medium">4 Middle Handles (Resize Edge)</span>
          </span>
        </div>
        <span className="font-mono text-emerald-600 font-medium">
          {imageRef.current ? `${imageRef.current.naturalWidth} × ${imageRef.current.naturalHeight} px` : ''}
        </span>
      </div>
    </div>
  );
}
