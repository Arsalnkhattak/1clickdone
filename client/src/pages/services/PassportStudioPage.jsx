import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import ImageEditorModal from '../../components/editor/ImageEditorModal';
import FilePreviewModal from '../../components/documents/FilePreviewModal';
import toast from 'react-hot-toast';
import {
  HiOutlineCamera,
  HiOutlineUpload,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineSparkles,
  HiOutlineRefresh,
} from 'react-icons/hi';

const BG_PRESETS = [
  { name: 'White', color: '#FFFFFF', desc: 'Passport / Visa / CNIC' },
  { name: 'Passport Blue', color: '#2563EB', desc: 'Pak Gov Jobs & Degrees' },
  { name: 'Sky Blue', color: '#38BDF8', desc: 'Light Blue' },
  { name: 'Studio Grey', color: '#E5E7EB', desc: 'Neutral Grey' },
  { name: 'Black', color: '#111827', desc: 'Studio Black' },
  { name: 'Red', color: '#DC2626', desc: 'Asian Visas' },
];

export default function PassportStudioPage() {
  const [photoFile, setPhotoFile] = useState(null);
  const [originalPhotoFile, setOriginalPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFFFF');
  const [changingBg, setChangingBg] = useState(false);

  // Settings
  const [photoSize, setPhotoSize] = useState('35x45');
  const [customW, setCustomW] = useState(35);
  const [customH, setCustomH] = useState(45);
  const [quantity, setQuantity] = useState(8);
  const [paperSize, setPaperSize] = useState('A4');
  const [showCutMarks, setShowCutMarks] = useState(true);

  // Link to task
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Editing state
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Output
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get('/tasks?category=passport_photo&limit=30&isArchived=false');
        setTasks(res.data.data.tasks);
      } catch {
        // Fallback silently
      }
    };
    fetchTasks();
  }, []);

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('files', file);

    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = res.data.data[0];
      setPhotoFile(uploaded);
      setOriginalPhotoFile(uploaded);
      toast.success('Portrait uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleChangeBackground = async (colorToUse) => {
    const targetColor = colorToUse || selectedBgColor;
    const current = originalPhotoFile || photoFile;
    if (!current) {
      toast.error('Please upload a photo first');
      return;
    }

    try {
      setChangingBg(true);
      const res = await api.post('/print-layouts/change-background', {
        storageKey: current.storageKey,
        backgroundColor: targetColor,
      });

      setPhotoFile(res.data.data);
      toast.success(`✨ Studio background applied (${targetColor})!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change background');
    } finally {
      setChangingBg(false);
    }
  };

  const handleRevertOriginal = () => {
    if (originalPhotoFile) {
      setPhotoFile(originalPhotoFile);
      toast('Reverted to original photo');
    }
  };

  const handleGeneratePassport = async () => {
    if (!photoFile) {
      toast.error('Please upload a portrait photo first');
      return;
    }

    try {
      setGenerating(true);
      const payload = {
        storageKey: photoFile.storageKey,
        photoSize,
        customWidthMm: photoSize === 'custom' ? customW : undefined,
        customHeightMm: photoSize === 'custom' ? customH : undefined,
        quantity: parseInt(quantity, 10),
        paperSize,
        showCutMarks,
        taskId: selectedTaskId || undefined,
        outputName: `Passport_${photoSize}_${quantity}copies.pdf`,
      };

      const res = await api.post('/print-layouts/passport', payload);
      setGeneratedPdf(res.data.data);
      toast.success(
        selectedTaskId
          ? 'Passport photos PDF generated & attached to customer task in 1Click!'
          : 'Passport photos PDF generated successfully!'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate passport layout');
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
          <HiOutlineCamera className="w-7 h-7 text-blue-600" />
          Passport Photo Studio
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Automatic grid generator with AI background color changer (White, Blue, Grey, Black) for 35×45mm, 2×2 inch US Visa, and custom portraits.
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
                Print-Ready PDF Created ({generatedPdf.copiesCount} copies on {paperSize})
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Physical scaling calibrated for 100% actual-size print accuracy
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
        {/* Left: Portrait Upload & Studio Background Changer */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Portrait Photograph</h3>
            {photoFile && (
              <Button size="sm" variant="secondary" onClick={() => setIsEditorOpen(true)}>
                <HiOutlinePencil className="w-3.5 h-3.5 mr-1" />
                Edit & Crop
              </Button>
            )}
          </div>

          <div className="h-64 bg-slate-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center p-3 relative overflow-hidden">
            {photoFile ? (
              <img
                src={`/api/documents/file/${photoFile.storageKey}?token=${token}`}
                alt="Portrait"
                className="max-h-full max-w-full object-contain rounded shadow-xs"
              />
            ) : (
              <div className="text-center space-y-2">
                <HiOutlineCamera className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500">Upload portrait photo of the customer</p>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                  <HiOutlineUpload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Choose Portrait File'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPhoto}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* AI Background Color Selector */}
          {photoFile && (
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-3.5 rounded-xl border border-blue-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <HiOutlineSparkles className="w-4 h-4 text-amber-500" />
                  Studio Background Color (بیک گراؤنڈ بدلیں):
                </span>
                {originalPhotoFile && originalPhotoFile.storageKey !== photoFile.storageKey && (
                  <button
                    type="button"
                    onClick={handleRevertOriginal}
                    className="text-[11px] text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 font-medium"
                  >
                    <HiOutlineRefresh className="w-3 h-3" /> Revert Original
                  </button>
                )}
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-2 flex-wrap">
                {BG_PRESETS.map((p) => {
                  const isSelected = selectedBgColor.toLowerCase() === p.color.toLowerCase();
                  return (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => {
                        setSelectedBgColor(p.color);
                        handleChangeBackground(p.color);
                      }}
                      disabled={changingBg}
                      className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-white shadow-xs ring-2 ring-blue-500/20'
                          : 'border-gray-200 bg-white/70 hover:bg-white'
                      }`}
                      title={p.desc}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-gray-300 shadow-2xs shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-gray-800">{p.name}</span>
                    </button>
                  );
                })}

                {/* Custom Color Input */}
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white/70 hover:bg-white cursor-pointer text-xs font-semibold">
                  <input
                    type="color"
                    value={selectedBgColor}
                    onChange={(e) => {
                      setSelectedBgColor(e.target.value);
                      handleChangeBackground(e.target.value);
                    }}
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-gray-700">Custom</span>
                </label>
              </div>

              {changingBg && (
                <div className="flex items-center gap-2 text-xs text-blue-700 font-medium pt-1 animate-pulse">
                  <HiOutlineSparkles className="w-4 h-4 text-amber-500 animate-spin" />
                  Replacing outdoor background with studio {selectedBgColor} color...
                </div>
              )}
            </div>
          )}

          {photoFile && (
            <div className="text-right">
              <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                Replace Portrait
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadPhoto}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Right: Layout & Specifications */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Passport Specifications</h3>

          {/* Size Preset */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Photo Dimension Standard
            </label>
            <select
              value={photoSize}
              onChange={(e) => setPhotoSize(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="35x45">35 × 45 mm (Standard Pakistani Passport / UK / EU)</option>
              <option value="2x2in">2 × 2 inches / 51 × 51 mm (US Visa / India Visa)</option>
              <option value="33x48">33 × 48 mm (China Visa)</option>
              <option value="custom">Custom Dimensions (mm)</option>
            </select>
          </div>

          {/* Custom dimensions if chosen */}
          {photoSize === 'custom' && (
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600">Width (mm)</label>
                <input
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600">Height (mm)</label>
                <input
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* Quantity & Paper */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Quantity of Copies
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={4}>4 Copies</option>
                <option value={8}>8 Copies (Standard)</option>
                <option value={12}>12 Copies</option>
                <option value={16}>16 Copies</option>
                <option value={24}>24 Copies</option>
                <option value={32}>32 Copies</option>
              </select>
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
                <option value="Photo4x6">4 × 6 Photo Paper</option>
                <option value="Letter">Letter Size</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cutMarksPassport"
              checked={showCutMarks}
              onChange={(e) => setShowCutMarks(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="cutMarksPassport" className="text-xs text-gray-700 cursor-pointer">
              Include subtle cut guides around each photo
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
              onClick={handleGeneratePassport}
              disabled={!photoFile || generating}
              loading={generating}
              className="w-full py-3 text-base shadow-md font-bold"
            >
              {generating ? 'Calculating Layout...' : 'Done in 1Click — Generate Passport Grid PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <ImageEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        storageKey={photoFile?.storageKey}
        onImageSaved={(saved) => setPhotoFile(saved)}
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
