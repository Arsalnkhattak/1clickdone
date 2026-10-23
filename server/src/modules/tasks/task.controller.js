import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';
import * as taskService from './task.service.js';

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user._id);
  sendSuccess(res, task, 'Task created successfully', 201);
});

export const getTasks = asyncHandler(async (req, res) => {
  const result = await taskService.getAllTasks(req.query);
  sendSuccess(res, result, 'Tasks retrieved successfully');
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id);
  sendSuccess(res, task, 'Task details retrieved');
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.body, req.user._id);
  sendSuccess(res, task, 'Task updated successfully');
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const task = await taskService.updateTaskStatus(req.params.id, status, note, req.user._id);
  sendSuccess(res, task, `Task status updated to ${status}`);
});

export const addTaskNote = asyncHandler(async (req, res) => {
  const task = await taskService.addTaskNote(req.params.id, req.body.text, req.user._id);
  sendSuccess(res, task, 'Note added to task');
});

export const updateChecklist = asyncHandler(async (req, res) => {
  const task = await taskService.updateChecklist(req.params.id, req.body.documents, req.user._id);
  sendSuccess(res, task, 'Checklist updated');
});

export const cancelTask = asyncHandler(async (req, res) => {
  const task = await taskService.cancelTask(req.params.id, req.body.reason, req.user._id);
  sendSuccess(res, task, 'Task cancelled');
});

export const archiveTask = asyncHandler(async (req, res) => {
  const task = await taskService.archiveTask(req.params.id, req.user._id);
  sendSuccess(res, task, 'Task archived');
});
