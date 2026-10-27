import React, { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { HiOutlineCamera, HiOutlineRefresh } from 'react-icons/hi';

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCaptureFile,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (deviceId = '') => {
    stopStream();
    setErrorMsg('');

    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Enumerate available video inputs
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (!selectedDeviceId && videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setErrorMsg('Could not access camera. Please check browser camera permissions or try uploading a file.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(selectedDeviceId);
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [isOpen, selectedDeviceId]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    setIsCapturing(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to capture camera frame');
          setIsCapturing(false);
          return;
        }

        const filename = `Camera_Scan_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg', lastModified: Date.now() });

        onCaptureFile(file);
        toast.success('Document captured & scanning!');
        setIsCapturing(false);
        onClose();
      }, 'image/jpeg', 0.95);
    } catch (err) {
      toast.error('Camera frame capture failed');
      setIsCapturing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Camera Document Capture"
      size="lg"
    >
      <div className="space-y-4">
        {errorMsg ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs space-y-2 text-center">
            <p className="font-semibold">{errorMsg}</p>
            <p className="text-gray-500">Ensure your webcam is connected or select an image file instead.</p>
          </div>
        ) : (
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800 shadow-xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Document Guide Overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center shadow-lg">
              <span className="bg-slate-900/80 backdrop-blur text-emerald-400 text-xs px-3 py-1 rounded-full font-medium border border-emerald-500/30">
                Frame document edges inside this guide
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {devices.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-semibold">Camera:</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="text-xs bg-gray-100 border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="secondary" onClick={onClose} className="text-xs">
              Cancel
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={handleCapture}
              disabled={isCapturing || !!errorMsg}
              className="flex items-center gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 font-bold px-4 py-2"
            >
              <HiOutlineCamera className="w-4 h-4 text-white" />
              <span>{isCapturing ? 'Capturing...' : 'Capture & Scan'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
