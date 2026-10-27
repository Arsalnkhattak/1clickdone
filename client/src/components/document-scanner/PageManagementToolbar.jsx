import React, { useRef } from 'react';
import Button from '../ui/Button';
import {
  HiOutlineSparkles,
  HiOutlineScissors,
  HiOutlineRefresh,
  HiOutlineDuplicate,
  HiOutlineTrash,
  HiOutlineUpload,
} from 'react-icons/hi';

export default function PageManagementToolbar({
  documentPage,
  onAutoDetect,
  onToggleCrop,
  onRotate,
  onDuplicate,
  onReplace,
  onDelete,
}) {
  const replaceFileRef = useRef(null);

  if (!documentPage) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-gray-200 p-2.5 shadow-2xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          size="sm"
          variant="secondary"
          onClick={onAutoDetect}
          className="text-xs text-blue-700 hover:bg-blue-50"
          title="Auto-detect document boundaries"
        >
          <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-500 mr-1" />
          Auto-Detect Edges
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={onToggleCrop}
          className="text-xs"
          title="Toggle perspective crop"
        >
          <HiOutlineScissors className="w-3.5 h-3.5 text-blue-600 mr-1" />
          {documentPage.isCropped ? 'Edit Crop' : 'Crop Document'}
        </Button>

        <div className="h-4 w-px bg-gray-200 mx-0.5" />

        <button
          type="button"
          onClick={() => onRotate(-90)}
          className="px-2 py-1 text-xs font-semibold rounded-lg text-gray-700 hover:bg-gray-100 border border-gray-200"
          title="Rotate 90 degrees counter-clockwise"
        >
          ↺ -90°
        </button>

        <button
          type="button"
          onClick={() => onRotate(90)}
          className="px-2 py-1 text-xs font-semibold rounded-lg text-gray-700 hover:bg-gray-100 border border-gray-200"
          title="Rotate 90 degrees clockwise"
        >
          ↻ +90°
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          onClick={onDuplicate}
          className="text-xs"
          title="Duplicate this page"
        >
          <HiOutlineDuplicate className="w-3.5 h-3.5 mr-1" />
          Duplicate
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => replaceFileRef.current?.click()}
          className="text-xs"
          title="Replace with new photo"
        >
          <HiOutlineRefresh className="w-3.5 h-3.5 mr-1" />
          Replace
        </Button>
        <input
          ref={replaceFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onReplace(f);
            e.target.value = '';
          }}
        />

        <Button
          size="sm"
          variant="danger"
          onClick={onDelete}
          className="text-xs text-red-600 hover:bg-red-50"
          title="Delete this page"
        >
          <HiOutlineTrash className="w-3.5 h-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}
