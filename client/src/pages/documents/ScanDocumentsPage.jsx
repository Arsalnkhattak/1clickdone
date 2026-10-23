import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import FilePreviewModal from '../../components/documents/FilePreviewModal';
import DocumentScannerModal from '../../components/documents/DocumentScannerModal';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentSearch,
  HiOutlineUpload,
  HiOutlineRefresh,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlinePlus,
  HiOutlineCamera,
} from 'react-icons/hi';

export default function ScanDocumentsPage() {
  const [pages, setPages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Settings
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState(20);
  const [outputName, setOutputName] = useState('Scanned_Document.pdf');

  // Customer & Task selector to attach directly
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Output generated PDF state
  const [generatedResult, setGeneratedResult] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  // Scanner modal
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    const fetchActiveTasks = async () => {
      try {
        setLoadingTasks(true);
        const res = await api.get('/tasks?limit=50&isArchived=false');
        setTasks(res.data.data.tasks);
      } catch {
        // Silent fallback
      } finally {
        setLoadingTasks(false);
      }
    };
    fetchActiveTasks();
  }, []);

  // Called by DocumentScannerModal with the perspective-warped File object
  const handleScannedFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('files', file);

    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newPages = res.data.data.map((f, idx) => ({
        id: `scan-${Date.now()}-${idx}-${Math.random()}`,
        storageKey: f.storageKey,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        rotation: 0,
        scanned: true, // flag so we can show a badge
      }));

      setPages((prev) => [...prev, ...newPages]);
      toast.success('Scanned page added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save scanned image');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleUploadFiles = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newPages = res.data.data.map((f, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random()}`,
        storageKey: f.storageKey,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        rotation: 0,
      }));

      setPages((prev) => [...prev, ...newPages]);
      toast.success(`${newPages.length} page(s) loaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const rotatePage = (index, deg = 90) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[index].rotation = (copy[index].rotation + deg) % 360;
      return copy;
    });
  };

  const movePage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const removePage = (index) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePdf = async () => {
    if (pages.length === 0) {
      toast.error('Please upload or scan at least one page first');
      return;
    }

    try {
      setGenerating(true);
      const payload = {
        pages: pages.map((p) => ({
          storageKey: p.storageKey,
          rotation: p.rotation,
        })),
        pageSize,
        orientation,
        margin: parseInt(margin, 10),
        outputName: outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`,
        taskId: selectedTaskId || undefined,
      };

      const res = await api.post('/documents/scan-to-pdf', payload);
      setGeneratedResult(res.data.data);
      toast.success(
        selectedTaskId
          ? 'PDF generated and attached to Task in 1Click!'
          : 'PDF generated successfully!'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const token = localStorage.getItem('1click_token');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineDocumentSearch className="w-7 h-7 text-blue-600" />
            Scan & Document Studio
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Combine scanned pages, correct orientation, reorder, and generate print-ready PDFs
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* ── Smart Scanner button ── */}
          <Button
            variant="secondary"
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <HiOutlineCamera className="w-5 h-5" />
            Smart Scan
          </Button>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors">
            <HiOutlineUpload className="w-5 h-5" />
            {uploading ? 'Processing...' : 'Upload / Add Pages'}
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={handleUploadFiles}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Generated Result Banner */}
      {generatedResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <HiOutlineCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-900">
                PDF Generated: {generatedResult.originalName}
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Size: {(generatedResult.size / 1024).toFixed(1)} KB • Ready for physical printing or customer delivery
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setPreviewFile({
                  storageKey: generatedResult.filename,
                  originalName: generatedResult.originalName,
                  mimeType: 'application/pdf',
                  size: generatedResult.size,
                })
              }
            >
              <HiOutlineEye className="w-4 h-4 mr-1" />
              Preview Output
            </Button>
            <a
              href={`/api/documents/file/${generatedResult.filename}?token=${token}&download=true`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
            >
              <HiOutlineDownload className="w-4 h-4" />
              Download PDF
            </a>
          </div>
        </div>
      )}

      {/* Main Grid: Left is Pages Gallery, Right is Print Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pages Gallery */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="text-sm font-bold text-gray-900">
              Captured Pages ({pages.length})
            </div>
            {pages.length > 0 && (
              <button
                onClick={() => setPages([])}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {pages.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <HiOutlineDocumentSearch className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-800">No pages added yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Upload image scans (JPG, PNG, WebP) or existing PDFs. You can rotate pages, reorder them, and export a clean print-ready PDF.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => setScannerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  <HiOutlineCamera className="w-4 h-4" />
                  Smart Scan (Camera / Auto-Crop)
                </button>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors">
                  <HiOutlinePlus className="w-4 h-4" />
                  Select Files
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleUploadFiles}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {pages.map((p, idx) => {
                const previewUrl = `/api/documents/file/${p.storageKey}?token=${token}`;
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
                  >
                    {/* Page header */}
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-600 flex items-center gap-1">
                        Page {idx + 1}
                        {p.scanned && (
                          <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold tracking-wide">
                            <HiOutlineCamera className="w-2.5 h-2.5" />
                            SCANNED
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {p.rotation > 0 ? `${p.rotation}°` : '0°'}
                      </span>
                    </div>

                    {/* Thumbnail Image Container */}
                    <div className="h-44 bg-slate-100/70 p-2 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={previewUrl}
                        alt={`Page ${idx + 1}`}
                        style={{ transform: `rotate(${p.rotation}deg)` }}
                        className="max-h-full max-w-full object-contain rounded transition-transform duration-200 shadow-xs"
                      />
                    </div>

                    {/* Per-page Controls */}
                    <div className="p-2 bg-white border-t border-gray-100 flex items-center justify-between gap-1">
                      <button
                        onClick={() => rotatePage(idx, 90)}
                        title="Rotate 90° Clockwise"
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <HiOutlineRefresh className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={() => movePage(idx, idx - 1)}
                          title="Move Left"
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
                        >
                          <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === pages.length - 1}
                          onClick={() => movePage(idx, idx + 1)}
                          title="Move Right"
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30"
                        >
                          <HiOutlineArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removePage(idx)}
                        title="Delete Page"
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
        </div>

        {/* Right 1 Col: Output & Print Layout Settings */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Print Layout Settings</h3>

            {/* Paper Size */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Target Paper Format
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="A4">A4 (210 × 297 mm) — Standard</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
                <option value="A5">A5 (148 × 210 mm)</option>
              </select>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    orientation === 'portrait'
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Portrait (Vertical)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    orientation === 'landscape'
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Landscape (Horizontal)
                </button>
              </div>
            </div>

            {/* Margins */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Page Margin
              </label>
              <select
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Borderless (0 pt)</option>
                <option value={10}>Narrow (10 pt)</option>
                <option value={20}>Standard (20 pt) — Recommended</option>
                <option value={36}>Wide (36 pt)</option>
              </select>
            </div>

            {/* Output File Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Output File Name
              </label>
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Attach directly to Task */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Attach directly to Customer Task (Optional)
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- None (Standalone Download) --</option>
                {tasks.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.taskId} — {t.title} ({t.customerId?.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Done in 1Click Action Button */}
            <div className="pt-3">
              <Button
                variant="primary"
                onClick={handleGeneratePdf}
                disabled={pages.length === 0 || generating}
                loading={generating}
                className="w-full py-3 text-base shadow-md font-bold"
              >
                {generating ? 'Processing PDF...' : 'Done in 1Click — Generate PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      {/* Smart Document Scanner Modal — only mounted when opened to prevent OpenCV preload */}
      {scannerOpen && (
        <DocumentScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanned={handleScannedFile}
        />
      )}
    </div>
  );
}
