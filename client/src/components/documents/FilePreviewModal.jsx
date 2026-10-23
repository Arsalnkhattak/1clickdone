import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  HiOutlineDownload,
  HiOutlineExternalLink,
  HiOutlineRefresh,
  HiOutlineX,
} from 'react-icons/hi';

export default function FilePreviewModal({ isOpen, onClose, file }) {
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !file) return null;

  const token = localStorage.getItem('1click_token');
  const fileUrl = `/api/documents/file/${file.storageKey || file.filename}?token=${token}`;
  const isPdf =
    file.mimeType === 'application/pdf' ||
    (file.originalName && file.originalName.toLowerCase().endsWith('.pdf'));

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const downloadUrl = `/api/documents/file/${file.storageKey || file.filename}?token=${token}&download=true`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Preview: ${file.originalName || 'Document'}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500">
            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''} • {file.mimeType || ''}
          </div>
          <div className="flex items-center gap-2">
            {!isPdf && (
              <Button size="sm" variant="secondary" onClick={handleRotate} title="Rotate View">
                <HiOutlineRefresh className="w-4 h-4 mr-1" />
                Rotate
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handleDownload}>
              <HiOutlineDownload className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(fileUrl, '_blank')}
            >
              <HiOutlineExternalLink className="w-4 h-4 mr-1" />
              New Tab
            </Button>
          </div>
        </div>

        {/* Preview Content Area */}
        <div className="bg-slate-900/5 rounded-xl border border-gray-200 flex items-center justify-center p-4 min-h-[420px] max-h-[60vh] overflow-hidden">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={file.originalName}
              className="w-full h-[55vh] rounded-lg border border-gray-300 bg-white"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={fileUrl}
                alt={file.originalName}
                style={{ transform: `rotate(${rotation}deg)` }}
                className="max-h-[55vh] max-w-full object-contain rounded transition-transform duration-200 shadow-sm"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
