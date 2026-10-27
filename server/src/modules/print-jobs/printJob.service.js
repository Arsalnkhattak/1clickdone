import PrintJob from '../../models/PrintJob.js';
import Task from '../../models/Task.js';
import AppError from '../../utils/AppError.js';

export const createPrintJob = async (jobData, userId) => {
  const printJob = new PrintJob({
    ...jobData,
    staffId: userId,
  });

  await printJob.save();

  // If taskId provided, attach files to task if task exists
  if (jobData.taskId && jobData.files?.length) {
    const task = await Task.findById(jobData.taskId);
    if (task) {
      const attachments = jobData.files.map((f) => ({
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        storageKey: f.storageKey,
        fileRole: 'output',
        uploadedBy: userId,
        createdAt: new Date(),
      }));

      task.attachments.push(...attachments);
      task.history.push({
        action: 'PRINT_JOB_CREATED',
        note: `Print job ${printJob.jobNumber} created (${jobData.pageCount} pages, ${jobData.copies} copies)`,
        performedBy: userId,
        timestamp: new Date(),
      });
      await task.save();
    }
  }

  return printJob;
};

export const getPrintJobs = async ({ status, customerId, limit = 50, page = 1 }) => {
  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customerId = customerId;

  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    PrintJob.find(filter)
      .populate('customerId', 'name phone')
      .populate('taskId', 'taskId title category')
      .populate('staffId', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    PrintJob.countDocuments(filter),
  ]);

  return {
    jobs,
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / limit),
  };
};

export const getPrintJobById = async (id) => {
  const job = await PrintJob.findById(id)
    .populate('customerId', 'name phone email')
    .populate('taskId', 'taskId title category status')
    .populate('staffId', 'name role');

  if (!job) {
    throw new AppError('Print job not found', 404);
  }

  return job;
};

export const updatePrintJobStatus = async (id, status, staffId) => {
  const job = await PrintJob.findById(id);
  if (!job) {
    throw new AppError('Print job not found', 404);
  }

  job.status = status;
  if (status === 'completed' || status === 'printed') {
    job.completedAt = new Date();
  }

  await job.save();
  return job;
};

export const deletePrintJob = async (id) => {
  const job = await PrintJob.findById(id);
  if (!job) {
    throw new AppError('Print job not found', 404);
  }

  await PrintJob.findByIdAndDelete(id);
  return { message: 'Print job deleted successfully' };
};
