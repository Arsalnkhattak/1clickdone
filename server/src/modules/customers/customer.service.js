import Customer from '../../models/Customer.js';
import Task from '../../models/Task.js';
import AppError from '../../utils/AppError.js';

export const createCustomer = async (data, userId) => {
  // Check for duplicate phone
  const existing = await Customer.findOne({ phone: data.phone });
  if (existing) {
    throw new AppError('A customer with this phone number already exists', 400);
  }

  const customer = await Customer.create({
    ...data,
    createdBy: userId,
  });

  return customer;
};

export const getAllCustomers = async ({ page = 1, limit = 20, search = '' }) => {
  const query = {};

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { phone: searchRegex },
      { customerId: searchRegex },
    ];
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Customer.countDocuments(query),
  ]);

  // Attach active task count for each customer
  const customerIds = customers.map((c) => c._id);
  const taskCounts = await Task.aggregate([
    {
      $match: {
        customerId: { $in: customerIds },
        isArchived: false,
      },
    },
    {
      $group: {
        _id: '$customerId',
        totalTasks: { $sum: 1 },
        pendingTasks: {
          $sum: {
            $cond: [
              { $in: ['$status', ['pending', 'in_progress', 'missing_documents', 'on_hold']] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const countMap = {};
  taskCounts.forEach((tc) => {
    countMap[tc._id.toString()] = {
      totalTasks: tc.totalTasks,
      pendingTasks: tc.pendingTasks,
    };
  });

  const enriched = customers.map((c) => ({
    ...c,
    taskStats: countMap[c._id.toString()] || { totalTasks: 0, pendingTasks: 0 },
  }));

  return {
    customers: enriched,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getCustomerById = async (id) => {
  const customer = await Customer.findById(id).lean();
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const tasks = await Task.find({ customerId: id })
    .sort({ createdAt: -1 })
    .populate('assignedTo', 'name email')
    .lean();

  return {
    ...customer,
    tasks,
  };
};

export const updateCustomer = async (id, data) => {
  if (data.phone) {
    const existing = await Customer.findOne({
      phone: data.phone,
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError('Another customer with this phone number already exists', 400);
    }
  }

  const customer = await Customer.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  return customer;
};

export const getCustomerTasks = async (customerId) => {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const tasks = await Task.find({ customerId })
    .sort({ createdAt: -1 })
    .populate('assignedTo', 'name email');

  return tasks;
};
