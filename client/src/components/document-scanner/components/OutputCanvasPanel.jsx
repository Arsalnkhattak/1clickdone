import React from 'react';
import { Download, FileText, Save, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OutputCanvasPanel({
  dstCanvasRef,
  imageLoaded,
  isOcrProcessing,
  isSaving,
  ocrText,
  setOcrText,
  onRunOCR,
  onSaveDocument,
  onDownloadScan,
}) {
  const [copied, setCopied] = React.useState(false);

  const copyOcrText = async () => {
    if (!ocrText) return;
    try {
      await navigator.clipboard.writeText(ocrText);
      setCopied(true);
      toast.success('OCR text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error('Could not copy text');
    }
  };

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            2. Scanned & Straightened Output
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDownloadScan}
              disabled={!imageLoaded}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Download size={12} /> Download
            </button>
            <button
              type="button"
              onClick={onRunOCR}
              disabled={isOcrProcessing || !imageLoaded}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <FileText size={12} /> {isOcrProcessing ? 'Extracting...' : 'Extract OCR'}
            </button>
            <button
              type="button"
              onClick={onSaveDocument}
              disabled={isSaving || !imageLoaded}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Save size={12} /> {isSaving ? 'Saving...' : 'Save Scan'}
            </button>
          </div>
        </div>

        <div className="w-full min-h-[360px] overflow-hidden rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
          {!imageLoaded ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Transformed and deskewed result will appear here.
            </div>
          ) : (
            <canvas ref={dstCanvasRef} className="max-w-full h-auto block mx-auto" />
          )}
        </div>
      </div>

      {/* OCR Result Box */}
      <div className="mt-4 pt-3 border-t border-slate-800">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-purple-400 block">
            Extracted OCR Text:
          </label>
          {ocrText && (
            <button
              type="button"
              onClick={copyOcrText}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
        <textarea
          value={ocrText}
          onChange={(e) => setOcrText(e.target.value)}
          rows={3}
          placeholder="OCR extracted text will appear here..."
          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
        />
      </div>
    </div>
  );
}
