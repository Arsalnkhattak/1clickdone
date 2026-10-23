import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineScissors,
  HiOutlineSparkles,
  HiOutlineViewGrid,
  HiOutlineSun,
  HiOutlineSwitchHorizontal,
  HiOutlineColorSwatch,
} from 'react-icons/hi';

export default function ImageEditorModal({ isOpen, onClose, storageKey, onImageSaved }) {
  const [activeStorageKey, setActiveStorageKey] = useState(storageKey);
  const [orientation, setOrientation] = useState(0); // 0, 90, 180, 270
  const [fineAngle, setFineAngle] = useState(0); // -25° to +25°
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saving, setSaving] = useState(false);
  const [detectingAngle, setDetectingAngle] = useState(false);
  const [autoCropping, setAutoCropping] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Active Tool Tab: 'straighten' | 'crop' | 'enhance' | 'background'
  const [activeTab, setActiveTab] = useState('straighten');

  // Background color replacement
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFFFF');
  const [changingBg, setChangingBg] = useState(false);

  // Manual Crop Margins (% from edges)
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);

  useEffect(() => {
    setActiveStorageKey(storageKey);
    setOrientation(0);
    setFineAngle(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(1);
    setContrast(1);
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
    setShowGrid(true);
    setActiveTab('straighten');
  }, [storageKey, isOpen]);

  if (!isOpen || !activeStorageKey) return null;

  const token = localStorage.getItem('1click_token');
  const imageUrl = `/api/documents/file/${activeStorageKey}?token=${token}`;

  const totalAngle = Math.round((orientation + fineAngle) * 10) / 10;

  const handleReset = () => {
    setOrientation(0);
    setFineAngle(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(1);
    setContrast(1);
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
    toast('All adjustments reset');
  };

  const handleAutoStraighten = async () => {
    try {
      setDetectingAngle(true);
      const res = await api.post('/print-layouts/detect-angle', {
        storageKey: activeStorageKey,
      });
      const detected = res.data.data?.angle || 0;
      setFineAngle(detected);
      if (Math.abs(detected) > 0.1) {
        toast.success(`Straightened card by ${detected > 0 ? '+' : ''}${detected}°`);
      } else {
        toast('Card is already level (0°)');
      }
    } catch {
      toast.error('Could not detect angle automatically. Use the slider.');
    } finally {
      setDetectingAngle(false);
    }
  };

  const handleAutoCropCard = async () => {
    try {
      setAutoCropping(true);
      const res = await api.post('/print-layouts/auto-crop', {
        storageKey: activeStorageKey,
        enhance: true,
      });

      const cropped = res.data.data;
      setActiveStorageKey(cropped.storageKey);
      setOrientation(0);
      setFineAngle(0);
      setCropTop(0);
      setCropBottom(0);
      setCropLeft(0);
      setCropRight(0);
      toast.success('✨ Card auto-straightened & cropped!');

      if (onImageSaved) {
        onImageSaved(cropped);
      }
    } catch {
      toast.error('Could not auto-crop card. Please use manual crop sliders.');
    } finally {
      setAutoCropping(false);
    }
  };

  const handleChangeBg = async (color) => {
    const targetColor = color || selectedBgColor;
    try {
      setChangingBg(true);
      const res = await api.post('/print-layouts/change-background', {
        storageKey: activeStorageKey,
        backgroundColor: targetColor,
      });

      const updated = res.data.data;
      setActiveStorageKey(updated.storageKey);
      toast.success(`✨ Background replaced with ${targetColor}!`);

      if (onImageSaved) {
        onImageSaved(updated);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change background');
    } finally {
      setChangingBg(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        storageKey: activeStorageKey,
        rotate: totalAngle,
        cropPercentage: {
          top: cropTop,
          bottom: cropBottom,
          left: cropLeft,
          right: cropRight,
        },
        flipHorizontal: flipH,
        flipVertical: flipV,
        brightness,
        contrast,
      };

      const res = await api.post('/print-layouts/edit-image', payload);

      toast.success('Card adjusted & saved successfully!');
      if (onImageSaved) {
        onImageSaved(res.data.data);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process image');
    } finally {
      setSaving(false);
    }
  };

  const transformStyle = {
    transform: `rotate(${totalAngle}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
    filter: `brightness(${brightness}) contrast(${contrast})`,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Card Straighten & Crop Editor" size="2xl">
      <div className="space-y-3.5">
        {/* Top Control Bar with DIRECT Save Button (Always Accessible!) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAutoStraighten}
              loading={detectingAngle}
              title="Automatically calculate angle and level the card"
            >
              <HiOutlineRefresh className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Auto-Straighten
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAutoCropCard}
              loading={autoCropping}
              title="Automatically detect, deskew and crop card"
            >
              <HiOutlineSparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Auto-Crop
            </Button>
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 ${
                showGrid
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Toggle camera alignment grid"
            >
              <HiOutlineViewGrid className="w-3.5 h-3.5" />
              Grid
            </button>
          </div>

          {/* Quick Apply & Save Button right on top! */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              loading={saving}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold px-4 py-1.5 shadow-sm text-xs"
            >
              <HiOutlineCheck className="w-4 h-4 mr-1 text-emerald-200" />
              Save & Apply Changes
            </Button>
          </div>
        </div>

        {/* Live Canvas / Image Preview Area with Grid */}
        <div className="bg-slate-900/10 rounded-xl border border-gray-300 h-64 sm:h-72 flex items-center justify-center p-3 overflow-hidden relative select-none">
          <div className="relative inline-block max-h-full max-w-full">
            <img
              src={imageUrl}
              alt="To edit"
              style={transformStyle}
              className="max-h-60 sm:max-h-64 max-w-full object-contain rounded transition-transform duration-75 shadow-md block"
            />

            {/* Leveling / Alignment Grid Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none grid grid-cols-6 grid-rows-6 transition-transform duration-75"
                style={transformStyle}
              >
                {[...Array(36)].map((_, i) => (
                  <div key={i} className="border border-blue-500/30" />
                ))}
              </div>
            )}

            {/* Visual Crop Overlay */}
            {(cropTop > 0 || cropBottom > 0 || cropLeft > 0 || cropRight > 0) && (
              <div
                className="absolute border-2 border-dashed border-emerald-500 bg-emerald-500/15 pointer-events-none rounded transition-transform duration-75"
                style={{
                  ...transformStyle,
                  top: `${cropTop}%`,
                  bottom: `${cropBottom}%`,
                  left: `${cropLeft}%`,
                  right: `${cropRight}%`,
                }}
              >
                <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                  Crop Area
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Organized Feature Tabs */}
        <div className="flex items-center border-b border-gray-200 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('straighten')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'straighten'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HiOutlineRefresh className="w-3.5 h-3.5 text-amber-600" />
            1. Straighten & Tilt (تصویر سیدھی کریں)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crop')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'crop'
                ? 'border-blue-600 text-blue-900 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HiOutlineScissors className="w-3.5 h-3.5 text-blue-600" />
            2. Crop Borders (کراپ کریں)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('enhance')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'enhance'
                ? 'border-indigo-600 text-indigo-900 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HiOutlineSun className="w-3.5 h-3.5 text-indigo-600" />
            3. Light & Xerox Mode (لائٹ اور کاپی)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'background'
                ? 'border-purple-600 text-purple-900 bg-purple-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HiOutlineColorSwatch className="w-3.5 h-3.5 text-purple-600" />
            4. Background (بیک گراؤنڈ)
          </button>
        </div>

        {/* Tab 1: Straighten Controls */}
        {activeTab === 'straighten' && (
          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-950">
                  Tilt Angle / ٹیڑھا پن ختم کریں:
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded">
                  {fineAngle > 0 ? `+${fineAngle.toFixed(1)}°` : `${fineAngle.toFixed(1)}°`}
                  {Math.abs(fineAngle) < 0.1 ? ' (Level)' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFineAngle((a) => Math.max(-25, Math.round((a - 2) * 10) / 10))}
                  className="px-2 py-0.5 text-xs font-bold bg-white hover:bg-amber-100 border border-amber-300 rounded text-amber-900"
                  title="Tilt -2°"
                >
                  -2°
                </button>
                <button
                  type="button"
                  onClick={() => setFineAngle((a) => Math.max(-25, Math.round((a - 1) * 10) / 10))}
                  className="px-2 py-0.5 text-xs font-bold bg-white hover:bg-amber-100 border border-amber-300 rounded text-amber-900"
                  title="Tilt -1°"
                >
                  -1°
                </button>
                <button
                  type="button"
                  onClick={() => setFineAngle(0)}
                  className="px-2.5 py-0.5 text-xs font-semibold bg-white hover:bg-amber-100 border border-amber-300 rounded text-amber-900"
                >
                  0° Level
                </button>
                <button
                  type="button"
                  onClick={() => setFineAngle((a) => Math.min(25, Math.round((a + 1) * 10) / 10))}
                  className="px-2 py-0.5 text-xs font-bold bg-white hover:bg-amber-100 border border-amber-300 rounded text-amber-900"
                  title="Tilt +1°"
                >
                  +1°
                </button>
                <button
                  type="button"
                  onClick={() => setFineAngle((a) => Math.min(25, Math.round((a + 2) * 10) / 10))}
                  className="px-2 py-0.5 text-xs font-bold bg-white hover:bg-amber-100 border border-amber-300 rounded text-amber-900"
                  title="Tilt +2°"
                >
                  +2°
                </button>
              </div>
            </div>

            <input
              type="range"
              min="-25"
              max="25"
              step="0.2"
              value={fineAngle}
              onChange={(e) => setFineAngle(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-amber-800 font-medium">
              <span>-25° (Left down)</span>
              <span>0° (Perfect Horizontal)</span>
              <span>+25° (Right down)</span>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setOrientation((r) => (r + 90) % 360)}
              >
                <HiOutlineRefresh className="w-3.5 h-3.5 mr-1" />
                Rotate 90° ({orientation}°)
              </Button>
              <Button
                size="sm"
                variant={flipH ? 'primary' : 'secondary'}
                onClick={() => setFlipH(!flipH)}
              >
                <HiOutlineSwitchHorizontal className="w-3.5 h-3.5 mr-1" />
                Flip Horizontal
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Crop Controls */}
        {activeTab === 'crop' && (
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-blue-950">
                Trim Background Borders (Drag sliders to frame the card)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCropTop(4);
                    setCropBottom(4);
                    setCropLeft(4);
                    setCropRight(4);
                  }}
                  className="px-2 py-0.5 text-xs font-semibold bg-white hover:bg-blue-100 border border-blue-300 rounded text-blue-900"
                >
                  Preset 4% Trim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropTop(8);
                    setCropBottom(8);
                    setCropLeft(8);
                    setCropRight(8);
                  }}
                  className="px-2 py-0.5 text-xs font-semibold bg-white hover:bg-blue-100 border border-blue-300 rounded text-blue-900"
                >
                  Preset 8% Trim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropTop(0);
                    setCropBottom(0);
                    setCropLeft(0);
                    setCropRight(0);
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold ml-1"
                >
                  Clear Crop
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                  Top Trim: {cropTop}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cropTop}
                  onChange={(e) => setCropTop(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                  Bottom Trim: {cropBottom}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cropBottom}
                  onChange={(e) => setCropBottom(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                  Left Trim: {cropLeft}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cropLeft}
                  onChange={(e) => setCropLeft(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">
                  Right Trim: {cropRight}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={cropRight}
                  onChange={(e) => setCropRight(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Light & Xerox Mode */}
        {activeTab === 'enhance' && (
          <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-indigo-950">
                Lighting & Photocopy Xerox Enhancement
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setBrightness(1.15);
                    setContrast(1.35);
                    toast.success('High-contrast photocopy mode enabled');
                  }}
                  className="px-2.5 py-0.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-2xs"
                >
                  ⚡ Xerox High Contrast
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrightness(1.2);
                    setContrast(1.1);
                  }}
                  className="px-2 py-0.5 text-xs font-semibold bg-white hover:bg-indigo-100 border border-indigo-300 rounded text-indigo-900"
                >
                  Brighten
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrightness(1);
                    setContrast(1);
                  }}
                  className="text-xs text-indigo-600 hover:underline font-semibold ml-1"
                >
                  Reset Light
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Scan Brightness</span>
                  <span>{Math.round(brightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={brightness}
                  onChange={(e) => setBrightness(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Scan Contrast</span>
                  <span>{Math.round(contrast * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={contrast}
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Background Color Replacement */}
        {activeTab === 'background' && (
          <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <HiOutlineSparkles className="w-4 h-4 text-purple-600" />
                Select Solid Background Color (پاسپورٹ بیک گراؤنڈ منتخب کریں):
              </span>
              {changingBg && (
                <span className="text-xs text-purple-700 font-semibold animate-pulse">
                  Applying background color...
                </span>
              )}
            </div>

            {/* Quick Swatches */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { name: 'White', color: '#FFFFFF', desc: 'Passport & Visa standard' },
                { name: 'Passport Blue', color: '#2563EB', desc: 'Gov Jobs & Degrees' },
                { name: 'Sky Blue', color: '#38BDF8', desc: 'Light Blue' },
                { name: 'Studio Grey', color: '#E5E7EB', desc: 'Neutral Grey' },
                { name: 'Black', color: '#111827', desc: 'Solid Black' },
                { name: 'Red', color: '#DC2626', desc: 'Asian Visas' },
              ].map((p) => {
                const isSelected = selectedBgColor.toLowerCase() === p.color.toLowerCase();
                return (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => {
                      setSelectedBgColor(p.color);
                      handleChangeBg(p.color);
                    }}
                    disabled={changingBg}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-white shadow-xs ring-2 ring-purple-500/20'
                        : 'border-purple-200 bg-white/80 hover:bg-white'
                    }`}
                    title={p.desc}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-gray-300 shadow-2xs shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-gray-900">{p.name}</span>
                  </button>
                );
              })}

              {/* Custom Color Input */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-white/80 hover:bg-white cursor-pointer text-xs font-semibold">
                <input
                  type="color"
                  value={selectedBgColor}
                  onChange={(e) => {
                    setSelectedBgColor(e.target.value);
                    handleChangeBg(e.target.value);
                  }}
                  className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-gray-800">Custom Color</span>
              </label>
            </div>
            <p className="text-[11px] text-purple-800">
              Cuts out the portrait subject with AI and replaces background with your chosen solid studio color (سفید، نیلا، گرے، کالا یا کسٹم رنگ).
            </p>
          </div>
        )}

        {/* Modal Sticky Bottom Action Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs pt-3 pb-1 border-t border-gray-200 flex items-center justify-between gap-3">
          <Button size="sm" variant="secondary" onClick={handleReset}>
            Reset All
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              loading={saving}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold px-5 py-2 text-sm shadow-md"
            >
              <HiOutlineCheck className="w-4 h-4 mr-1 text-emerald-200" />
              Save & Apply Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
