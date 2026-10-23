import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as customerService from './customer.service.js';

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body, req.user._id);
  sendSuccess(res, customer, 'Customer created successfully', 201);
});

export const getCustomers = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const result = await customerService.getAllCustomers({ page, limit, search });
  sendSuccess(res, result, 'Customers retrieved successfully');
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  sendSuccess(res, customer, 'Customer details retrieved');
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  sendSuccess(res, customer, 'Customer updated successfully');
});

export const getCustomerTasks = asyncHandler(async (req, res) => {
  const tasks = await customerService.getCustomerTasks(req.params.id);
  sendSuccess(res, tasks, 'Customer tasks retrieved');
});
