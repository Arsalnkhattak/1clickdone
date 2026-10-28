import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as layoutService from './layout.service.js';
import * as documentService from '../documents/document.service.js';

export const generateCnic = asyncHandler(async (req, res) => {
  const {
    frontStorageKey,
    backStorageKey,
    quantity,
    paperSize,
    showCutMarks,
    outputName,
    taskId,
  } = req.body;

  const result = await layoutService.generateCnicLayout({
    frontStorageKey,
    backStorageKey,
    quantity: quantity ? parseInt(quantity, 10) : 2,
    paperSize: paperSize || 'A4',
    showCutMarks: showCutMarks !== false,
    outputName: outputName || 'CNIC_Print.pdf',
  });

  // If taskId provided, attach the generated PDF as output attachment
  if (taskId) {
    const fileObj = {
      originalname: result.originalName,
      mimetype: result.mimeType,
      size: result.size,
      filename: result.filename,
    };
    await documentService.attachFilesToTask(taskId, [fileObj], 'output', req.user._id);
  }

  sendSuccess(res, result, 'CNIC layout generated successfully', 201);
});

export const generatePassport = asyncHandler(async (req, res) => {
  const {
    storageKey,
    photoSize,
    customWidthMm,
    customHeightMm,
    quantity,
    paperSize,
    showCutMarks,
    outputName,
    taskId,
  } = req.body;

  const result = await layoutService.generatePassportLayout({
    storageKey,
    photoSize: photoSize || '35x45',
    customWidthMm,
    customHeightMm,
    quantity: quantity ? parseInt(quantity, 10) : 8,
    paperSize: paperSize || 'A4',
    showCutMarks: showCutMarks !== false,
    outputName: outputName || 'Passport_Photos.pdf',
  });

  if (taskId) {
    const fileObj = {
      originalname: result.originalName,
      mimetype: result.mimeType,
      size: result.size,
      filename: result.filename,
    };
    await documentService.attachFilesToTask(taskId, [fileObj], 'output', req.user._id);
  }

  sendSuccess(res, result, 'Passport photo layout generated successfully', 201);
});

export const generatePortrait = asyncHandler(async (req, res) => {
  const {
    storageKey,
    photoSize,
    customWidthMm,
    customHeightMm,
    fitMode,
    positionOnPage,
    paperSize,
    rotation,
    showCutMarks,
    outputName,
    taskId,
  } = req.body;

  const result = await layoutService.generatePortraitPhotoLayout({
    storageKey,
    photoSize: photoSize || '4x6',
    customWidthMm,
    customHeightMm,
    fitMode: fitMode || 'cover',
    positionOnPage: positionOnPage || 'top',
    paperSize: paperSize || 'A4',
    rotation: rotation ? parseInt(rotation, 10) : 0,
    showCutMarks: showCutMarks !== false,
    outputName: outputName || 'Portrait_Photo_Print.pdf',
  });

  if (taskId) {
    const fileObj = {
      originalname: result.originalName,
      mimetype: result.mimeType,
      size: result.size,
      filename: result.filename,
    };
    await documentService.attachFilesToTask(taskId, [fileObj], 'output', req.user._id);
  }

  sendSuccess(res, result, 'Portrait photo layout generated successfully', 201);
});

export const generateCustom = asyncHandler(async (req, res) => {
  const {
    storageKey,
    itemWidthMm,
    itemHeightMm,
    quantity,
    paperSize,
    orientation,
    marginMm,
    spacingMm,
    showCutMarks,
    outputName,
    taskId,
  } = req.body;

  const result = await layoutService.generateCustomLayout({
    storageKey,
    itemWidthMm: parseFloat(itemWidthMm) || 50,
    itemHeightMm: parseFloat(itemHeightMm) || 50,
    quantity: quantity ? parseInt(quantity, 10) : 1,
    paperSize: paperSize || 'A4',
    orientation: orientation || 'portrait',
    marginMm: marginMm !== undefined ? parseFloat(marginMm) : 10,
    spacingMm: spacingMm !== undefined ? parseFloat(spacingMm) : 5,
    showCutMarks: showCutMarks !== false,
    outputName: outputName || 'Custom_Print.pdf',
  });

  if (taskId) {
    const fileObj = {
      originalname: result.originalName,
      mimetype: result.mimeType,
      size: result.size,
      filename: result.filename,
    };
    await documentService.attachFilesToTask(taskId, [fileObj], 'output', req.user._id);
  }

  sendSuccess(res, result, 'Custom layout generated successfully', 201);
});

export const editImage = asyncHandler(async (req, res) => {
  const result = await layoutService.processImage(req.body);
  sendSuccess(res, result, 'Image processed successfully');
});

export const autoCropCard = asyncHandler(async (req, res) => {
  const { storageKey, enhance } = req.body;
  const result = await layoutService.detectAndCropCnic({
    storageKey,
    enhance: enhance !== false,
  });
  sendSuccess(res, result, 'Card detected and cropped successfully');
});

export const detectAngle = asyncHandler(async (req, res) => {
  const { storageKey } = req.body;
  const result = await layoutService.detectCardAngle({ storageKey });
  sendSuccess(res, result, 'Tilt angle calculated successfully');
});

export const changeBackground = asyncHandler(async (req, res) => {
  const { storageKey, backgroundColor } = req.body;
  const result = await layoutService.changeImageBackground({
    storageKey,
    backgroundColor: backgroundColor || '#FFFFFF',
  });
  sendSuccess(res, result, 'Background color updated successfully');
});
