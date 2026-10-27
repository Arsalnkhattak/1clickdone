import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import authenticate from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import * as docController from './document.controller.js';
import Document from '../../models/Document.js';

const router = Router();

// Public / token-based file serving endpoint
router.get('/file/:filename', (req, res, next) => {
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authenticate, docController.serveFile);

// GET /api/documents - Fetch All Saved Documents
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching documents' });
  }
});

// DELETE /api/documents/:id - Delete Scan
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (doc && doc.imageUrl) {
      const cleanPath = doc.imageUrl.replace(/^\//, '');
      const filePath = path.join(process.cwd(), cleanPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not unlink file:', e.message);
        }
      }
    }
    res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// POST /api/documents/upload - Upload Scanned Document & OCR Text or Multiple files
const multiUploadHandler = upload.fields([
  { name: 'scanned_image', maxCount: 1 },
  { name: 'files', maxCount: 20 },
]);

router.post('/upload', multiUploadHandler, async (req, res, next) => {
  // If single scanned_image from DocumentScanner OCR
  const scannedFile = req.files?.scanned_image?.[0] || req.file;
  if (scannedFile) {
    try {
      const imageUrl = `/uploads/${scannedFile.filename}`;
      const { title, ocrText, docType, aspectPreset, filterMode } = req.body;

      const newDocument = new Document({
        title: title || 'Scanned Document',
        imageUrl: imageUrl,
        ocrText: ocrText || '',
        aspectPreset: aspectPreset || 'free',
        filterMode: filterMode || 'magic',
        docType: docType || 'A4 Document',
      });

      await newDocument.save();

      return res.status(201).json({
        success: true,
        message: 'Document saved successfully',
        data: newDocument,
      });
    } catch (error) {
      console.error('Document Upload Error:', error);
      return res.status(500).json({ success: false, message: 'Server error saving scan' });
    }
  }

  // Fallback to standalone array upload
  if (req.files?.files && req.files.files.length > 0) {
    req.files = req.files.files;
    return docController.uploadStandalone(req, res, next);
  }

  return res.status(400).json({ success: false, message: 'No image uploaded' });
});

// Authenticated Routes
router.use(authenticate);

// Cleanup temporary unreferenced files
router.post('/cleanup-temp', docController.cleanupTempFiles);

// Scan to PDF pipeline
router.post('/scan-to-pdf', docController.scanToPdf);

// Merge PDFs pipeline
router.post('/merge-pdfs', docController.mergePdfs);

// Task-specific file routes
router.post('/tasks/:id/files', upload.array('files', 10), docController.uploadTaskFiles);
router.get('/tasks/:id/files', docController.getTaskFiles);
router.delete('/tasks/:id/files/:fileId', docController.deleteTaskFile);

export default router;
