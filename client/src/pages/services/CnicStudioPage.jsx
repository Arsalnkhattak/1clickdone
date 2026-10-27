import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import ImageEditorModal from '../../components/editor/ImageEditorModal';
import FilePreviewModal from '../../components/documents/FilePreviewModal';
import SmartScanner from '../../components/documents/SmartScanner';
import toast from 'react-hot-toast';
import {
  HiOutlineIdentification,
  HiOutlineUpload,
  HiOutlineCheck,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineScissors,
  HiOutlineSparkles,
  HiOutlineRefresh,
  HiOutlineCamera,
} from 'react-icons/hi';

export default function CnicStudioPage() {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [originalFrontFile, setOriginalFrontFile] = useState(null);
  const [originalBackFile, setOriginalBackFile] = useState(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  // SmartScanner modal state — which slot is being scanned
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerSlot, setScannerSlot] = useState(null); // 'front' | 'back'

  // Layout settings
  const [quantity, setQuantity] = useState(1);
  const [paperSize, setPaperSize] = useState('A4');
  const [showCutMarks, setShowCutMarks] = useState(true);

  // Tasks linking
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Editing state
  const [editingStorageKey, setEditingStorageKey] = useState(null);
  const [editingTarget, setEditingTarget] = useState(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    api.get('/tasks?category=cnic&limit=30&isArchived=false')
      .then(res => setTasks(res.data.data.tasks))
      .catch(() => {});
  }, []);

  // ── Open SmartScanner for a slot ──────────────────────────────────────────
  const openScanner = (slot) => {
    setScannerSlot(slot);
    setScannerOpen(true);
  };

  // ── Called by SmartScanner when user confirms a scan ──────────────────────
  // Receives a File object (already warped + filtered on client side)
  const handleScanned = async (file) => {
    setScannerOpen(false);
    const slot = scannerSlot;

    const formData = new FormData();
    formData.append('files', file);

    try {
      if (slot === 'front') setUploadingFront(true);
      else setUploadingBack(true);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = res.data.data[0];

      if (slot === 'front') {
        setOriginalFrontFile(uploaded);
        setFrontFile(uploaded);
        toast.success('✨ Front side scanned & straightened!');
      } else {
        setOriginalBackFile(uploaded);
        setBackFile(uploaded);
        toast.success('✨ Back side scanned & straightened!');
      }
    } catch {
      toast.error('Upload failed after scan');
    } finally {
      if (slot === 'front') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  // ── Regular file upload (no scanning) ────────────────────────────────────
  const handleUploadSlot = async (e, slot) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('files', file);
    try {
      if (slot === 'front') setUploadingFront(true);
      else setUploadingBack(true);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = res.data.data[0];

      if (slot === 'front') { setOriginalFrontFile(uploaded); setFrontFile(uploaded); }
      else { setOriginalBackFile(uploaded); setBackFile(uploaded); }
      toast.success(slot === 'front' ? 'Front uploaded' : 'Back uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      if (slot === 'front') setUploadingFront(false);
      else setUploadingBack(false);
      e.target.value = '';
    }
  };

  const handleRevertOriginal = (slot) => {
    if (slot === 'front' && originalFrontFile) {
      setFrontFile(originalFrontFile);
      toast('Reverted to original');
    } else if (slot === 'back' && originalBackFile) {
      setBackFile(originalBackFile);
      toast('Reverted to original');
    }
  };

  const handleOpenEditor = (target) => {
    const file = target === 'front' ? frontFile : backFile;
    if (file) {
      setEditingStorageKey(file.storageKey);
      setEditingTarget(target);
    }
  };

  const handleImageSaved = (savedFile) => {
    if (editingTarget === 'front') setFrontFile(savedFile);
    else setBackFile(savedFile);
  };

  const handleGenerateCnic = async () => {
    if (!frontFile || !backFile) {
      toast.error('Please upload both Front and Back sides of the CNIC');
      return;
    }
    try {
      setGenerating(true);
      const res = await api.post('/print-layouts/cnic', {
        frontStorageKey: frontFile.storageKey,
        backStorageKey: backFile.storageKey,
        quantity: parseInt(quantity, 10),
        paperSize,
        showCutMarks,
        taskId: selectedTaskId || undefined,
        outputName: `CNIC_Print_${quantity}copies.pdf`,
      });
      setGeneratedPdf(res.data.data);
      toast.success(
        selectedTaskId
          ? 'CNIC PDF generated & attached to task!'
          : 'CNIC PDF generated successfully!'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate CNIC layout');
    } finally {
      setGenerating(false);
    }
  };

  const token = localStorage.getItem('1click_token');

  // ── Reusable upload slot renderer ─────────────────────────────────────────
  const renderSlot = (slot) => {
    const isfront    = slot === 'front';
    const file       = isfront ? frontFile       : backFile;
    const origFile   = isfront ? originalFrontFile : originalBackFile;
    const uploading  = isfront ? uploadingFront  : uploadingBack;
    const label      = isfront ? 'CNIC Front Side' : 'CNIC Back Side';
    const altText    = isfront ? 'CNIC Front'    : 'CNIC Back';

    return (
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
        {/* Slot header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-gray-900 text-sm">{label}</h3>
          {file && (
            <div className="flex items-center gap-1.5">
              {/* Smart Scan — opens SmartScanner modal */}
              <Button size="sm" variant="secondary"
                onClick={() => openScanner(slot)}
                className="flex items-center gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                <HiOutlineCamera className="w-3.5 h-3.5" />
                Smart Scan
              </Button>
              {/* Manual crop editor */}
              <Button size="sm" variant="secondary" onClick={() => handleOpenEditor(slot)}>
                <HiOutlineScissors className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Crop & Edit
              </Button>
            </div>
          )}
        </div>

        {/* Preview / upload area */}
        <div className="h-48 bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl
          flex items-center justify-center p-3 relative overflow-hidden">
          {file ? (
            <img
              src={`/api/documents/file/${file.storageKey}?token=${token}`}
              alt={altText}
              className="max-h-full max-w-full object-contain rounded shadow-xs"
            />
          ) : (
            <div className="text-center space-y-3">
              <HiOutlineIdentification className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-500">
                {isfront ? 'Upload or scan Front side of CNIC' : 'Upload or scan Back side of CNIC'}
              </p>
              {/* Smart Scan — primary CTA when empty */}
              <button
                onClick={() => openScanner(slot)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600
                  hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <HiOutlineCamera className="w-4 h-4" />
                Smart Scan (Auto-Crop)
              </button>
              {/* Plain upload */}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5
                border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold
                hover:bg-gray-50 transition-colors">
                <HiOutlineUpload className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Upload File'}
                <input type="file" accept="image/*"
                  onChange={e => handleUploadSlot(e, slot)} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Revert / replace row */}
        {file && (
          <div className="flex items-center justify-between text-xs pt-1">
            {origFile && origFile.storageKey !== file.storageKey ? (
              <button onClick={() => handleRevertOriginal(slot)}
                className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                <HiOutlineRefresh className="w-3 h-3" /> Revert to Original
              </button>
            ) : <span />}
            <label className="cursor-pointer text-blue-600 hover:underline font-medium">
              Replace Image
              <input type="file" accept="image/*"
                onChange={e => handleUploadSlot(e, slot)} className="hidden" />
            </label>
          </div>
        )}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineIdentification className="w-7 h-7 text-blue-600" />
          CNIC Printing Studio
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Standard Pakistani ID card (85.6 × 54 mm) — odd & even copy duplex support.
          Use <span className="font-semibold text-emerald-700">Smart Scan</span> to auto-detect,
          straighten and crop the card from a raw phone photo.
        </p>
      </div>

      {/* Smart Scan info banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <HiOutlineSparkles className="w-5 h-5" />
        </div>
        <div>
          <span className="text-sm font-bold text-emerald-900 block">
            Smart Scan — Auto Straighten &amp; Crop
          </span>
          <span className="text-xs text-emerald-700 block mt-0.5">
            Take a raw phone photo of the CNIC → OpenCV detects edges → perspective warp straightens it →
            Magic filter sharpens the text. No server round-trip needed.
          </span>
        </div>
      </div>

      {/* Generated PDF banner */}
      {generatedPdf && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4
          flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <HiOutlineCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-900">
                Print-Ready PDF Created ({generatedPdf.copiesCount}{' '}
                {generatedPdf.copiesCount === 1 ? 'copy' : 'copies'} ·{' '}
                {generatedPdf.rowsCount} {generatedPdf.rowsCount === 1 ? 'row' : 'rows'} ·{' '}
                {generatedPdf.pagesCount} {generatedPdf.pagesCount === 1 ? 'page' : 'pages'})
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                {generatedPdf.pagesCount === 1
                  ? 'Even copies: print same page on both sides (long-edge flip).'
                  : 'Odd copies: Page 1 front, Page 2 back (long-edge flip).'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPreviewFile({
              storageKey: generatedPdf.filename,
              originalName: generatedPdf.originalName,
              mimeType: 'application/pdf',
            })}>
              <HiOutlineEye className="w-4 h-4 mr-1" /> Preview
            </Button>
            <a href={`/api/documents/file/${generatedPdf.filename}?token=${token}&download=true`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600
                hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold">
              <HiOutlineDownload className="w-4 h-4" /> Download PDF
            </a>
          </div>
        </div>
      )}

      {/* Upload slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderSlot('front')}
        {renderSlot('back')}
      </div>

      {/* Print settings */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Photocopy &amp; Print Settings</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Number of Copies
            </label>
            <select value={quantity} onChange={e => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={1}>1 Copy (2 Pages: Front P1, Back P2)</option>
              <option value={2}>2 Copies (1 Page: 1 Row)</option>
              <option value={3}>3 Copies (2 Pages: 1 Full Row + 1 Single)</option>
              <option value={4}>4 Copies (1 Page: 2 Full Rows)</option>
              <option value={5}>5 Copies (2 Pages: 2 Full Rows + 1 Single)</option>
              <option value={6}>6 Copies (1 Page: 3 Full Rows)</option>
              <option value={7}>7 Copies (2 Pages: 3 Full Rows + 1 Single)</option>
              <option value={8}>8 Copies (1 Page: 4 Full Rows)</option>
              <option value={9}>9 Copies (2 Pages: 4 Full Rows + 1 Single)</option>
              <option value={10}>10 Copies (1 Page: 5 Full Rows)</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Starts 5 mm from top. Even = 1 page (print both sides). Odd = 2 pages.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Paper Format
            </label>
            <select value={paperSize} onChange={e => setPaperSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="A4">A4 Paper (Standard)</option>
              <option value="Letter">Letter Size</option>
              <option value="A5">A5 Paper</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="cutMarks" checked={showCutMarks}
            onChange={e => setShowCutMarks(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="cutMarks" className="text-xs text-gray-700 cursor-pointer">
            Include cut guides &amp; border outlines around cards
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Attach to Customer Task (Optional)
          </label>
          <select value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">-- None (Standalone PDF) --</option>
            {tasks.map(t => (
              <option key={t._id} value={t._id}>
                {t.taskId} — {t.title} ({t.customerId?.name})
              </option>
            ))}
          </select>
        </div>

        <Button variant="primary" onClick={handleGenerateCnic}
          disabled={!frontFile || !backFile || generating} loading={generating}
          className="w-full py-3 text-base font-bold shadow-md">
          {generating ? 'Calculating 100% Scale…' : 'Done in 1Click — Generate Print-Ready CNIC PDF'}
        </Button>
      </div>

      {/* SmartScanner modal — only mounted when open */}
      {scannerOpen && (
        <SmartScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanned={handleScanned}
        />
      )}

      {/* Image editor modal */}
      <ImageEditorModal
        isOpen={!!editingStorageKey}
        onClose={() => setEditingStorageKey(null)}
        storageKey={editingStorageKey}
        onImageSaved={handleImageSaved}
      />

      {/* PDF preview modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
