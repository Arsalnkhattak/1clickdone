import React from 'react';
import { RefreshCw, Upload } from 'lucide-react';

export default function SourceCanvasPanel({
  srcCanvasRef,
  loupeCanvasRef,
  imageLoaded,
  corners,
  midpoints,
  onAutoDetectCorners,
  onPointerDown,
  onUploadFile,
}) {
  const canvas = srcCanvasRef.current;
  const scaleX = canvas && canvas.width > 0 ? canvas.clientWidth / canvas.width : 1;
  const scaleY = canvas && canvas.height > 0 ? canvas.clientHeight / canvas.height : 1;

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          1. Original Photo (Drag 8 Handles)
        </h3>
        <button
          type="button"
          onClick={onAutoDetectCorners}
          disabled={!imageLoaded}
          className="text-xs text-emerald-400 flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={12} /> Auto Edge Snap
        </button>
      </div>

      <div
        className="relative inline-block w-full min-h-[360px] overflow-hidden rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center select-none"
        style={{ touchAction: 'none' }}
      >
        {!imageLoaded && (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Upload size={28} />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">No Image Loaded</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Upload an image from your device to begin scanning.
            </p>
            <div className="flex justify-center pt-2">
              <label className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow">
                <Upload size={14} /> Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        <canvas
          ref={srcCanvasRef}
          className={`max-w-full h-auto block mx-auto ${!imageLoaded ? 'hidden' : ''}`}
        />

        {/* Polygon Boundary Overlay */}
        {imageLoaded && canvas && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <polygon
              points={corners
                .map((p) => `${p.x * scaleX},${p.y * scaleY}`)
                .join(' ')}
              fill="rgba(16, 185, 129, 0.2)"
              stroke="#10B981"
              strokeWidth="2"
            />
          </svg>
        )}

        {/* 4 Corner Handles (Green Circle) */}
        {imageLoaded &&
          canvas &&
          corners.map((p, idx) => (
            <div
              key={`corner-${idx}`}
              onPointerDown={(e) => onPointerDown(e, idx)}
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
                zIndex: 20,
              }}
            />
          ))}

        {/* 4 Edge Midpoint Handles (Blue Square) */}
        {imageLoaded &&
          canvas &&
          midpoints.map((p, idx) => (
            <div
              key={`mid-${idx}`}
              onPointerDown={(e) => onPointerDown(e, idx + 4)}
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
                zIndex: 20,
              }}
            />
          ))}

        {/* Magnifying Loupe Lens */}
        <canvas
          ref={loupeCanvasRef}
          width="120"
          height="120"
          className="absolute pointer-events-none rounded-full border-2 border-emerald-400 shadow-2xl hidden z-30"
        />
      </div>
    </div>
  );
}
