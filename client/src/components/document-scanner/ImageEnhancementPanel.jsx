import React from 'react';
import Button from '../ui/Button';
import {
  HiOutlineColorSwatch,
  HiOutlineSun,
  HiOutlineAdjustments,
  HiOutlineRefresh,
  HiOutlineSparkles,
  HiOutlineReply,
  HiOutlineChevronDoubleRight,
} from 'react-icons/hi';

export default function ImageEnhancementPanel({
  documentPage,
  onUpdateSettings,
  onRotate,
  onReset,
  onUndo,
  onRedo,
}) {
  if (!documentPage) return null;

  const {
    filter = 'color',
    brightness = 0,
    contrast = 0,
    sharpen = false,
    rotation = 0,
    straightenAngle = 0,
    undoStack = [],
    redoStack = [],
  } = documentPage;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-4">
      {/* Top Header with Undo / Redo & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <HiOutlineAdjustments className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-gray-900 text-sm">Enhancement & Color Pipeline</h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={undoStack.length === 0}
            onClick={onUndo}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Undo last change"
          >
            <HiOutlineReply className="w-3.5 h-3.5" />
            Undo ({undoStack.length})
          </button>

          <button
            type="button"
            disabled={redoStack.length === 0}
            onClick={onRedo}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Redo change"
          >
            Redo ({redoStack.length})
          </button>

          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline px-2 py-1"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Preset Document Modes */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
          Document Color Mode
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'color', label: 'Color', desc: 'Preserves original tones', icon: '🎨' },
            { id: 'grayscale', label: 'Grayscale', desc: '8-bit luminance', icon: '⚪' },
            { id: 'bw', label: 'B&W Document', desc: 'Crisp CamScanner text', icon: '📄' },
            { id: 'magic', label: 'Xerox / Magic', desc: 'Boosted photocopy', icon: '⚡' },
          ].map((m) => {
            const isSelected = filter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onUpdateSettings({ filter: m.id })}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">{m.icon}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-gray-900">{m.label}</div>
                  <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Light & Contrast Adjustments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              <HiOutlineSun className="w-3.5 h-3.5 text-amber-500" />
              Brightness
            </span>
            <span className="font-mono text-gray-500">{brightness > 0 ? `+${brightness}` : brightness}</span>
          </div>
          <input
            type="range"
            min="-60"
            max="60"
            step="2"
            value={brightness}
            onChange={(e) => onUpdateSettings({ brightness: parseInt(e.target.value, 10) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
            <span className="flex items-center gap-1">
              <HiOutlineAdjustments className="w-3.5 h-3.5 text-blue-500" />
              Contrast
            </span>
            <span className="font-mono text-gray-500">{contrast > 0 ? `+${contrast}` : contrast}</span>
          </div>
          <input
            type="range"
            min="-60"
            max="60"
            step="2"
            value={contrast}
            onChange={(e) => onUpdateSettings({ contrast: parseInt(e.target.value, 10) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Geometry: Rotation & Straighten Slider */}
      <div className="pt-2 border-t border-gray-100 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-semibold text-gray-700 uppercase">
            Rotation & Straighten
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onRotate(-90)}
              className="px-2.5 py-1 text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
              title="Rotate 90 degrees counter-clockwise"
            >
              ↺ Rotate -90°
            </button>
            <button
              type="button"
              onClick={() => onRotate(90)}
              className="px-2.5 py-1 text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
              title="Rotate 90 degrees clockwise"
            >
              ↻ Rotate +90°
            </button>
          </div>
        </div>

        {/* Straighten fine tilt angle */}
        <div>
          <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
            <span>Fine Straighten (Angle)</span>
            <div className="flex items-center gap-1">
              <span className="font-mono font-bold text-blue-600">
                {straightenAngle > 0 ? `+${straightenAngle}°` : `${straightenAngle}°`}
              </span>
              {straightenAngle !== 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ straightenAngle: 0 })}
                  className="text-[10px] text-gray-400 hover:text-gray-700 ml-1 underline"
                >
                  Reset 0°
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="-20"
            max="20"
            step="0.5"
            value={straightenAngle}
            onChange={(e) => onUpdateSettings({ straightenAngle: parseFloat(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>-20°</span>
            <span>0° Level</span>
            <span>+20°</span>
          </div>
        </div>

        {/* Sharpen Toggle */}
        <div className="flex items-center justify-between pt-1">
          <label htmlFor="sharpenCheck" className="text-xs font-medium text-gray-700 cursor-pointer flex items-center gap-1.5">
            <HiOutlineSparkles className="w-4 h-4 text-blue-500" />
            Sharpen Text & Borders
          </label>
          <input
            id="sharpenCheck"
            type="checkbox"
            checked={sharpen}
            onChange={(e) => onUpdateSettings({ sharpen: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
