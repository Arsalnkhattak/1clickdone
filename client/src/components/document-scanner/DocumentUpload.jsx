import React, { useState, useRef, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import {
  HiOutlineUpload,
  HiOutlineCamera,
  HiOutlineDocumentSearch,
  HiOutlineLightningBolt,
  HiOutlineDocumentText,
  HiOutlineIdentification,
} from 'react-icons/hi';
import { createSampleProposalFile, createSampleCnicFile } from '../../services/sampleDocumentService';

export default function DocumentUpload({ onAddFiles, isProcessing }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [generatingSample, setGeneratingSample] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  // Camera start / stop
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera error:', err);
      toast.error('Unable to access camera. Please use file upload instead.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const openCameraModal = async () => {
    setIsCameraOpen(true);
    await startCamera();
  };

  const closeCameraModal = () => {
    stopCamera();
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `Camera_Capture_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        onAddFiles([file]);
        toast.success('Photo captured and added to scan queue!');
      }
    }, 'image/jpeg', 0.95);

    closeCameraModal();
  };

  // Sample Loaders
  const handleLoadSampleProposal = async () => {
    setGeneratingSample(true);
    try {
      const file = await createSampleProposalFile();
      await onAddFiles([file]);
      toast.success('Sample Proposal loaded! Click "Auto Straighten" or drag handles to crop.');
    } catch (err) {
      toast.error('Failed to generate sample');
    } finally {
      setGeneratingSample(false);
    }
  };

  const handleLoadSampleCnic = async () => {
    setGeneratingSample(true);
    try {
      const file = await createSampleCnicFile();
      await onAddFiles([file]);
      toast.success('Sample Pakistani CNIC loaded! Test "CNIC Card" aspect preset & OCR.');
    } catch (err) {
      toast.error('Failed to generate sample CNIC');
    } finally {
      setGeneratingSample(false);
    }
  };

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center transition-all shadow-xl ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]'
            : 'border-emerald-500/30 bg-slate-900/90 hover:border-emerald-400 hover:bg-slate-900'
        }`}
      >
        <div className="max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 text-3xl">
            <HiOutlineDocumentSearch className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-white">
              Drop Document Photos Here
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Upload tilted document photos or ID cards. The system auto-detects corners, deskews crooked tilt, and gives you 8 control handles (corners + edge midpoints) to straighten and crop.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              disabled={isProcessing || generatingSample}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition-colors cursor-pointer"
            >
              <HiOutlineUpload className="w-4 h-4" />
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  onAddFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            <button
              type="button"
              disabled={isProcessing || generatingSample}
              onClick={openCameraModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <HiOutlineCamera className="w-4 h-4 text-emerald-400" />
              Camera Snap
            </button>
          </div>

          {/* Quick Demo Test Samples */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400">Quick Demo Tests:</span>
            <button
              type="button"
              disabled={isProcessing || generatingSample}
              onClick={handleLoadSampleProposal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
            >
              <HiOutlineDocumentText className="w-3.5 h-3.5" />
              Try Sample Proposal (A4)
            </button>
            <button
              type="button"
              disabled={isProcessing || generatingSample}
              onClick={handleLoadSampleCnic}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold transition"
            >
              <HiOutlineIdentification className="w-3.5 h-3.5" />
              Try Sample CNIC Card
            </button>
          </div>

          <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-center gap-3 flex-wrap">
            <span>• Single or Batch Multi-Page Scan</span>
            <span>• 8-Point Crop & Deskew</span>
            <span>• Built-in OCR</span>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <Modal isOpen={isCameraOpen} onClose={closeCameraModal} title="Camera Document Capture" size="xl">
          <div className="space-y-4">
            <div className="relative bg-black rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[60vh] object-contain rounded-xl"
              />
              {!cameraStream && (
                <div className="absolute text-white/60 text-xs flex flex-col items-center gap-2">
                  <HiOutlineCamera className="w-8 h-8" />
                  <span>Connecting camera...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button size="sm" variant="secondary" onClick={closeCameraModal}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={capturePhoto}
                disabled={!cameraStream}
                className="flex items-center gap-2 px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                <HiOutlineLightningBolt className="w-4 h-4" />
                Capture Document Photo
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
