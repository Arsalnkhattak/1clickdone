import React from 'react';
import { Upload } from 'lucide-react';

export default function ScannerHeader({ onUploadFile }) {
  return (
    <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-xl border border-slate-800 shadow-md">
      <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg cursor-pointer text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-md">
        <Upload size={16} />
        <span>Upload File / Image</span>
        <input
          type="file"
          accept="image/*"
          onChange={onUploadFile}
          className="hidden"
        />
      </label>
      <span className="text-xs text-slate-400">
        Upload image or document to scan & straighten
      </span>
    </div>
  );
}
