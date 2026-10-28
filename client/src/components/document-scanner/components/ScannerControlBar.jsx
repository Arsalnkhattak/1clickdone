import React from 'react';
import { File, CreditCard, Receipt } from 'lucide-react';

export default function ScannerControlBar({
  aspectPreset,
  setAspectPreset,
  filterMode,
  setFilterMode,
}) {
  return (
    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between text-xs">
      {/* Format Aspect Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-slate-400 uppercase tracking-wider">
          Format Aspect:
        </span>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setAspectPreset('free')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              aspectPreset === 'free'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Auto Free
          </button>
          <button
            type="button"
            onClick={() => setAspectPreset('a4')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 cursor-pointer ${
              aspectPreset === 'a4'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <File size={12} /> A4 Document
          </button>
          <button
            type="button"
            onClick={() => setAspectPreset('cnic')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 cursor-pointer ${
              aspectPreset === 'cnic'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard size={12} /> CNIC Card (1.58:1)
          </button>
          <button
            type="button"
            onClick={() => setAspectPreset('receipt')}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1 cursor-pointer ${
              aspectPreset === 'receipt'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt size={12} /> Receipt
          </button>
        </div>
      </div>

      {/* Filter Modes */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-slate-400 uppercase tracking-wider">
          Filter Mode:
        </span>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFilterMode('magic')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              filterMode === 'magic'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ✨ Magic Color
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('bw')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              filterMode === 'bw'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            B&W Clean
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('grayscale')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              filterMode === 'grayscale'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Grayscale
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('original')}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              filterMode === 'original'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Original
          </button>
        </div>
      </div>
    </div>
  );
}
