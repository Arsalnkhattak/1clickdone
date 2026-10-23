import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import ImageEditorModal from '../../components/editor/ImageEditorModal';
import FilePreviewModal from '../../components/documents/FilePreviewModal';
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
} from 'react-icons/hi';

export default function CnicStudioPage() {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [originalFrontFile, setOriginalFrontFile] = useState(null);
  const [originalBackFile, setOriginalBackFile] = useState(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [autoCroppingFront, setAutoCroppingFront] = useState(false);
  const [autoCroppingBack, setAutoCroppingBack] = useState(false);
  const [autoCropOnUpload, setAutoCropOnUpload] = useState(true);

  // Layout settings
  const [quantity, setQuantity] = useState(1);
  const [paperSize, setPaperSize] = useState('A4');
  const [showCutMarks, setShowCutMarks] = useState(true);

  // Tasks linking
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Editing state
  const [editingStorageKey, setEditingStorageKey] = useState(null);
  const [editingTarget, setEditingTarget] = useState(null); // 'front' or 'back'

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get('/tasks?category=cnic&limit=30&isArchived=false');
        setTasks(res.data.data.tasks);
      } catch {
        // Fallback silently
      }
    };
    fetchTasks();
  }, []);

  const handleAutoCrop = async (slot) => {
    const current = slot === 'front' ? (originalFrontFile || frontFile) : (originalBackFile || backFile);
    if (!current) return;

    try {
      if (slot === 'front') setAutoCroppingFront(true);
      else setAutoCroppingBack(true);

      const res = await api.post('/print-layouts/auto-crop', {
        storageKey: current.storageKey,
        enhance: true,
      });

      const cropped = res.data.data;
      if (slot === 'front') {
        setFrontFile(cropped);
        toast.success('✨ Front side auto-straightened & cropped!');
      } else {
        setBackFile(cropped);
        toast.success('✨ Back side auto-straightened & cropped!');
      }
    } catch {
      toast.error('Could not auto-crop. Please use Crop & Straighten editor.');
    } finally {
      if (slot === 'front') setAutoCroppingFront(false);
      else setAutoCroppingBack(false);
    }
  };

  const handleRevertOriginal = (slot) => {
    if (slot === 'front' && originalFrontFile) {
      setFrontFile(originalFrontFile);
      toast('Reverted to original photo');
    } else if (slot === 'back' && originalBackFile) {
      setBackFile(originalBackFile);
      toast('Reverted to original photo');
    }
  };

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

      if (slot === 'front') {
        setOriginalFrontFile(uploaded);
        setFrontFile(uploaded);
      } else {
        setOriginalBackFile(uploaded);
        setBackFile(uploaded);
      }

      // If autoCropOnUpload is active, automatically straighten and crop card
      if (autoCropOnUpload) {
        try {
          const cropRes = await api.post('/print-layouts/auto-crop', {
            storageKey: uploaded.storageKey,
            enhance: true,
          });
          const cropped = cropRes.data.data;
          if (slot === 'front') {
            setFrontFile(cropped);
            toast.success('✨ Front uploaded, straightened & cropped!');
          } else {
            setBackFile(cropped);
            toast.success('✨ Back uploaded, straightened & cropped!');
          }
        } catch {
          toast.success(slot === 'front' ? 'Front uploaded' : 'Back uploaded');
        }
      } else {
        toast.success(slot === 'front' ? 'Front uploaded' : 'Back uploaded');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      if (slot === 'front') setUploadingFront(false);
      else setUploadingBack(false);
      e.target.value = '';
    }
  };

  const handleOpenEditor = (target) => {
    if (target === 'front' && frontFile) {
      setEditingStorageKey(frontFile.storageKey);
      setEditingTarget('front');
    } else if (target === 'back' && backFile) {
      setEditingStorageKey(backFile.storageKey);
      setEditingTarget('back');
    }
  };

  const handleImageSaved = (savedFile) => {
    if (editingTarget === 'front') {
      setFrontFile(savedFile);
    } else {
      setBackFile(savedFile);
    }
  };

  const handleGenerateCnic = async () => {
    if (!frontFile || !backFile) {
      toast.error('Please upload both Front and Back sides of the CNIC');
      return;
    }

    try {
      setGenerating(true);
      const payload = {
        frontStorageKey: frontFile.storageKey,
        backStorageKey: backFile.storageKey,
        quantity: parseInt(quantity, 10),
        paperSize,
        showCutMarks,
        taskId: selectedTaskId || undefined,
        outputName: `CNIC_Print_${quantity}copies.pdf`,
      };

      const res = await api.post('/print-layouts/cnic', payload);
      setGeneratedPdf(res.data.data);
      toast.success(
        selectedTaskId
          ? 'CNIC PDF generated & attached to customer task in 1Click!'
          : 'CNIC PDF generated successfully!'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate CNIC layout');
    } finally {
      setGenerating(false);
    }
  };

  const token = localStorage.getItem('1click_token');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineIdentification className="w-7 h-7 text-blue-600" />
          CNIC Printing Studio
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Standard Pakistani ID card (85.6 × 54 mm) starting 5 mm from top of page. Supports both odd & even copy duplex layouts.
        </p>
      </div>

      {/* Generated Banner */}
      {generatedPdf && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <HiOutlineCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-900">
                Print-Ready PDF Created ({generatedPdf.copiesCount} {generatedPdf.copiesCount === 1 ? 'copy' : 'copies'} · {generatedPdf.rowsCount} {generatedPdf.rowsCount === 1 ? 'row' : 'rows'} · {generatedPdf.pagesCount} {generatedPdf.pagesCount === 1 ? 'page' : 'pages'})
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                {generatedPdf.pagesCount === 1
                  ? 'Even copies: Print same page on both sides (long-edge flip) for double-sided CNIC photocopy.'
                  : 'Odd copies: Print Page 1 on front, Page 2 on back (long-edge flip) for perfectly aligned double-sided cards.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setPreviewFile({
                  storageKey: generatedPdf.filename,
                  originalName: generatedPdf.originalName,
                  mimeType: 'application/pdf',
                })
              }
            >
              <HiOutlineEye className="w-4 h-4 mr-1" />
              Preview Output
            </Button>
            <a
              href={`/api/documents/file/${generatedPdf.filename}?token=${token}&download=true`}
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

      {/* Auto-Scan & Straighten Toggle Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <HiOutlineSparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-sm font-bold text-blue-900 block">
              Auto-Scan, Deskew & Crop System
            </span>
            <span className="text-xs text-blue-700 block mt-0.5">
              Automatically straightens tilted phone photos (تصویر ٹیڑھی ہو تو سیدھی کرتا ہے) and removes background clutter.
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-blue-300 shadow-2xs hover:bg-blue-50">
          <input
            type="checkbox"
            checked={autoCropOnUpload}
            onChange={(e) => setAutoCropOnUpload(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-xs font-semibold text-blue-900 select-none">
            Auto-Scan on Upload
          </span>
        </label>
      </div>

      {/* Grid: Upload Slots & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slot 1: Front Side */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-gray-900 text-sm">CNIC Front Side</h3>
            <div className="flex items-center gap-1.5">
              {frontFile && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAutoCrop('front')}
                    loading={autoCroppingFront}
                    title="Automatically deskew and crop card"
                  >
                    <HiOutlineSparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    Auto-Scan
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleOpenEditor('front')}>
                    <HiOutlineScissors className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    Crop & Straighten
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="h-48 bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center p-3 relative overflow-hidden">
            {frontFile ? (
              <img
                src={`/api/documents/file/${frontFile.storageKey}?token=${token}`}
                alt="CNIC Front"
                className="max-h-full max-w-full object-contain rounded shadow-xs"
              />
            ) : (
              <div className="text-center space-y-2">
                <HiOutlineIdentification className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500">Upload or snap Front side of CNIC</p>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                  <HiOutlineUpload className="w-4 h-4" />
                  {uploadingFront ? 'Uploading & Scanning...' : 'Choose Front Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadSlot(e, 'front')}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
          {frontFile && (
            <div className="flex items-center justify-between text-xs pt-1">
              {originalFrontFile && originalFrontFile.storageKey !== frontFile.storageKey ? (
                <button
                  type="button"
                  onClick={() => handleRevertOriginal('front')}
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                >
                  <HiOutlineRefresh className="w-3 h-3" /> Revert to Raw Photo
                </button>
              ) : <span />}
              <label className="cursor-pointer text-blue-600 hover:underline font-medium">
                Replace Front Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadSlot(e, 'front')}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Slot 2: Back Side */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-gray-900 text-sm">CNIC Back Side</h3>
            <div className="flex items-center gap-1.5">
              {backFile && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAutoCrop('back')}
                    loading={autoCroppingBack}
                    title="Automatically deskew and crop card"
                  >
                    <HiOutlineSparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    Auto-Scan
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleOpenEditor('back')}>
                    <HiOutlineScissors className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    Crop & Straighten
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="h-48 bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center p-3 relative overflow-hidden">
            {backFile ? (
              <img
                src={`/api/documents/file/${backFile.storageKey}?token=${token}`}
                alt="CNIC Back"
                className="max-h-full max-w-full object-contain rounded shadow-xs"
              />
            ) : (
              <div className="text-center space-y-2">
                <HiOutlineIdentification className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500">Upload or snap Back side of CNIC</p>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                  <HiOutlineUpload className="w-4 h-4" />
                  {uploadingBack ? 'Uploading & Scanning...' : 'Choose Back Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadSlot(e, 'back')}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
          {backFile && (
            <div className="flex items-center justify-between text-xs pt-1">
              {originalBackFile && originalBackFile.storageKey !== backFile.storageKey ? (
                <button
                  type="button"
                  onClick={() => handleRevertOriginal('back')}
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                >
                  <HiOutlineRefresh className="w-3 h-3" /> Revert to Raw Photo
                </button>
              ) : <span />}
              <label className="cursor-pointer text-blue-600 hover:underline font-medium">
                Replace Back Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadSlot(e, 'back')}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Print Configuration Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Photocopy & Print Settings</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Number of Copies (Odd & Even Supported)
            </label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 Copy (2 Pages: Front on P1, Back on P2)</option>
              <option value={2}>2 Copies (1 Page: 1 Row Front + Back)</option>
              <option value={3}>3 Copies (2 Pages: 1 Full Row + 1 Single Copy)</option>
              <option value={4}>4 Copies (1 Page: 2 Full Rows)</option>
              <option value={5}>5 Copies (2 Pages: 2 Full Rows + 1 Single Copy)</option>
              <option value={6}>6 Copies (1 Page: 3 Full Rows)</option>
              <option value={7}>7 Copies (2 Pages: 3 Full Rows + 1 Single Copy)</option>
              <option value={8}>8 Copies (1 Page: 4 Full Rows)</option>
              <option value={9}>9 Copies (2 Pages: 4 Full Rows + 1 Single Copy)</option>
              <option value={10}>10 Copies (1 Page: 5 Full Rows)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Starts 5 mm from top of page. Even copies generate 1 page (same print on both sides). Odd copies generate 2 pages (P1 front, P2 back).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Paper Format
            </label>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="A4">A4 Paper (Standard)</option>
              <option value="Letter">Letter Size</option>
              <option value="A5">A5 Paper</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="cutMarks"
            checked={showCutMarks}
            onChange={(e) => setShowCutMarks(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="cutMarks" className="text-xs text-gray-700 cursor-pointer">
            Include light cut guides & border outlines around cards
          </label>
        </div>

        {/* Link to Task */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Attach directly to Customer Task (Optional)
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- None (Standalone PDF) --</option>
            {tasks.map((t) => (
              <option key={t._id} value={t._id}>
                {t.taskId} — {t.title} ({t.customerId?.name})
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            variant="primary"
            onClick={handleGenerateCnic}
            disabled={!frontFile || !backFile || generating}
            loading={generating}
            className="w-full py-3 text-base shadow-md font-bold"
          >
            {generating ? 'Calculating 100% Scale...' : 'Done in 1Click — Generate Print-Ready CNIC PDF'}
          </Button>
        </div>
      </div>

      {/* Image Editor Modal */}
      <ImageEditorModal
        isOpen={!!editingStorageKey}
        onClose={() => setEditingStorageKey(null)}
        storageKey={editingStorageKey}
        onImageSaved={handleImageSaved}
      />

      {/* PDF Lightbox Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
