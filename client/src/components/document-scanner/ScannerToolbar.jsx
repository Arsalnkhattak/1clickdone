import React, { useRef } from 'react';
import Button from '../ui/Button';
import ScannerStatus from './ScannerStatus';
import {
  HiOutlineDocumentSearch,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineCamera,
  HiOutlineDocumentText,
  HiOutlineIdentification,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { createSampleProposalFile, createSampleCnicFile } from '../../services/sampleDocumentService';
import toast from 'react-hot-toast';

export default function ScannerToolbar({
  documentCount = 0,
  cvReady,
  cvError,
  isProcessing,
  processingMessage,
  onAddFiles,
  onClearSession,
  onOpenCamera,
  onOpenOcr,
}) {
  const uploadInputRef = useRef(null);

  const handleLoadSample = async (type) => {
    try {
      const file = type === 'cnic' ? await createSampleCnicFile() : await createSampleProposalFile();
      onAddFiles([file]);
      toast.success(type === 'cnic' ? 'Sample CNIC loaded!' : 'Sample Proposal loaded!');
    } catch (err) {
      toast.error('Failed to load sample');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Brand Title & Engine Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
          <HiOutlineSparkles className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent leading-tight">
              Auto AI Document Scanner & Deskew Studio
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              8-Point Crop & OCR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto Canny contour detection, 8-handle edge resize, Homography deskew, Magic Color & OCR
          </p>
        </div>
      </div>

      {/* Status indicator & Global Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <ScannerStatus
          cvReady={cvReady}
          cvError={cvError}
          isProcessing={isProcessing}
          processingMessage={processingMessage}
        />

        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* Demo Samples Dropdown/Buttons */}
        <button
          type="button"
          onClick={() => handleLoadSample('proposal')}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition flex items-center gap-1"
          title="Load sample A4 Proposal with text & tables"
        >
          <HiOutlineDocumentText className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sample Proposal</span>
        </button>

        <button
          type="button"
          onClick={() => handleLoadSample('cnic')}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition flex items-center gap-1"
          title="Load sample Pakistani CNIC Card"
        >
          <HiOutlineIdentification className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sample CNIC</span>
        </button>

        {/* Camera Capture */}
        <button
          type="button"
          onClick={onOpenCamera}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
        >
          <HiOutlineCamera className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">Camera</span>
        </button>

        {/* File Upload */}
        <Button
          size="sm"
          variant="primary"
          onClick={() => uploadInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
        >
          <HiOutlineUpload className="w-4 h-4" />
          Upload
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
            className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 border-red-500/30"
          >
            <HiOutlineTrash className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
