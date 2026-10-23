import Task from '../../models/Task.js';
import Customer from '../../models/Customer.js';
import AppError from '../../utils/AppError.js';

export const createTask = async (data, userId) => {
  const customer = await Customer.findById(data.customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const initialHistory = [
    {
      action: 'CREATED',
      statusTo: 'pending',
      note: 'Task initialized',
      performedBy: userId,
      timestamp: new Date(),
    },
  ];

  const initialNotes = [];
  if (data.initialNote) {
    initialNotes.push({
      text: data.initialNote,
      author: userId,
      createdAt: new Date(),
    });
  }

  const task = await Task.create({
    ...data,
    assignedTo: data.assignedTo || null,
    notes: initialNotes,
    history: initialHistory,
    createdBy: userId,
  });

  return task.populate([
    { path: 'customerId', select: 'name phone customerId' },
    { path: 'assignedTo', select: 'name email role' },
  ]);
};

export const getAllTasks = async ({
  page = 1,
  limit = 20,
  search = '',
  status,
  category,
  priority,
  customerId,
  assignedTo,
  isArchived = 'false',
  dueToday,
  isOverdue,
}) => {
  const query = {};

  if (isArchived === 'true') {
    query.isArchived = true;
  } else {
    query.isArchived = false;
  }

  if (status) {
    query.status = status;
  }
  if (category) {
    query.category = category;
  }
  if (priority) {
    query.priority = priority;
  }
  if (customerId) {
    query.customerId = customerId;
  }
  if (assignedTo) {
    query.assignedTo = assignedTo;
  }

  const now = new Date();
  if (isOverdue === 'true') {
    query.deadline = { $lt: now };
    query.status = { $nin: ['completed', 'cancelled'] };
  } else if (dueToday === 'true') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    query.deadline = { $gte: startOfDay, $lte: endOfDay };
    query.status = { $nin: ['completed', 'cancelled'] };
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    // Find customers matching search to include in query
    const matchingCustomers = await Customer.find({
      $or: [{ name: searchRegex }, { phone: searchRegex }, { customerId: searchRegex }],
    }).select('_id');
    const customerIds = matchingCustomers.map((c) => c._id);

    query.$or = [
      { title: searchRegex },
      { taskId: searchRegex },
      { customerId: { $in: customerIds } },
    ];
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('customerId', 'name phone customerId')
      .populate('assignedTo', 'name email role')
      .lean(),
    Task.countDocuments(query),
  ]);

  return {
    tasks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getTaskById = async (id) => {
  const task = await Task.findById(id)
    .populate('customerId', 'name phone email address customerId')
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email')
    .populate('notes.author', 'name role')
    .populate('history.performedBy', 'name role');

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  return task;
};

export const updateTask = async (id, data, userId) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  Object.assign(task, data);

  task.history.push({
    action: 'UPDATED',
    note: 'Task details updated',
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();

  return task.populate([
    { path: 'customerId', select: 'name phone customerId' },
    { path: 'assignedTo', select: 'name email role' },
  ]);
};

export const updateTaskStatus = async (id, status, note, userId) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const oldStatus = task.status;
  task.status = status;

  task.history.push({
    action: 'STATUS_CHANGED',
    statusFrom: oldStatus,
    statusTo: status,
    note: note || `Status transitioned to ${status}`,
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();

  return task.populate([
    { path: 'customerId', select: 'name phone customerId' },
    { path: 'assignedTo', select: 'name email role' },
  ]);
};

export const addTaskNote = async (id, text, userId) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  task.notes.push({
    text,
    author: userId,
    createdAt: new Date(),
  });

  task.history.push({
    action: 'NOTE_ADDED',
    note: 'Internal note added',
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();
  return task.populate('notes.author', 'name role');
};

export const updateChecklist = async (id, documents, userId) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  task.requiredDocuments = documents.map((doc) => ({
    name: doc.name,
    isSubmitted: !!doc.isSubmitted,
    submittedAt: doc.isSubmitted ? new Date() : null,
    notes: doc.notes || '',
  }));

  // Auto-flag missing documents status if any document is unsubmitted and current status is in progress
  const hasUnsubmitted = task.requiredDocuments.some((d) => !d.isSubmitted);
  if (hasUnsubmitted && task.status === 'in_progress') {
    task.status = 'missing_documents';
    task.history.push({
      action: 'STATUS_CHANGED',
      statusFrom: 'in_progress',
      statusTo: 'missing_documents',
      note: 'Auto-switched to missing documents based on checklist',
      performedBy: userId,
      timestamp: new Date(),
    });
  }

  task.history.push({
    action: 'CHECKLIST_UPDATED',
    note: 'Required document checklist updated',
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();
  return task;
};

export const cancelTask = async (id, reason, userId) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const oldStatus = task.status;
  task.status = 'cancelled';
  task.cancelReason = reason;

  task.history.push({
    action: 'CANCELLED',
    statusFrom: oldStatus,
    statusTo: 'cancelled',
    note: `Cancelled: ${reason}`,
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();
  return task;
};

export const archiveTask = async (id, userId) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  task.isArchived = true;
  task.history.push({
    action: 'ARCHIVED',
    note: 'Task archived',
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();
  return task;
};
