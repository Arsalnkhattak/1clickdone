import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  downloadDocumentPdf,
  triggerDirectPrint,
  downloadPageAsImage,
} from '../../services/documentExportService';
import {
  HiOutlineDownload,
  HiOutlinePrinter,
  HiOutlinePhotograph,
  HiOutlineClipboardCheck,
  HiOutlineCheck,
  HiOutlineShoppingCart,
  HiOutlineDocumentAdd,
} from 'react-icons/hi';

export default function ExportPanel({
  documents = [],
  activeDocument,
  settings,
}) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [attachingToTask, setAttachingToTask] = useState(false);

  // Print Job Order Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobServiceType, setJobServiceType] = useState('document_scan');
  const [jobCopies, setJobCopies] = useState(1);
  const [jobPrice, setJobPrice] = useState(20);
  const [jobCustomerId, setJobCustomerId] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [creatingJob, setCreatingJob] = useState(false);

  // Fetch recent tasks and customers for linking
  useEffect(() => {
    api.get('/tasks?limit=40&isArchived=false')
      .then((res) => setTasks(res.data.data?.tasks || []))
      .catch(() => {});

    api.get('/customers?limit=100')
      .then((res) => setCustomers(res.data.data?.customers || []))
      .catch(() => {});
  }, []);

  // Update default price when copies or document count changes
  useEffect(() => {
    const pageCount = documents.length || 1;
    const ratePerPage = jobServiceType === 'scan_and_print' ? 30 : 15;
    setJobPrice(pageCount * jobCopies * ratePerPage);
  }, [documents.length, jobCopies, jobServiceType]);

  const handleDownloadPdf = async () => {
    if (!documents.length) {
      toast.error('Add at least one document page first.');
      return;
    }

    try {
      setExportingPdf(true);
      await downloadDocumentPdf(documents, settings, settings.outputFileName || 'Scanned_Document.pdf');
      toast.success('High-quality PDF generated and downloaded!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to generate PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (!documents.length) {
      toast.error('Add at least one document page first.');
      return;
    }

    try {
      setPrinting(true);
      await triggerDirectPrint(documents, settings);
      toast.success('Print dialog opened!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to trigger print dialog.');
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadCurrentImage = (format = 'jpeg') => {
    if (!activeDocument) return;
    downloadPageAsImage(activeDocument, format);
    toast.success(`Downloaded page as ${format.toUpperCase()}`);
  };

  const handleAttachToTask = async () => {
    if (!documents.length) {
      toast.error('Add at least one document page first.');
      return;
    }
    if (!selectedTaskId) {
      toast.error('Please select a customer task first.');
      return;
    }

    try {
      setAttachingToTask(true);
      const formData = new FormData();
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const res = await fetch(doc.processedDataUrl || doc.originalDataUrl);
        const blob = await res.blob();
        formData.append('files', blob, `scan-page-${i + 1}.jpg`);
      }

      const uploadRes = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedFiles = uploadRes.data.data;
      await api.post('/documents/scan-to-pdf', {
        pages: uploadedFiles.map((f) => ({ storageKey: f.storageKey, rotation: 0 })),
        pageSize: settings.paperSize === 'custom' ? 'A4' : settings.paperSize,
        orientation: settings.orientation === 'auto' ? 'portrait' : settings.orientation,
        margin: settings.marginMm * 2.83, // mm to pt
        outputName: settings.outputFileName || 'Scanned_Document.pdf',
        taskId: selectedTaskId,
      });

      toast.success('Scanned PDF attached directly to Customer Task!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to attach scan to task');
    } finally {
      setAttachingToTask(false);
    }
  };

  const handleCreatePrintJob = async (e) => {
    e.preventDefault();
    if (!documents.length) {
      toast.error('Add at least one document page first.');
      return;
    }

    try {
      setCreatingJob(true);
      // Upload current pages
      const formData = new FormData();
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const res = await fetch(doc.processedDataUrl || doc.originalDataUrl);
        const blob = await res.blob();
        formData.append('files', blob, `scan-page-${i + 1}.jpg`);
      }

      const uploadRes = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedFiles = uploadRes.data.data.map((f) => ({
        originalName: f.originalName,
        storageKey: f.storageKey,
        mimeType: f.mimeType,
        size: f.size,
      }));

      // Determine colorMode based on active document filter
      const activeFilter = activeDocument?.filter;
      const colorMode = activeFilter === 'bw' ? 'bw' : activeFilter === 'grayscale' ? 'grayscale' : 'color';

      const jobPayload = {
        serviceType: jobServiceType,
        pageCount: documents.length,
        paperSize: settings.paperSize || 'A4',
        customDimensions: settings.paperSize === 'custom' ? {
          widthMm: settings.customWidthMm,
          heightMm: settings.customHeightMm,
        } : undefined,
        colorMode,
        copies: Number(jobCopies) || 1,
        layoutDistribution: settings.layoutDistribution || '1-up',
        price: Number(jobPrice) || 0,
        currency: 'PKR',
        notes: jobNotes,
        customerId: jobCustomerId || undefined,
        taskId: selectedTaskId || undefined,
        files: uploadedFiles,
      };

      const res = await api.post('/print-jobs', jobPayload);
      const createdJob = res.data.data;
      toast.success(`Print Job ${createdJob.jobNumber} created in system!`);
      setIsJobModalOpen(false);
      setJobNotes('');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create print job');
    } finally {
      setCreatingJob(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-4">
      <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100">
        <HiOutlineDownload className="w-4 h-4 text-emerald-600" />
        <h3 className="font-bold text-gray-900 text-sm">Print & Export Actions</h3>
      </div>

      {/* Main Download & Print Buttons */}
      <div className="space-y-2">
        <Button
          variant="primary"
          onClick={handleDownloadPdf}
          disabled={!documents.length || exportingPdf}
          loading={exportingPdf}
          className="w-full py-2.5 font-bold text-sm bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2"
        >
          <HiOutlineDownload className="w-4 h-4" />
          {exportingPdf ? 'Building Printable PDF...' : `Download PDF (${documents.length} Page${documents.length !== 1 ? 's' : ''})`}
        </Button>

        <Button
          variant="secondary"
          onClick={handlePrint}
          disabled={!documents.length || printing}
          loading={printing}
          className="w-full py-2 font-semibold text-xs border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-1.5"
        >
          <HiOutlinePrinter className="w-4 h-4" />
          Direct Browser Print (100% Vector Scale)
        </Button>

        <Button
          variant="secondary"
          onClick={() => setIsJobModalOpen(true)}
          disabled={!documents.length}
          className="w-full py-2 font-semibold text-xs border-purple-300 text-purple-700 hover:bg-purple-50 flex items-center justify-center gap-1.5"
        >
          <HiOutlineShoppingCart className="w-4 h-4" />
          Create Print Job Order
        </Button>
      </div>

      {/* Single Page Image Download */}
      {activeDocument && (
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
            Current Page Only
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDownloadCurrentImage('jpeg')}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1"
            >
              <HiOutlinePhotograph className="w-3.5 h-3.5 text-gray-500" />
              JPEG Image
            </button>
            <button
              type="button"
              onClick={() => handleDownloadCurrentImage('png')}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1"
            >
              <HiOutlinePhotograph className="w-3.5 h-3.5 text-gray-500" />
              PNG Image
            </button>
          </div>
        </div>
      )}

      {/* Attach to Task in MongoDB */}
      <div className="pt-2 border-t border-gray-100 space-y-2">
        <label className="block text-[11px] font-semibold text-gray-500 uppercase">
          Link to Customer Task (Optional)
        </label>
        <select
          value={selectedTaskId}
          onChange={(e) => {
            const taskId = e.target.value;
            setSelectedTaskId(taskId);
            const foundTask = tasks.find((t) => t._id === taskId);
            if (foundTask?.customerId?._id) {
              setJobCustomerId(foundTask.customerId._id);
            }
          }}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Standalone (No Task Linked) --</option>
          {tasks.map((t) => (
            <option key={t._id} value={t._id}>
              {t.taskId} — {t.title} ({t.customerId?.name || 'Customer'})
            </option>
          ))}
        </select>

        {selectedTaskId && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAttachToTask}
            disabled={!documents.length || attachingToTask}
            loading={attachingToTask}
            className="w-full text-xs font-bold bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 flex items-center justify-center gap-1.5"
          >
            <HiOutlineClipboardCheck className="w-4 h-4 text-emerald-600" />
            Save & Attach to Task
          </Button>
        )}
      </div>

      {/* Create Print Job Modal */}
      <Modal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        title="Create New Print Job Order"
        size="md"
      >
        <form onSubmit={handleCreatePrintJob} className="space-y-4 text-left">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-center justify-between">
            <span>
              <strong>{documents.length} page(s)</strong> ready for print service.
            </span>
            <span className="font-semibold uppercase text-[10px] bg-blue-200 px-2 py-0.5 rounded">
              {settings.paperSize} • {settings.layoutDistribution}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Service Type
              </label>
              <select
                value={jobServiceType}
                onChange={(e) => setJobServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="document_scan">Document Scan</option>
                <option value="scan_and_print">Scan & Print</option>
                <option value="photocopy">Photocopy</option>
                <option value="id_card">ID Card / CNIC</option>
                <option value="custom_print">Custom Print</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Number of Copies
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={jobCopies}
                onChange={(e) => setJobCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Customer (Optional)
              </label>
              <select
                value={jobCustomerId}
                onChange={(e) => setJobCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Walk-in / Unregistered --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Price (PKR)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={jobPrice}
                onChange={(e) => setJobPrice(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Staff Work Notes & Print Instructions
            </label>
            <textarea
              rows="2"
              value={jobNotes}
              onChange={(e) => setJobNotes(e.target.value)}
              placeholder="e.g. 80gsm paper, double sided, high contrast text..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsJobModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={creatingJob}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Create Job Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
