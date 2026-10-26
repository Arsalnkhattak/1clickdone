import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
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

// ─────────────────────────────────────────────────────────────────────────────
// Core tab content — usable standalone OR embedded inside PrintingPage
// ─────────────────────────────────────────────────────────────────────────────
export function ScanDocumentsTab({ tasks: propTasks }) {
  const [pages, setPages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState(20);
  const [outputName, setOutputName] = useState('Scanned_Document.pdf');

  // Use tasks passed from parent if available, otherwise fetch own
  const [ownTasks, setOwnTasks] = useState([]);
  const tasks = propTasks ?? ownTasks;
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const [generatedResult, setGeneratedResult] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (propTasks) return; // parent supplies tasks
    api.get('/tasks?limit=50&isArchived=false')
      .then((res) => setOwnTasks(res.data.data.tasks))
      .catch(() => {});
  }, [propTasks]);

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
        scanned: true,
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
    if (!files?.length) return;
    const formData = new FormData();
    for (const f of files) formData.append('files', f);
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

  const rotatePage = (index) =>
    setPages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], rotation: (copy[index].rotation + 90) % 360 };
      return copy;
    });

  const movePage = (from, to) => {
    if (to < 0 || to >= pages.length) return;
    setPages((prev) => {
      const copy = [...prev];
      const [m] = copy.splice(from, 1);
      copy.splice(to, 0, m);
      return copy;
    });
  };

  const removePage = (index) => setPages((prev) => prev.filter((_, i) => i !== index));

  const handleGeneratePdf = async () => {
    if (!pages.length) { toast.error('Add at least one page first'); return; }
    try {
      setGenerating(true);
      const res = await api.post('/documents/scan-to-pdf', {
        pages: pages.map((p) => ({ storageKey: p.storageKey, rotation: p.rotation })),
        pageSize,
        orientation,
        margin: parseInt(margin, 10),
        outputName: outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`,
        taskId: selectedTaskId || undefined,
      });
      setGeneratedResult(res.data.data);
      toast.success(selectedTaskId ? 'PDF generated & attached to task!' : 'PDF generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const token = localStorage.getItem('1click_token');

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Upload or scan pages, reorder, rotate, then generate a print-ready PDF.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <HiOutlineCamera className="w-4 h-4" /> Smart Scan
          </Button>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
            <HiOutlineUpload className="w-4 h-4" />
            {uploading ? 'Processing...' : 'Upload / Add Pages'}
            <input type="file" multiple accept="image/*,application/pdf" disabled={uploading}
              onChange={handleUploadFiles} className="hidden" />
          </label>
        </div>
      </div>

      {/* Generated result banner */}
      {generatedResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <HiOutlineCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-900">PDF Generated: {generatedResult.originalName}</div>
              <div className="text-xs text-emerald-700">{(generatedResult.size / 1024).toFixed(1)} KB • Ready to print</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPreviewFile({
              storageKey: generatedResult.filename,
              originalName: generatedResult.originalName,
              mimeType: 'application/pdf',
              size: generatedResult.size,
            })}>
              <HiOutlineEye className="w-4 h-4 mr-1" /> Preview
            </Button>
            <a href={`/api/documents/file/${generatedResult.filename}?token=${token}&download=true`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold">
              <HiOutlineDownload className="w-4 h-4" /> Download
            </a>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pages gallery */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">Captured Pages ({pages.length})</span>
            {pages.length > 0 && (
              <button onClick={() => setPages([])} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Clear All
              </button>
            )}
          </div>

          {pages.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center space-y-3">
              <HiOutlineDocumentSearch className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No pages added yet</p>
              <p className="text-xs text-gray-400">Upload JPG, PNG, WebP or PDF — rotate, reorder, export PDF</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={() => setScannerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                  <HiOutlineCamera className="w-4 h-4" /> Smart Scan
                </button>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-50">
                  <HiOutlinePlus className="w-4 h-4" /> Select Files
                  <input type="file" multiple accept="image/*,application/pdf" onChange={handleUploadFiles} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pages.map((p, idx) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-600 flex items-center gap-1">
                      Page {idx + 1}
                      {p.scanned && (
                        <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                          <HiOutlineCamera className="w-2.5 h-2.5" /> SCANNED
                        </span>
                      )}
                    </span>
                    <span className="text-gray-400">{p.rotation}°</span>
                  </div>
                  <div className="h-40 bg-slate-100 p-2 flex items-center justify-center overflow-hidden">
                    <img src={`/api/documents/file/${p.storageKey}?token=${token}`}
                      alt={`Page ${idx + 1}`}
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                      className="max-h-full max-w-full object-contain rounded transition-transform" />
                  </div>
                  <div className="p-2 border-t border-gray-100 flex items-center justify-between">
                    <button onClick={() => rotatePage(idx)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                      <HiOutlineRefresh className="w-4 h-4" />
                    </button>
                    <div className="flex gap-0.5">
                      <button disabled={idx === 0} onClick={() => movePage(idx, idx - 1)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30">
                        <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button disabled={idx === pages.length - 1} onClick={() => movePage(idx, idx + 1)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30">
                        <HiOutlineArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button onClick={() => removePage(idx)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings panel */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Print Layout Settings</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Paper Format</label>
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter (8.5 × 11 in)</option>
              <option value="Legal">Legal (8.5 × 14 in)</option>
              <option value="A5">A5 (148 × 210 mm)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Orientation</label>
            <div className="grid grid-cols-2 gap-2">
              {['portrait', 'landscape'].map((o) => (
                <button key={o} type="button" onClick={() => setOrientation(o)}
                  className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${
                    orientation === o ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>{o}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Margin</label>
            <select value={margin} onChange={(e) => setMargin(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>Borderless (0 pt)</option>
              <option value={10}>Narrow (10 pt)</option>
              <option value={20}>Standard (20 pt) — Recommended</option>
              <option value={36}>Wide (36 pt)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Output File Name</label>
            <input type="text" value={outputName} onChange={(e) => setOutputName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Attach to Task (Optional)</label>
            <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- None (Standalone) --</option>
              {tasks.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.taskId} — {t.title} ({t.customerId?.name})
                </option>
              ))}
            </select>
          </div>

          <Button variant="primary" onClick={handleGeneratePdf}
            disabled={!pages.length || generating} loading={generating}
            className="w-full py-3 font-bold text-sm">
            {generating ? 'Processing...' : 'Done in 1Click — Generate PDF'}
          </Button>
        </div>
      </div>

      <FilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />

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

// ─────────────────────────────────────────────────────────────────────────────
// Standalone page (keeps working at /scan route)
// ─────────────────────────────────────────────────────────────────────────────
export default function ScanDocumentsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineDocumentSearch className="w-7 h-7 text-blue-600" />
          Scan & Document Studio
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Combine scanned pages, correct orientation, reorder, and generate print-ready PDFs
        </p>
      </div>
      <ScanDocumentsTab />
    </div>
  );
}
