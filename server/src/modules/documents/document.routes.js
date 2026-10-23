import { Router } from 'express';
import authenticate from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import * as docController from './document.controller.js';

const router = Router();

// Public / token-based file serving endpoint
// We support both Authorization header and ?token=... query parameter for easy <img> and <iframe> previews
router.get('/file/:filename', (req, res, next) => {
  // If query token provided, set as Bearer header for authenticate middleware
  if (req.query.token && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, authenticate, docController.serveFile);

// All subsequent operations require authentication
router.use(authenticate);

// Standalone upload for Scan-to-PDF / workspace
router.post('/upload', upload.array('files', 20), docController.uploadStandalone);

// Scan to PDF pipeline
router.post('/scan-to-pdf', docController.scanToPdf);

// Merge PDFs pipeline
router.post('/merge-pdfs', docController.mergePdfs);

// Task-specific file routes
router.post('/tasks/:id/files', upload.array('files', 10), docController.uploadTaskFiles);
router.get('/tasks/:id/files', docController.getTaskFiles);
router.delete('/tasks/:id/files/:fileId', docController.deleteTaskFile);

export default router;
