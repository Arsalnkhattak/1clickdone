import Task from '../../models/Task.js';
import Customer from '../../models/Customer.js';
import asyncHandler from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/response.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [
    totalTasks,
    pendingTasks,
    inProgressTasks,
    missingDocsTasks,
    readyForDeliveryTasks,
    completedTasks,
    cancelledTasks,
    overdueTasks,
    dueTodayTasks,
    totalCustomers,
    recentTasks,
    categoryBreakdown,
  ] = await Promise.all([
    Task.countDocuments({ isArchived: false }),
    Task.countDocuments({ status: 'pending', isArchived: false }),
    Task.countDocuments({ status: 'in_progress', isArchived: false }),
    Task.countDocuments({ status: 'missing_documents', isArchived: false }),
    Task.countDocuments({ status: 'ready_for_delivery', isArchived: false }),
    Task.countDocuments({ status: 'completed', isArchived: false }),
    Task.countDocuments({ status: 'cancelled', isArchived: false }),
    Task.countDocuments({
      deadline: { $lt: now },
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: false,
    }),
    Task.countDocuments({
      deadline: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: false,
    }),
    Customer.countDocuments(),
    Task.find({ isArchived: false })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('customerId', 'name phone customerId')
      .populate('assignedTo', 'name email role')
      .lean(),
    Task.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const summary = {
    counts: {
      total: totalTasks,
      pending: pendingTasks,
      inProgress: inProgressTasks,
      missingDocuments: missingDocsTasks,
      readyForDelivery: readyForDeliveryTasks,
      completed: completedTasks,
      cancelled: cancelledTasks,
      overdue: overdueTasks,
      dueToday: dueTodayTasks,
      totalCustomers,
    },
    recentTasks,
    categoryBreakdown: categoryBreakdown.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
  };

  sendSuccess(res, summary, 'Dashboard summary retrieved');
});
