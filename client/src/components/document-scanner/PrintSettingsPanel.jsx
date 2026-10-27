import React from 'react';
import { MARGIN_PRESETS_MM } from '../../utils/printLayout';
import { HiOutlinePrinter, HiOutlineTemplate, HiOutlineViewGrid } from 'react-icons/hi';

export default function PrintSettingsPanel({ settings, onUpdateSettings }) {
  const {
    paperSize = 'A4',
    orientation = 'auto',
    marginMm = 10,
    layoutDistribution = '1-up',
    customWidthMm = 210,
    customHeightMm = 297,
    outputFileName = 'Scanned_Document.pdf',
  } = settings;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-4">
      <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100">
        <HiOutlinePrinter className="w-4 h-4 text-blue-600" />
        <h3 className="font-bold text-gray-900 text-sm">Print Layout & Sheet Settings</h3>
      </div>

      {/* Paper Format */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
          Paper Size
        </label>
        <select
          value={paperSize}
          onChange={(e) => onUpdateSettings({ paperSize: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
        >
          <option value="A4">A4 (210 × 297 mm) — Standard</option>
          <option value="A3">A3 (297 × 420 mm) — Large</option>
          <option value="A5">A5 (148 × 210 mm) — Half Sheet</option>
          <option value="Letter">Letter (8.5 × 11 in)</option>
          <option value="Legal">Legal (8.5 × 14 in)</option>
          <option value="custom">Custom Dimensions (mm)</option>
        </select>
      </div>

      {/* Custom Dimensions inputs */}
      {paperSize === 'custom' && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 uppercase mb-0.5">
              Width (mm)
            </label>
            <input
              type="number"
              min="20"
              max="1000"
              value={customWidthMm}
              onChange={(e) => onUpdateSettings({ customWidthMm: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 uppercase mb-0.5">
              Height (mm)
            </label>
            <input
              type="number"
              min="20"
              max="1000"
              value={customHeightMm}
              onChange={(e) => onUpdateSettings({ customHeightMm: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>
      )}

      {/* Orientation */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
          Orientation
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'auto', label: 'Auto' },
            { id: 'portrait', label: 'Portrait' },
            { id: 'landscape', label: 'Landscape' },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onUpdateSettings({ orientation: o.id })}
              className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                orientation === o.id
                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Margins */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
          Page Margin
        </label>
        <select
          value={marginMm}
          onChange={(e) => onUpdateSettings({ marginMm: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MARGIN_PRESETS_MM.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Layout Distribution: 1-up vs 2-up */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
          Pages per Sheet
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onUpdateSettings({ layoutDistribution: '1-up' })}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              layoutDistribution === '1-up'
                ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500/20'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs font-bold text-gray-900">1 Page / Sheet</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Standard single page</div>
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ layoutDistribution: '2-up' })}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              layoutDistribution === '2-up'
                ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500/20'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="text-xs font-bold text-gray-900">2-Up (2 Pages / Sheet)</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Dual side-by-side / cards</div>
          </button>
        </div>
      </div>

      {/* Output File Name */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
          Export Document Name
        </label>
        <input
          type="text"
          value={outputFileName}
          onChange={(e) => onUpdateSettings({ outputFileName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Scanned_Document.pdf"
        />
      </div>
    </div>
  );
}
