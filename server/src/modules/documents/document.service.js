import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import sharp from 'sharp';
import Task from '../../models/Task.js';
import AppError from '../../utils/AppError.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');

// Standard page dimensions in points (72 points = 1 inch)
// A4: 595.28 x 841.89 points (210 x 297 mm)
// Letter: 612 x 792 points (8.5 x 11 inches)
const PAGE_SIZES = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  A5: [419.53, 595.28],
  Legal: [612, 1008],
};

export const attachFilesToTask = async (taskId, files, fileRole = 'input', userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const newAttachments = files.map((f) => ({
    originalName: f.originalname,
    mimeType: f.mimetype,
    size: f.size,
    storageKey: f.filename,
    fileRole,
    uploadedBy: userId,
    createdAt: new Date(),
  }));

  task.attachments.push(...newAttachments);

  task.history.push({
    action: 'FILES_UPLOADED',
    note: `${files.length} file(s) attached (${fileRole})`,
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();
  return task.attachments;
};

export const getTaskFiles = async (taskId) => {
  const task = await Task.findById(taskId).populate('attachments.uploadedBy', 'name role');
  if (!task) {
    throw new AppError('Task not found', 404);
  }
  return task.attachments;
};

export const deleteTaskFile = async (taskId, fileId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const attachment = task.attachments.id(fileId);
  if (!attachment) {
    throw new AppError('Attachment not found', 404);
  }

  // Delete file from disk if it exists
  const filePath = path.join(uploadDir, attachment.storageKey);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn('Could not delete physical file:', err.message);
    }
  }

  task.attachments.pull({ _id: fileId });

  task.history.push({
    action: 'FILE_DELETED',
    note: `File ${attachment.originalName} removed`,
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();
  return { message: 'File deleted successfully' };
};

export const createPdfFromPages = async ({
  pages = [],
  pageSize = 'A4',
  orientation = 'portrait',
  margin = 20, // margin in points
  outputName = 'scanned-document.pdf',
}) => {
  if (!pages || pages.length === 0) {
    throw new AppError('No pages provided for PDF generation', 400);
  }

  const pdfDoc = await PDFDocument.create();

  let [stdWidth, stdHeight] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  if (orientation === 'landscape') {
    [stdWidth, stdHeight] = [stdHeight, stdWidth];
  }

  for (const pageItem of pages) {
    const filename = pageItem.storageKey || pageItem.filename;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const rotationAngle = parseInt(pageItem.rotation || 0, 10) % 360;

    // Check if input is already a PDF
    if (filename.toLowerCase().endsWith('.pdf')) {
      const existingPdfBytes = fs.readFileSync(filePath);
      const existingDoc = await PDFDocument.load(existingPdfBytes);
      const copiedPages = await pdfDoc.copyPages(existingDoc, existingDoc.getPageIndices());
      for (const p of copiedPages) {
        if (rotationAngle !== 0) {
          const currentRot = p.getRotation().angle;
          p.setRotation(degrees(currentRot + rotationAngle));
        }
        pdfDoc.addPage(p);
      }
      continue;
    }

    // Process image with sharp: handle rotation & ensure JPEG/PNG buffer
    let imagePipeline = sharp(filePath);
    if (rotationAngle !== 0) {
      imagePipeline = imagePipeline.rotate(rotationAngle);
    }

    const processedBuffer = await imagePipeline.jpeg({ quality: 90 }).toBuffer();
    const embeddedImage = await pdfDoc.embedJpg(processedBuffer);

    // Calculate scaling to fit within page dimensions with margins
    const availableWidth = stdWidth - margin * 2;
    const availableHeight = stdHeight - margin * 2;

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    // Center image on the page
    const x = (stdWidth - scaledWidth) / 2;
    const y = (stdHeight - scaledHeight) / 2;

    const newPage = pdfDoc.addPage([stdWidth, stdHeight]);
    newPage.drawImage(embeddedImage, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outputFilename = `pdf-${Date.now()}-${outputName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const outputPath = path.join(uploadDir, outputFilename);
  fs.writeFileSync(outputPath, pdfBytes);

  return {
    filename: outputFilename,
    originalName: outputName,
    size: pdfBytes.length,
    mimeType: 'application/pdf',
  };
};

export const mergePdfs = async (filenames = [], outputName = 'merged.pdf') => {
  if (filenames.length < 2) {
    throw new AppError('At least 2 PDF files are required for merging', 400);
  }

  const mergedDoc = await PDFDocument.create();

  for (const filename of filenames) {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new AppError(`File ${filename} not found on server`, 404);
    }
    const pdfBytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((p) => mergedDoc.addPage(p));
  }

  const mergedBytes = await mergedDoc.save();
  const outputFilename = `merged-${Date.now()}-${outputName}`;
  const outputPath = path.join(uploadDir, outputFilename);
  fs.writeFileSync(outputPath, mergedBytes);

  return {
    filename: outputFilename,
    originalName: outputName,
    size: mergedBytes.length,
    mimeType: 'application/pdf',
  };
};
