import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import ImageEditorModal from '../../components/editor/ImageEditorModal';
import FilePreviewModal from '../../components/documents/FilePreviewModal';
import toast from 'react-hot-toast';
import {
  HiOutlinePhotograph,
  HiOutlineUpload,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineScissors,
  HiOutlinePrinter,
  HiOutlineSparkles,
} from 'react-icons/hi';

const PHOTO_SIZES = [
  { id: '4x6', label: '4 × 6 in (102 × 152 mm)', desc: 'Standard 4R Photo Lab Print', wMm: 102, hMm: 152 },
  { id: '5x7', label: '5 × 7 in (127 × 178 mm)', desc: '5R Studio Portrait', wMm: 127, hMm: 178 },
  { id: 'a4', label: 'Full A4 (210 × 297 mm)', desc: 'Full Page Portrait Poster', wMm: 210, hMm: 297 },
  { id: 'a5', label: 'Half A4 (148 × 210 mm)', desc: 'Large A5 Portrait', wMm: 148, hMm: 210 },
  { id: 'wallet', label: 'Wallet Size (64 × 89 mm)', desc: 'Pocket / Purse Portrait', wMm: 64, hMm: 89 },
  { id: 'custom', label: 'Custom mm Size', desc: 'Specify exact physical width & height', wMm: 102, hMm: 152 },
];

export default function PortraitStudioPage() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Formatting settings
  const [photoSize, setPhotoSize] = useState('4x6');
  const [customWidthMm, setCustomWidthMm] = useState(102);
  const [customHeightMm, setCustomHeightMm] = useState(152);
  const [fitMode, setFitMode] = useState('cover'); // 'cover' or 'contain'
  const [positionOnPage, setPositionOnPage] = useState('top'); // 'top' (saves paper) or 'center'
  const [paperSize, setPaperSize] = useState('A4'); // 'A4' or 'Photo4x6'
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [showCutMarks, setShowCutMarks] = useState(true);

  // Link to task
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get('/tasks?limit=30&isArchived=false');
        setTasks(res.data.data.tasks || []);
      } catch {
        // Fallback silently
      }
    };
    fetchTasks();
  }, []);

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local object URL for instant live preview
    const localUrl = URL.createObjectURL(file);
    setImagePreviewUrl(localUrl);
    setRotation(0);

    const formData = new FormData();
    formData.append('files', file);

    try {
      setUploading(true);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageFile(res.data.data[0]);
      toast.success('Portrait photo uploaded successfully');
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleGeneratePortrait = async () => {
    if (!imageFile) {
      toast.error('Please upload a photo first');
      return;
    }

    try {
      setGenerating(true);
      const payload = {
        storageKey: imageFile.storageKey,
        photoSize,
        customWidthMm: photoSize === 'custom' ? parseFloat(customWidthMm) : undefined,
        customHeightMm: photoSize === 'custom' ? parseFloat(customHeightMm) : undefined,
        fitMode,
        positionOnPage,
        paperSize,
        rotation,
        showCutMarks,
        taskId: selectedTaskId || undefined,
        outputName: `Portrait_${photoSize}_${fitMode}.pdf`,
      };

      const res = await api.post('/print-layouts/portrait', payload);
      setGeneratedPdf(res.data.data);
      toast.success(
        selectedTaskId
          ? 'Portrait print PDF generated & attached to customer task!'
          : 'Portrait print PDF generated successfully!'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate portrait layout');
    } finally {
      setGenerating(false);
    }
  };

  const token = localStorage.getItem('1click_token');

  // Active dimensions
  const activePreset = PHOTO_SIZES.find((s) => s.id === photoSize);
  const currentWidthMm = photoSize === 'custom' ? customWidthMm : (activePreset?.wMm || 102);
  const currentHeightMm = photoSize === 'custom' ? customHeightMm : (activePreset?.hMm || 152);
  const isA4Full = photoSize === 'a4';

  // A4 dimensions ratio: 210mm x 297mm
  // 4x6 ratio: ~ 102mm x 152mm (occupies ~ 48.5% width, ~ 51.1% height of A4)
  const photoWidthPercent = isA4Full ? 100 : Math.min(95, (currentWidthMm / 210) * 100);
  const photoHeightPercent = isA4Full ? 100 : Math.min(95, (currentHeightMm / 297) * 100);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlinePhotograph className="w-7 h-7 text-blue-600" />
            Single Portrait Photo Studio
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Epson Photo+ style single portrait photo print — 100% exact scale, top-positioned on A4 to save photo paper
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <HiOutlineCheck className="w-3.5 h-3.5 mr-1" />
            1-Photo Portrait Mode
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <HiOutlineScissors className="w-3.5 h-3.5 mr-1" />
            Paper Saver Layout
          </span>
        </div>
      </div>

      {/* Generated Banner */}
      {generatedPdf && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <HiOutlineCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-900">
                Ready to Print! (High-Quality 300 DPI PDF)
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Size: {currentWidthMm} × {currentHeightMm} mm • {fitMode === 'cover' ? 'Full Bleed (Cover)' : 'Full Image with Borders (Contain)'} • Top A4 Position
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
              Preview Sheet
            </Button>
            <a
              href={`/api/documents/file/${generatedPdf.filename}?token=${token}&download=true`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              Print / Download PDF
            </a>
          </div>
        </div>
      )}

      {/* Main Grid: Controls (Left) vs Real-Time Sheet Preview (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* Left Column: Photo & Layout Options (7 cols) */}
        <div className="md:col-span-7 space-y-5">

          {/* Card 1: Upload Photo */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="font-bold text-gray-900 text-sm">Select Customer Photo</h3>
              </div>
              {imageFile && (
                <div className="flex items-center gap-2">
                  <Button size="xs" variant="secondary" onClick={handleRotate} title="Rotate photo 90°">
                    <HiOutlineRefresh className="w-3.5 h-3.5 mr-1" />
                    Rotate ({rotation}°)
                  </Button>
                  <Button size="xs" variant="secondary" onClick={() => setIsEditorOpen(true)}>
                    <HiOutlinePencil className="w-3.5 h-3.5 mr-1" />
                    Edit / Crop
                  </Button>
                </div>
              )}
            </div>

            {!imageFile ? (
              <label className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-gray-50/50 hover:bg-blue-50/20 group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleUploadImage}
                  disabled={uploading}
                />
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <HiOutlineUpload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {uploading ? 'Uploading picture...' : 'Click or Drag & Drop Portrait Photo'}
                </span>
                <span className="text-xs text-gray-400 mt-1">Supports JPG, PNG, WEBP (Single photo)</span>
              </label>
            ) : (
              <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="w-20 h-24 bg-gray-200 rounded-lg overflow-hidden shrink-0 border border-gray-300 flex items-center justify-center relative">
                  <img
                    src={imagePreviewUrl || `/api/documents/file/${imageFile.storageKey}?token=${token}`}
                    alt="Uploaded Portrait"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className="w-full h-full object-cover transition duration-200"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{imageFile.originalName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(imageFile.size / 1024).toFixed(1)} KB • Rotation: {rotation}°
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline">
                      Change Photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleUploadImage}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Photo Dimensions & Formatting */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-bold text-gray-900 text-sm">Print Size & Framing Format</h3>
            </div>

            {/* Size Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Photo Print Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PHOTO_SIZES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setPhotoSize(size.id)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      photoSize === size.id
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900">{size.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 truncate">{size.desc}</div>
                  </button>
                ))}
              </div>

              {photoSize === 'custom' && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Width (mm)</label>
                    <input
                      type="number"
                      min="20"
                      max="300"
                      value={customWidthMm}
                      onChange={(e) => setCustomWidthMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Height (mm)</label>
                    <input
                      type="number"
                      min="20"
                      max="400"
                      value={customHeightMm}
                      onChange={(e) => setCustomHeightMm(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Fit Mode: Cover vs Contain */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Framing / Fit Style
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                    fitMode === 'cover'
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    [■]
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Cover (Full Bleed)</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                      Fills entire 4×6 photo frame edge-to-edge. No white borders.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                    fitMode === 'contain'
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    [⬚]
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">Contain (Full Photo)</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                      Fits full picture without cropping heads or feet. Clean white borders.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Paper Placement & Size */}
            <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Position on Paper
                </label>
                <select
                  value={positionOnPage}
                  onChange={(e) => setPositionOnPage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="top">Top of Page (Paper Saver • Cuts & Saves Bottom)</option>
                  <option value="center">Center of Page (Even Margins)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Paper Type
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="A4">A4 Photo Paper Sheet (210 × 297 mm)</option>
                  <option value="Photo4x6">Dedicated 4×6 Photo Paper Tray</option>
                </select>
              </div>
            </div>

            {/* Cut Marks Toggle */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCutMarks}
                  onChange={(e) => setShowCutMarks(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-xs font-medium text-gray-700">
                  Print Cutting Guide (Subtle border for straight scissors / paper cutter cut)
                </span>
              </label>
            </div>

            {/* Optional Task selector */}
            {tasks.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Attach to Customer Task (Optional)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                >
                  <option value="">-- None (Standalone Print) --</option>
                  {tasks.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.taskId} — {t.title} ({t.customerId?.name || 'Customer'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full py-2.5 font-bold shadow-md flex items-center justify-center gap-2"
                onClick={handleGeneratePortrait}
                loading={generating}
                disabled={!imageFile || generating}
              >
                <HiOutlinePrinter className="w-5 h-5" />
                {generating ? 'Generating 300 DPI Print PDF...' : 'Generate Ready-to-Print PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Sheet Preview (5 cols) */}
        <div className="md:col-span-5 space-y-4 md:sticky md:top-4 h-fit">
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Live Paper Layout Preview
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {paperSize === 'Photo4x6' ? '4×6 Inch Sheet' : 'A4 Sheet (210 × 297 mm)'}
              </span>
            </div>

            {/* Visual Paper Simulation */}
            <div className="bg-slate-950 p-4 rounded-lg flex items-center justify-center min-h-[460px]">
              {/* Paper Canvas (Aspect Ratio 210:297 for A4 or 102:152 for 4x6) */}
              <div
                className={`bg-white rounded shadow-2xl relative flex flex-col transition-all duration-300 ${
                  paperSize === 'Photo4x6' ? 'w-[240px] h-[360px]' : 'w-[260px] h-[368px]'
                }`}
                style={{
                  justifyContent: isA4Full ? 'center' : (positionOnPage === 'top' || paperSize === 'Photo4x6' ? 'flex-start' : 'center'),
                  alignItems: 'center',
                  paddingTop: !isA4Full && positionOnPage === 'top' && paperSize !== 'Photo4x6' ? '12px' : '0px',
                }}
              >
                {/* Photo Container on the Sheet */}
                <div
                  className={`relative transition-all duration-200 overflow-hidden ${
                    showCutMarks && !isA4Full ? 'border border-gray-400 border-dashed' : ''
                  }`}
                  style={{
                    width: `${photoWidthPercent}%`,
                    height: `${photoHeightPercent}%`,
                    backgroundColor: fitMode === 'contain' ? '#ffffff' : '#f1f5f9',
                  }}
                >
                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Preview on sheet"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        objectFit: fitMode === 'contain' ? 'contain' : 'cover',
                      }}
                      className="w-full h-full transition duration-150"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                      <HiOutlinePhotograph className="w-8 h-8 mb-1 opacity-40 text-blue-500" />
                      <span className="text-[10px] font-medium text-gray-500">
                        {currentWidthMm} × {currentHeightMm} mm
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {fitMode === 'cover' ? 'Full Bleed' : 'With Margin'}
                      </span>
                    </div>
                  )}

                  {/* Dimension pill */}
                  <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                    {currentWidthMm}×{currentHeightMm}mm
                  </div>
                </div>

                {/* Scissor / Cut Line indicator when on Top position of A4 (only for sub-A4 sizes) */}
                {positionOnPage === 'top' && paperSize === 'A4' && !isA4Full && (
                  <div className="w-full px-2 mt-2 flex flex-col items-center">
                    <div className="w-full border-b border-dashed border-red-400 relative my-1">
                      <div className="absolute -top-2.5 left-2 bg-white px-1 flex items-center gap-1 text-[9px] text-red-500 font-bold">
                        <HiOutlineScissors className="w-3 h-3" />
                        <span>Cut Here</span>
                      </div>
                    </div>

                    {/* Bottom Saved Paper Area */}
                    <div className="w-full flex-1 min-h-[90px] border border-dashed border-emerald-300 rounded bg-emerald-50/40 mt-1 flex flex-col items-center justify-center text-center p-2">
                      <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                        <HiOutlineCheck className="w-3 h-3" />
                        Saved Photo Paper Area
                      </span>
                      <span className="text-[9px] text-emerald-600 mt-0.5">
                        ~140 mm clean glossy sheet left for next print!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Legend & Details */}
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Target Dimensions:</span>
                <span className="font-mono text-slate-200">{currentWidthMm} × {currentHeightMm} mm ({photoSize})</span>
              </div>
              <div className="flex justify-between">
                <span>Framing:</span>
                <span className="font-mono text-slate-200 capitalize">{fitMode}</span>
              </div>
              <div className="flex justify-between">
                <span>Placement:</span>
                <span className="font-mono text-slate-200">
                  {positionOnPage === 'top' ? 'Top of A4 (Paper Saver)' : 'Center'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Image Editor Modal */}
      {isEditorOpen && imageFile && (
        <ImageEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          storageKey={imageFile.storageKey}
          onSaveSuccess={(newDoc) => {
            setImageFile(newDoc);
            setImagePreviewUrl(`/api/documents/file/${newDoc.storageKey}?token=${token}&t=${Date.now()}`);
            setIsEditorOpen(false);
            toast.success('Edited photo applied');
          }}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
