import React from 'react';
import { HiOutlineCheckCircle } from 'react-icons/hi';

export default function ScannerStatus({ cvReady, isProcessing, processingMessage }) {
  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold animate-pulse">
        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="truncate max-w-[220px]">{processingMessage || 'Processing...'}</span>
      </div>
    );
  }

  if (cvReady) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
        <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
        <span>Universal CV Engine Ready</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
      <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
      <span>Engine Ready (Canvas 2D)</span>
    </div>
  );
}
