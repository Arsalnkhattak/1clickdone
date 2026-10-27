import React, { useRef } from 'react';
import {
  HiOutlineTrash,
  HiOutlineDuplicate,
  HiOutlineRefresh,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlinePhotograph,
} from 'react-icons/hi';

export default function DocumentThumbnail({
  page,
  index,
  totalCount,
  isActive,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onReplace,
  onRemove,
}) {
  const replaceInputRef = useRef(null);

  const previewSrc = page.processedDataUrl || page.originalDataUrl;

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl border p-2 transition-all cursor-pointer flex items-center gap-3 select-none ${
        isActive
          ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {/* Page number pill */}
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
        }`}
      >
        {index + 1}
      </div>

      {/* Thumbnail image */}
      <div className="w-14 h-16 rounded-lg bg-slate-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={`Page ${index + 1}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <HiOutlinePhotograph className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* Page Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate">
          {page.originalName}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
            {page.filter}
          </span>
          {page.rotation !== 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              {page.rotation}°
            </span>
          )}
          {page.isCropped && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
              Cropped
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div
        className="flex flex-col gap-0.5 shrink-0 opacity-80 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-white disabled:opacity-20"
            title="Move page up"
          >
            <HiOutlineArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalCount - 1}
            onClick={onMoveDown}
            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-white disabled:opacity-20"
            title="Move page down"
          >
            <HiOutlineArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-white"
            title="Duplicate page"
          >
            <HiOutlineDuplicate className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => replaceInputRef.current?.click()}
            className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-white"
            title="Replace page image"
          >
            <HiOutlineRefresh className="w-3.5 h-3.5" />
          </button>
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
            title="Remove page"
          >
            <HiOutlineTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
