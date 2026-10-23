import path from 'path';
import fs from 'fs';
import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as documentService from './document.service.js';
import AppError from '../../utils/AppError.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');

export const uploadTaskFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', 400);
  }

  const { fileRole = 'input' } = req.body;
  const attachments = await documentService.attachFilesToTask(
    req.params.id,
    req.files,
    fileRole,
    req.user._id
  );

  sendSuccess(res, attachments, 'Files uploaded successfully', 201);
});

export const getTaskFiles = asyncHandler(async (req, res) => {
  const files = await documentService.getTaskFiles(req.params.id);
  sendSuccess(res, files, 'Task files retrieved');
});

export const deleteTaskFile = asyncHandler(async (req, res) => {
  const result = await documentService.deleteTaskFile(
    req.params.id,
    req.params.fileId,
    req.user._id
  );
  sendSuccess(res, result, 'File deleted successfully');
});

export const uploadStandalone = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', 400);
  }

  const uploadedFiles = req.files.map((f) => ({
    originalName: f.originalname,
    filename: f.filename,
    storageKey: f.filename,
    mimeType: f.mimetype,
    size: f.size,
  }));

  sendSuccess(res, uploadedFiles, 'Files uploaded successfully');
});

export const scanToPdf = asyncHandler(async (req, res) => {
  const { pages, pageSize, orientation, margin, outputName, taskId } = req.body;

  const result = await documentService.createPdfFromPages({
    pages,
    pageSize,
    orientation,
    margin,
    outputName: outputName || 'scan-document.pdf',
  });

  // If taskId was passed, automatically attach the generated PDF as 'output' file
  if (taskId) {
    const fileObj = {
      originalname: result.originalName,
      mimetype: result.mimeType,
      size: result.size,
      filename: result.filename,
    };
    await documentService.attachFilesToTask(taskId, [fileObj], 'output', req.user._id);
  }

  sendSuccess(res, result, 'PDF generated successfully', 201);
});

export const mergePdfs = asyncHandler(async (req, res) => {
  const { filenames, outputName } = req.body;
  const result = await documentService.mergePdfs(filenames, outputName);
  sendSuccess(res, result, 'PDFs merged successfully', 201);
});

export const serveFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    throw new AppError('File not found', 404);
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.tiff': 'image/tiff',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);

  // If download query param is passed, force download
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  } else {
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  }

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});
