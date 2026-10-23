import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as billingService from './billing.service.js';

export const recordPayment = asyncHandler(async (req, res) => {
  const result = await billingService.recordPayment(req.params.id, req.body, req.user._id);
  sendSuccess(res, result, 'Payment recorded successfully', 201);
});

export const updateBilling = asyncHandler(async (req, res) => {
  const result = await billingService.updateTaskBilling(req.params.id, req.body, req.user._id);
  sendSuccess(res, result, 'Billing updated successfully');
});

export const getBillingSummary = asyncHandler(async (req, res) => {
  const summary = await billingService.getBillingSummary();
  sendSuccess(res, summary, 'Billing summary retrieved');
});

export const getTaskReceipt = asyncHandler(async (req, res) => {
  const receipt = await billingService.getTaskReceipt(req.params.id);
  sendSuccess(res, receipt, 'Receipt data retrieved');
});

export const getServices = asyncHandler(async (req, res) => {
  const services = await billingService.getServiceTemplates();
  sendSuccess(res, services, 'Services retrieved');
});

export const updateService = asyncHandler(async (req, res) => {
  const service = await billingService.updateServiceTemplate(req.params.id, req.body);
  sendSuccess(res, service, 'Service updated successfully');
});

export const createService = asyncHandler(async (req, res) => {
  const service = await billingService.createServiceTemplate(req.body);
  sendSuccess(res, service, 'Service created successfully', 201);
});
