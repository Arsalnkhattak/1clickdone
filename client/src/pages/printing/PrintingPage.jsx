/**
 * PrintingPage — unified printing hub with tabs:
 *   • A4 Printing       — upload files, set layout, generate print-ready PDF
 *   • Custom Printing   — exact dimensions (mm/cm/in), multi-copy grid
 *   • Multiple Files    — upload many files at once, merge into one PDF
 *   • Poster / Large    — coming soon
 *   • ID Card Print     — coming soon
 */
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import FilePreviewModal from '../../components/documents/FilePreviewModal';
import ImageEditorModal from '../../components/editor/ImageEditorModal';
import toast from 'react-hot-toast';
import {
  HiOutlinePrinter,
  HiOutlineTemplate,
  HiOutlineCollection,
  HiOutlineViewGrid,
  HiOutlineIdentification,
  HiOutlineUpload,
  HiOutlineCheck,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineRefresh,
  HiOutlinePencil,
  HiOutlineClock,
} from 'react-icons/hi';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'a4',       label: 'A4 Printing',      icon: HiOutlinePrinter },
  { id: 'custom',   label: 'Custom Printing',   icon: HiOutlineTemplate },
  { id: 'multiple', label: 'Multiple Files',    icon: HiOutlineCollection },
  { id: 'poster',   label: 'Poster / Large',    icon: HiOutlineViewGrid },
  { id: 'idcard',   label: 'ID Card Print',     icon: HiOutlineIdentification },
];

// ─── Reusable task selector ───────────────────────────────────────────────────
function TaskSelector({ tasks, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
        Attach to Customer Task (Optional)
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  );
}

// ─── Result banner ────────────────────────────────────────────────────────────
function ResultBanner({ result, onPreview, token }) {
  if (!result) return null;
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <HiOutlineCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="text-sm font-bold text-emerald-900">{result.originalName}</div>
          <div className="text-xs text-emerald-700 mt-0.5">
            {(result.size / 1024).toFixed(1)} KB — ready to print
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onPreview}>
          <HiOutlineEye className="w-4 h-4 mr-1" /> Preview
        </Button>
        <a
          href={`/api/documents/file/${result.filename}?token=${token}&download=true`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
        >
          <HiOutlineDownload className="w-4 h-4" /> Download PDF
        </a>
      </div>
    </div>
  );
}

// ─── Coming Soon placeholder ──────────────────────────────────────────────────
function ComingSoonTab({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <HiOutlineClock className="w-7 h-7 text-blue-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — A4 Printing
// ════════════════════════════════════════════════════════════════════════════
function A4PrintingTab({ tasks, token }) {
  const [pages, setPages]             = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [pageSize, setPageSize]       = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin]           = useState(20);
  const [outputName, setOutputName]   = useState('A4_Print.pdf');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [result, setResult]           = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    const formData = new FormData();
    for (const f of files) formData.append('files', f);
    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newPages = res.data.data.map((f, i) => ({
        id: `${Date.now()}-${i}`,
        storageKey: f.storageKey,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        rotation: 0,
      }));
      setPages((prev) => [...prev, ...newPages]);
      toast.success(`${newPages.length} file(s) added`);
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const rotatePage = (i) => setPages((p) => {
    const c = [...p]; c[i] = { ...c[i], rotation: (c[i].rotation + 90) % 360 }; return c;
  });
  const movePage = (from, to) => {
    if (to < 0 || to >= pages.length) return;
    setPages((p) => { const c = [...p]; const [m] = c.splice(from, 1); c.splice(to, 0, m); return c; });
  };
  const removePage = (i) => setPages((p) => p.filter((_, idx) => idx !== i));

  const handleGenerate = async () => {
    if (!pages.length) { toast.error('Add at least one file first'); return; }
    try {
      setGenerating(true);
      const res = await api.post('/documents/scan-to-pdf', {
        pages: pages.map((p) => ({ storageKey: p.storageKey, rotation: p.rotation })),
        pageSize, orientation, margin: parseInt(margin),
        outputName: outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`,
        taskId: selectedTaskId || undefined,
      });
      setResult(res.data.data);
      toast.success('PDF generated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-5">
      <ResultBanner result={result} token={token}
        onPreview={() => setPreviewFile({ storageKey: result.filename, originalName: result.originalName, mimeType: 'application/pdf', size: result.size })} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pages list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
            <span className="text-sm font-bold text-gray-900">Files ({pages.length})</span>
            <div className="flex items-center gap-2">
              {pages.length > 0 && (
                <button onClick={() => setPages([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear All</button>
              )}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                <HiOutlineUpload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Add Files'}
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          </div>

          {pages.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center space-y-3">
              <HiOutlinePrinter className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">Upload images or PDFs to arrange and print on A4</p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                <HiOutlineUpload className="w-4 h-4" /> Select Files
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pages.map((p, idx) => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-600">Page {idx + 1}</span>
                    <span className="text-gray-400">{p.rotation}°</span>
                  </div>
                  <div className="h-36 bg-slate-100 p-2 flex items-center justify-center overflow-hidden">
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
                      <button disabled={idx === 0} onClick={() => movePage(idx, idx - 1)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30">
                        <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button disabled={idx === pages.length - 1} onClick={() => movePage(idx, idx + 1)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30">
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

        {/* Settings */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Print Settings</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Paper Size</label>
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
                <button key={o} onClick={() => setOrientation(o)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize ${orientation === o ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Margin</label>
            <select value={margin} onChange={(e) => setMargin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>Borderless (0 pt)</option>
              <option value={10}>Narrow (10 pt)</option>
              <option value={20}>Standard (20 pt)</option>
              <option value={36}>Wide (36 pt)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Output File Name</label>
            <input value={outputName} onChange={(e) => setOutputName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <TaskSelector tasks={tasks} value={selectedTaskId} onChange={setSelectedTaskId} />
          <Button variant="primary" onClick={handleGenerate} disabled={!pages.length || generating} loading={generating} className="w-full py-3 font-bold text-sm">
            {generating ? 'Generating...' : 'Done in 1Click — Generate PDF'}
          </Button>
        </div>
      </div>

      <FilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — Custom Printing (exact dimensions)
// ════════════════════════════════════════════════════════════════════════════
function CustomPrintingTab({ tasks, token }) {
  const [imageFile, setImageFile]       = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [unit, setUnit]                 = useState('mm');
  const [rawWidth, setRawWidth]         = useState(50);
  const [rawHeight, setRawHeight]       = useState(50);
  const [quantity, setQuantity]         = useState(4);
  const [paperSize, setPaperSize]       = useState('A4');
  const [orientation, setOrientation]   = useState('portrait');
  const [marginMm, setMarginMm]         = useState(10);
  const [spacingMm, setSpacingMm]       = useState(5);
  const [showCutMarks, setShowCutMarks] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [generating, setGenerating]     = useState(false);
  const [result, setResult]             = useState(null);
  const [previewFile, setPreviewFile]   = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const toMm = (v) => {
    const n = parseFloat(v) || 10;
    return unit === 'cm' ? n * 10 : unit === 'in' ? n * 25.4 : n;
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('files', file);
    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImageFile(res.data.data[0]);
      toast.success('Image uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleGenerate = async () => {
    if (!imageFile) { toast.error('Upload an image first'); return; }
    try {
      setGenerating(true);
      const res = await api.post('/print-layouts/custom', {
        storageKey: imageFile.storageKey,
        itemWidthMm: toMm(rawWidth), itemHeightMm: toMm(rawHeight),
        quantity: parseInt(quantity), paperSize, orientation,
        marginMm: parseFloat(marginMm), spacingMm: parseFloat(spacingMm),
        showCutMarks, taskId: selectedTaskId || undefined,
        outputName: `Custom_${rawWidth}x${rawHeight}${unit}_${quantity}copies.pdf`,
      });
      setResult(res.data.data);
      toast.success('Custom layout PDF generated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="space-y-5">
      <ResultBanner result={result} token={token}
        onPreview={() => setPreviewFile({ storageKey: result.filename, originalName: result.originalName, mimeType: 'application/pdf' })} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image upload */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Image / Document</h3>
            {imageFile && (
              <Button size="sm" variant="secondary" onClick={() => setIsEditorOpen(true)}>
                <HiOutlinePencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>
          <div className="h-56 bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
            {imageFile ? (
              <img src={`/api/documents/file/${imageFile.storageKey}?token=${token}`}
                alt="source" className="max-h-full max-w-full object-contain rounded" />
            ) : (
              <div className="text-center space-y-2">
                <HiOutlineTemplate className="w-10 h-10 text-gray-400 mx-auto" />
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                  <HiOutlineUpload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Choose Image'}
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
          {imageFile && (
            <label className="cursor-pointer text-xs text-blue-600 hover:underline block text-right">
              Replace
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Dimensions & Layout</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Unit</label>
            <div className="grid grid-cols-3 gap-2">
              {[{val:'mm',label:'mm'},{val:'cm',label:'cm'},{val:'in',label:'inches'}].map((u) => (
                <button key={u.val} onClick={() => setUnit(u.val)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${unit === u.val ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {u.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Width ({unit})</label>
              <input type="number" step="0.1" min="1" value={rawWidth} onChange={(e) => setRawWidth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Height ({unit})</label>
              <input type="number" step="0.1" min="1" value={rawHeight} onChange={(e) => setRawHeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Copies</label>
              <input type="number" min="1" max="200" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Paper</label>
              <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="A4">A4</option>
                <option value="Photo4x6">4×6 Photo</option>
                <option value="Letter">Letter</option>
                <option value="A5">A5</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Orientation</label>
              <select value={orientation} onChange={(e) => setOrientation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Gap (mm)</label>
              <input type="number" min="0" max="50" value={spacingMm} onChange={(e) => setSpacingMm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cutMarks" checked={showCutMarks} onChange={(e) => setShowCutMarks(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <label htmlFor="cutMarks" className="text-xs text-gray-700 cursor-pointer">Show cut guides</label>
          </div>
          <TaskSelector tasks={tasks} value={selectedTaskId} onChange={setSelectedTaskId} />
          <Button variant="primary" onClick={handleGenerate} disabled={!imageFile || generating} loading={generating} className="w-full py-3 font-bold text-sm">
            {generating ? 'Generating...' : 'Done in 1Click — Generate Custom PDF'}
          </Button>
        </div>
      </div>

      <ImageEditorModal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)}
        storageKey={imageFile?.storageKey} onImageSaved={(s) => setImageFile(s)} />
      <FilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — Multiple Files → Merge into one PDF
// ════════════════════════════════════════════════════════════════════════════
function MultipleFilesTab({ tasks, token }) {
  const [files, setFiles]             = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [merging, setMerging]         = useState(false);
  const [outputName, setOutputName]   = useState('Merged_Print.pdf');
  const [pageSize, setPageSize]       = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin]           = useState(20);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [result, setResult]           = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const handleUpload = async (e) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    const formData = new FormData();
    for (const f of selected) formData.append('files', f);
    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newFiles = res.data.data.map((f, i) => ({
        id: `${Date.now()}-${i}`, ...f, rotation: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) added`);
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const removeFile = (i) => setFiles((f) => f.filter((_, idx) => idx !== i));
  const moveFile = (from, to) => {
    if (to < 0 || to >= files.length) return;
    setFiles((f) => { const c = [...f]; const [m] = c.splice(from, 1); c.splice(to, 0, m); return c; });
  };

  const handleMerge = async () => {
    if (files.length < 1) { toast.error('Add at least one file'); return; }
    try {
      setMerging(true);
      // Use scan-to-pdf which supports images + PDFs + rotation
      const res = await api.post('/documents/scan-to-pdf', {
        pages: files.map((f) => ({ storageKey: f.storageKey, rotation: f.rotation || 0 })),
        pageSize, orientation, margin: parseInt(margin),
        outputName: outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`,
        taskId: selectedTaskId || undefined,
      });
      setResult(res.data.data);
      toast.success('All files merged into one PDF!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setMerging(false); }
  };

  return (
    <div className="space-y-5">
      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <span className="font-semibold">How it works:</span> Upload any number of images or PDFs in any order.
        They'll all be combined into a single print-ready PDF — one file, one print job.
      </div>

      <ResultBanner result={result} token={token}
        onPreview={() => setPreviewFile({ storageKey: result.filename, originalName: result.originalName, mimeType: 'application/pdf', size: result.size })} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
            <span className="text-sm font-bold text-gray-900">
              Files to Merge ({files.length})
            </span>
            <div className="flex items-center gap-2">
              {files.length > 0 && (
                <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear All</button>
              )}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                <HiOutlineUpload className="w-4 h-4" />
                {uploading ? 'Uploading...' : '+ Add Files'}
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center space-y-3">
              <HiOutlineCollection className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No files added yet</p>
              <p className="text-xs text-gray-500">Add JPG, PNG, WebP images or existing PDFs — all combined into one PDF</p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                <HiOutlineUpload className="w-4 h-4" /> Select Files
                <input type="file" multiple accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((f, idx) => (
                <div key={f.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                  {/* Order badge */}
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                    {f.mimeType?.startsWith('image/') ? (
                      <img src={`/api/documents/file/${f.storageKey}?token=${token}`}
                        alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-500">PDF</span>
                    )}
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.originalName}</p>
                    <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                  {/* Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button disabled={idx === 0} onClick={() => moveFile(idx, idx - 1)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30">
                      <HiOutlineArrowLeft className="w-4 h-4" />
                    </button>
                    <button disabled={idx === files.length - 1} onClick={() => moveFile(idx, idx + 1)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30">
                      <HiOutlineArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeFile(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Output Settings</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Paper Size</label>
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
              <option value="A5">A5</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Orientation</label>
            <div className="grid grid-cols-2 gap-2">
              {['portrait','landscape'].map((o) => (
                <button key={o} onClick={() => setOrientation(o)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all ${orientation === o ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Margin</label>
            <select value={margin} onChange={(e) => setMargin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={0}>Borderless</option>
              <option value={10}>Narrow (10 pt)</option>
              <option value={20}>Standard (20 pt)</option>
              <option value={36}>Wide (36 pt)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Output File Name</label>
            <input value={outputName} onChange={(e) => setOutputName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <TaskSelector tasks={tasks} value={selectedTaskId} onChange={setSelectedTaskId} />
          <Button variant="primary" onClick={handleMerge} disabled={!files.length || merging} loading={merging} className="w-full py-3 font-bold text-sm">
            {merging ? 'Merging...' : `Done in 1Click — Merge ${files.length} File${files.length !== 1 ? 's' : ''} into PDF`}
          </Button>
        </div>
      </div>

      <FilePreviewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Main PrintingPage
// ════════════════════════════════════════════════════════════════════════════
export default function PrintingPage() {
  const [activeTab, setActiveTab] = useState('a4');
  const [tasks, setTasks]         = useState([]);
  const token = localStorage.getItem('1click_token');

  useEffect(() => {
    api.get('/tasks?limit=50&isArchived=false')
      .then((res) => setTasks(res.data.data.tasks))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlinePrinter className="w-7 h-7 text-blue-600" />
          Printing Studio
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          A4 printing, custom sizes, merge multiple files, and more — all in one place
        </p>
      </div>

      {/* Tab bar — same style as Tasks page */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'a4'       && <A4PrintingTab       tasks={tasks} token={token} />}
        {activeTab === 'custom'   && <CustomPrintingTab   tasks={tasks} token={token} />}
        {activeTab === 'multiple' && <MultipleFilesTab    tasks={tasks} token={token} />}
        {activeTab === 'poster'   && <ComingSoonTab title="Poster & Large Format Printing" description="Print banners, posters, and large format documents. Coming soon." />}
        {activeTab === 'idcard'   && <ComingSoonTab title="ID Card Printing" description="Custom ID card layouts with batch printing support. Coming soon." />}
      </div>
    </div>
  );
}
