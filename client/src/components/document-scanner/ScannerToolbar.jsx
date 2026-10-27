import React, { useRef } from 'react';
import Button from '../ui/Button';
import ScannerStatus from './ScannerStatus';
import {
  HiOutlineDocumentSearch,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineCamera,
} from 'react-icons/hi';

export default function ScannerToolbar({
  documentCount = 0,
  cvReady,
  cvError,
  isProcessing,
  processingMessage,
  onAddFiles,
  onClearSession,
}) {
  const uploadInputRef = useRef(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Brand Title & Engine Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
          <HiOutlineDocumentSearch className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Universal Document Scanner
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              Staff Engine
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto boundary detection, perspective deskew, CamScanner enhancement & multi-page PDF export
          </p>
        </div>
      </div>

      {/* Status indicator & Global Actions */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <ScannerStatus
          cvReady={cvReady}
          cvError={cvError}
          isProcessing={isProcessing}
          processingMessage={processingMessage}
        />

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        <Button
          size="sm"
          variant="secondary"
          onClick={() => uploadInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-semibold"
        >
          <HiOutlineUpload className="w-4 h-4 text-gray-500" />
          Upload Photos
        </Button>
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              onAddFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />

        {documentCount > 0 && (
          <Button
            size="sm"
            variant="danger"
            onClick={onClearSession}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 border-red-200"
          >
            <HiOutlineTrash className="w-4 h-4" />
            Clear Session
          </Button>
        )}
      </div>
    </div>
  );
}
