import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import ImageEditorModal from '../../components/editor/ImageEditorModal';
import FilePreviewModal from '../../components/documents/FilePreviewModal';
import toast from 'react-hot-toast';
import {
  HiOutlineTemplate,
  HiOutlineUpload,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineCalculator,
} from 'react-icons/hi';

export default function CustomPrintStudioPage() {
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Dimension settings
  const [unit, setUnit] = useState('mm'); // 'mm', 'cm', 'in'
  const [rawWidth, setRawWidth] = useState(50);
  const [rawHeight, setRawHeight] = useState(50);
  const [quantity, setQuantity] = useState(4);
  const [paperSize, setPaperSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [marginMm, setMarginMm] = useState(10);
  const [spacingMm, setSpacingMm] = useState(5);
  const [showCutMarks, setShowCutMarks] = useState(true);

  // Task link
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Editing state
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get('/tasks?limit=30&isArchived=false');
        setTasks(res.data.data.tasks);
      } catch {
        // Fallback silently
      }
    };
    fetchTasks();
  }, []);

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('files', file);

    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageFile(res.data.data[0]);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Convert input to millimeters for the layout engine
  const getWidthInMm = () => {
    const val = parseFloat(rawWidth) || 10;
    if (unit === 'cm') return val * 10;
    if (unit === 'in') return val * 25.4;
    return val;
  };

  const getHeightInMm = () => {
    const val = parseFloat(rawHeight) || 10;
    if (unit === 'cm') return val * 10;
    if (unit === 'in') return val * 25.4;
    return val;
  };

  const handleGenerateCustom = async () => {
    if (!imageFile) {
      toast.error('Please upload an image first');
      return;
    }

    try {
      setGenerating(true);
      const payload = {
        storageKey: imageFile.storageKey,
        itemWidthMm: getWidthInMm(),
        itemHeightMm: getHeightInMm(),
        quantity: parseInt(quantity, 10),
        paperSize,
        orientation,
        marginMm: parseFloat(marginMm),
        spacingMm: parseFloat(spacingMm),
        showCutMarks,
        taskId: selectedTaskId || undefined,
        outputName: `Custom_${rawWidth}x${rawHeight}${unit}_${quantity}copies.pdf`,
      };

      const res = await api.post('/print-layouts/custom', payload);
      setGeneratedPdf(res.data.data);
      toast.success(
        selectedTaskId
          ? 'Custom layout PDF generated & attached to customer task in 1Click!'
          : 'Custom layout PDF generated successfully!'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate layout');
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
          <HiOutlineTemplate className="w-7 h-7 text-blue-600" />
          Custom Size & Universal Print Layout Engine
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Specify exact physical measurements in millimeters, centimeters, or inches with multi-copy grid fitting
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
                PDF Created ({generatedPdf.copiesCount} copies across {generatedPdf.pagesCount} page(s))
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Physical size: {rawWidth} × {rawHeight} {unit} • Print at 100% scale
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Image Upload & Preview */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Image / Document</h3>
            {imageFile && (
              <Button size="sm" variant="secondary" onClick={() => setIsEditorOpen(true)}>
                <HiOutlinePencil className="w-3.5 h-3.5 mr-1" />
                Edit / Crop
              </Button>
            )}
          </div>

          <div className="h-64 bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center p-3 relative overflow-hidden">
            {imageFile ? (
              <img
                src={`/api/documents/file/${imageFile.storageKey}?token=${token}`}
                alt="Source"
                className="max-h-full max-w-full object-contain rounded shadow-xs"
              />
            ) : (
              <div className="text-center space-y-2">
                <HiOutlineTemplate className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500">Upload any image or document to arrange</p>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                  <HiOutlineUpload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Choose File'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImage}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {imageFile && (
            <div className="text-right">
              <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                Replace File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Right: Dimension Settings */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Physical Print Dimensions</h3>

          {/* Unit selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Unit of Measurement
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'mm', label: 'Millimeters (mm)' },
                { val: 'cm', label: 'Centimeters (cm)' },
                { val: 'in', label: 'Inches (in)' },
              ].map((u) => (
                <button
                  key={u.val}
                  type="button"
                  onClick={() => setUnit(u.val)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    unit === u.val
                      ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Width ({unit})
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={rawWidth}
                onChange={(e) => setRawWidth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Height ({unit})
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={rawHeight}
                onChange={(e) => setRawHeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-900"
              />
            </div>
          </div>

          {/* Quantity & Paper */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Copies Quantity
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-900"
              />
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
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Photo4x6">4 × 6 Photo Paper</option>
                <option value="Letter">Letter Size</option>
                <option value="A5">A5 Paper</option>
                <option value="Legal">Legal Size</option>
              </select>
            </div>
          </div>

          {/* Orientation & Spacing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Gap Between Copies (mm)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={spacingMm}
                onChange={(e) => setSpacingMm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cutMarksCustom"
              checked={showCutMarks}
              onChange={(e) => setShowCutMarks(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="cutMarksCustom" className="text-xs text-gray-700 cursor-pointer">
              Print light outline / cut guides around copies
            </label>
          </div>

          {/* Task selector */}
          <div>
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

          {/* Action */}
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={handleGenerateCustom}
              disabled={!imageFile || generating}
              loading={generating}
              className="w-full py-3 text-base shadow-md font-bold"
            >
              {generating ? 'Calculating Placement...' : 'Done in 1Click — Generate Custom Layout PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <ImageEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        storageKey={imageFile?.storageKey}
        onImageSaved={(saved) => setImageFile(saved)}
      />

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
