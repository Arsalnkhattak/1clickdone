import React, { useState, useRef, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import {
  HiOutlineUpload,
  HiOutlineCamera,
  HiOutlineDocumentSearch,
  HiOutlineLightningBolt,
  HiOutlinePhotograph,
} from 'react-icons/hi';

export default function DocumentUpload({ onAddFiles, isProcessing }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

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

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-600 bg-blue-50/70 scale-[0.99]'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
            <HiOutlineDocumentSearch className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900">
              Drag & Drop document photos here
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Supports mobile camera photos, scanned pages, ID cards, receipts, and book pages.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
              onClick={openCameraModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <HiOutlineCamera className="w-4 h-4 text-gray-500" />
              Camera Snap
            </button>
          </div>

          <div className="text-[11px] text-gray-400 pt-2 flex items-center justify-center gap-2 flex-wrap">
            <span>• Formats: JPG, PNG, WebP</span>
            <span>• Max 10 MB per file</span>
            <span>• Universal Document Engine</span>
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
                className="flex items-center gap-2 px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700"
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
