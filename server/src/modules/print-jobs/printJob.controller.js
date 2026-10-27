import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as printJobService from './printJob.service.js';

export const createJob = asyncHandler(async (req, res) => {
  const result = await printJobService.createPrintJob(req.body, req.user._id);
  sendSuccess(res, result, 'Print job created successfully', 201);
});

export const getJobs = asyncHandler(async (req, res) => {
  const result = await printJobService.getPrintJobs(req.query);
  sendSuccess(res, result, 'Print jobs retrieved successfully');
});

export const getJobById = asyncHandler(async (req, res) => {
  const result = await printJobService.getPrintJobById(req.params.id);
  sendSuccess(res, result, 'Print job retrieved successfully');
});

export const updateJobStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const result = await printJobService.updatePrintJobStatus(req.params.id, status, req.user._id);
  sendSuccess(res, result, 'Print job status updated successfully');
});

export const deleteJob = asyncHandler(async (req, res) => {
  const result = await printJobService.deletePrintJob(req.params.id);
  sendSuccess(res, result, 'Print job deleted successfully');
});
