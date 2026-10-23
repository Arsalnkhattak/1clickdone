import { useState } from 'react';
import api from '../../api/axios';
import Button from '../ui/Button';
import FilePreviewModal from '../documents/FilePreviewModal';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentText,
  HiOutlinePhotograph,
  HiOutlineUpload,
  HiOutlineEye,
  HiOutlineDownload,
  HiOutlineTrash,
} from 'react-icons/hi';

const ROLE_BADGES = {
  input: { label: 'Input Document', bg: 'bg-blue-100 text-blue-800' },
  output: { label: 'Processed Output', bg: 'bg-emerald-100 text-emerald-800' },
  receipt: { label: 'Receipt / Bill', bg: 'bg-amber-100 text-amber-800' },
  supporting_doc: { label: 'Supporting Doc', bg: 'bg-purple-100 text-purple-800' },
  preview: { label: 'Preview File', bg: 'bg-gray-100 text-gray-800' },
};

export default function TaskAttachmentsSection({ task, onUpdated }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileRole, setFileRole] = useState('input');
  const [deletingId, setDeletingId] = useState(null);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('fileRole', fileRole);

    try {
      setUploading(true);
      await api.post(`/documents/tasks/${task._id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${files.length} file(s) uploaded`);
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'File upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      setDeletingId(fileId);
      await api.delete(`/documents/tasks/${task._id}/files/${fileId}`);
      toast.success('File deleted');
      if (onUpdated) onUpdated();
    } catch (err) {
      toast.error('Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const openPreview = (file) => {
    setSelectedFile(file);
    setIsPreviewOpen(true);
  };

  const token = localStorage.getItem('1click_token');

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-4">
      {/* Header & Upload Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <HiOutlineDocumentText className="w-5 h-5 text-blue-600" />
          <h4 className="font-bold text-gray-900 text-sm">
            Attached Files & Documents ({task.attachments?.length || 0})
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={fileRole}
            onChange={(e) => setFileRole(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none"
          >
            <option value="input">Input File</option>
            <option value="output">Output / Print-Ready</option>
            <option value="receipt">Receipt</option>
            <option value="supporting_doc">Supporting Doc</option>
          </select>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
            <HiOutlineUpload className="w-3.5 h-3.5" />
            {uploading ? 'Uploading...' : 'Upload File'}
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Attachments List */}
      {task.attachments?.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
          No files attached yet. Click "Upload File" above to attach documents or images.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {task.attachments?.map((file) => {
            const isPdf =
              file.mimeType === 'application/pdf' ||
              file.originalName.toLowerCase().endsWith('.pdf');
            const roleBadge = ROLE_BADGES[file.fileRole] || ROLE_BADGES.input;

            return (
              <div
                key={file._id}
                className="p-3 border border-gray-200 rounded-lg bg-white hover:border-blue-300 transition-all flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {isPdf ? (
                      <HiOutlineDocumentText className="w-5 h-5" />
                    ) : (
                      <HiOutlinePhotograph className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate" title={file.originalName}>
                      {file.originalName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${roleBadge.bg}`}>
                        {roleBadge.label}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openPreview(file)}
                    title="Preview File"
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <HiOutlineEye className="w-4 h-4" />
                  </button>
                  <a
                    href={`/api/documents/file/${file.storageKey}?token=${token}&download=true`}
                    target="_blank"
                    rel="noreferrer"
                    title="Download"
                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                  >
                    <HiOutlineDownload className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteFile(file._id)}
                    disabled={deletingId === file._id}
                    title="Delete"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Lightbox Modal */}
      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        file={selectedFile}
      />
    </div>
  );
}
