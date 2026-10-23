import Task from '../../models/Task.js';
import ServiceTemplate from '../../models/ServiceTemplate.js';
import AppError from '../../utils/AppError.js';

export const recordPayment = async (taskId, { amount, method = 'cash', note = '' }, userId) => {
  const payAmount = Number(amount);
  if (!payAmount || payAmount <= 0) {
    throw new AppError('Payment amount must be greater than zero', 400);
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  if (!task.billing) {
    task.billing = {
      estimatedAmount: 0,
      finalAmount: payAmount,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      payments: [],
    };
  }

  // If finalAmount is 0 or less, auto-set to at least this payment
  if (!task.billing.finalAmount || task.billing.finalAmount === 0) {
    task.billing.finalAmount = payAmount;
  }

  task.billing.payments.push({
    amount: payAmount,
    method,
    note,
    receivedBy: userId,
    receivedAt: new Date(),
  });

  task.billing.paidAmount = (task.billing.paidAmount || 0) + payAmount;

  // Calculate payment status
  if (task.billing.paidAmount >= task.billing.finalAmount) {
    task.billing.paymentStatus = 'paid';
  } else if (task.billing.paidAmount > 0) {
    task.billing.paymentStatus = 'partial';
  } else {
    task.billing.paymentStatus = 'unpaid';
  }

  task.history.push({
    action: 'PAYMENT_RECORDED',
    note: `Payment of PKR ${payAmount} received via ${method}`,
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();

  return task.populate([
    { path: 'customerId', select: 'name phone customerId' },
    { path: 'billing.payments.receivedBy', select: 'name' },
  ]);
};

export const updateTaskBilling = async (taskId, { finalAmount, estimatedAmount }, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  if (!task.billing) {
    task.billing = {
      estimatedAmount: 0,
      finalAmount: 0,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      payments: [],
    };
  }

  if (finalAmount !== undefined) task.billing.finalAmount = Number(finalAmount);
  if (estimatedAmount !== undefined) task.billing.estimatedAmount = Number(estimatedAmount);

  // Recalculate status
  if (task.billing.paidAmount >= task.billing.finalAmount && task.billing.finalAmount > 0) {
    task.billing.paymentStatus = 'paid';
  } else if (task.billing.paidAmount > 0) {
    task.billing.paymentStatus = 'partial';
  } else {
    task.billing.paymentStatus = 'unpaid';
  }

  task.history.push({
    action: 'BILLING_UPDATED',
    note: `Billing updated: Final Amount PKR ${task.billing.finalAmount}`,
    performedBy: userId,
    timestamp: new Date(),
  });

  await task.save();
  return task;
};

export const getBillingSummary = async () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [tasksWithBilling, tasksWithPayments] = await Promise.all([
    Task.find({
      'billing.finalAmount': { $gt: 0 },
      isArchived: false,
    }).select('billing customerId taskId title createdAt status'),
    Task.find({
      'billing.payments.0': { $exists: true },
      isArchived: false,
    })
      .populate('customerId', 'name phone customerId')
      .populate('billing.payments.receivedBy', 'name')
      .lean(),
  ]);

  let totalBilled = 0;
  let totalCollected = 0;
  let totalPendingBalance = 0;

  tasksWithBilling.forEach((t) => {
    const final = t.billing?.finalAmount || 0;
    const paid = t.billing?.paidAmount || 0;
    totalBilled += final;
    totalCollected += paid;
    if (final > paid) {
      totalPendingBalance += final - paid;
    }
  });

  // Calculate today's revenue from payments array
  let collectedToday = 0;
  const recentTransactions = [];

  tasksWithPayments.forEach((t) => {
    t.billing?.payments?.forEach((p) => {
      const pDate = new Date(p.receivedAt);
      if (pDate >= startOfDay && pDate <= endOfDay) {
        collectedToday += p.amount;
      }
      recentTransactions.push({
        _id: p._id,
        taskId: t.taskId,
        taskTitle: t.title,
        customerName: t.customerId?.name,
        customerPhone: t.customerId?.phone,
        amount: p.amount,
        method: p.method,
        note: p.note,
        receivedBy: p.receivedBy?.name || 'Staff',
        receivedAt: p.receivedAt,
      });
    });
  });

  // Sort transactions by latest first
  recentTransactions.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

  return {
    metrics: {
      totalBilled,
      totalCollected,
      totalPendingBalance,
      collectedToday,
      totalInvoices: tasksWithBilling.length,
    },
    recentTransactions: recentTransactions.slice(0, 20),
  };
};

export const getTaskReceipt = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate('customerId', 'name phone email address customerId')
    .populate('assignedTo', 'name')
    .populate('billing.payments.receivedBy', 'name');

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const balance = Math.max(0, (task.billing?.finalAmount || 0) - (task.billing?.paidAmount || 0));

  return {
    receiptNumber: `REC-${task.taskId}`,
    task: {
      id: task._id,
      taskId: task.taskId,
      title: task.title,
      category: task.category,
      createdAt: task.createdAt,
      status: task.status,
    },
    customer: task.customerId,
    billing: {
      estimatedAmount: task.billing?.estimatedAmount || 0,
      finalAmount: task.billing?.finalAmount || 0,
      paidAmount: task.billing?.paidAmount || 0,
      balance,
      paymentStatus: task.billing?.paymentStatus || 'unpaid',
      payments: task.billing?.payments || [],
    },
    issuedAt: new Date(),
  };
};

/**
 * Service Templates & Standard Pricing
 */
export const getServiceTemplates = async () => {
  let count = await ServiceTemplate.countDocuments();
  if (count === 0) {
    // Seed standard defaults
    const defaults = [
      { name: 'CNIC Color Photocopy (Front + Back)', category: 'cnic', price: 50, unit: 'per_set' },
      { name: 'Passport Photos (8 Copies Grid)', category: 'passport_photo', price: 200, unit: 'per_set' },
      { name: 'Passport Photos (16 Copies Grid)', category: 'passport_photo', price: 350, unit: 'per_set' },
      { name: 'A4 Black & White Document Print', category: 'a4_print', price: 10, unit: 'per_page' },
      { name: 'A4 Full Color Document Print', category: 'a4_print', price: 30, unit: 'per_page' },
      { name: 'Government Job Online Form Filing', category: 'job_application', price: 300, unit: 'flat' },
      { name: 'University Admission Form Filing', category: 'university_admission', price: 500, unit: 'flat' },
      { name: 'College Admission Form Filing', category: 'college_admission', price: 400, unit: 'flat' },
      { name: 'Document Scanning & Multi-Page PDF', category: 'other', price: 50, unit: 'flat' },
    ];
    await ServiceTemplate.insertMany(defaults);
  }

  return ServiceTemplate.find().sort({ category: 1, name: 1 });
};

export const updateServiceTemplate = async (id, data) => {
  const service = await ServiceTemplate.findByIdAndUpdate(id, data, { new: true });
  if (!service) {
    throw new AppError('Service template not found', 404);
  }
  return service;
};

export const createServiceTemplate = async (data) => {
  return ServiceTemplate.create(data);
};
