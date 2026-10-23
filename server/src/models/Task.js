import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const requiredDocumentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isSubmitted: { type: Boolean, default: false },
    submittedAt: { type: Date },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageKey: { type: String, required: true },
    fileRole: {
      type: String,
      enum: ['input', 'output', 'preview', 'receipt', 'supporting_doc'],
      default: 'input',
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    statusFrom: { type: String },
    statusTo: { type: String },
    note: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Service category is required'],
      enum: [
        'cnic',
        'passport_photo',
        'portrait_photo',
        'a4_print',
        'custom_print',
        'job_application',
        'university_admission',
        'college_admission',
        'other',
      ],
      default: 'other',
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'in_progress',
        'missing_documents',
        'on_hold',
        'ready_for_review',
        'ready_for_delivery',
        'completed',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    deadline: {
      type: Date,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    requiredDocuments: [requiredDocumentSchema],
    attachments: [attachmentSchema],
    notes: [noteSchema],
    history: [historySchema],
    applicationDetails: {
      institution: { type: String, trim: true, default: '' },
      programOrPost: { type: String, trim: true, default: '' },
      referenceNumber: { type: String, trim: true, default: '' },
      submissionDate: { type: Date },
      feePaid: { type: Boolean, default: false },
      feeAmount: { type: Number, default: 0 },
      challanReceiptKey: { type: String, default: '' },
    },
    billing: {
      estimatedAmount: { type: Number, default: 0 },
      finalAmount: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
      paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid'],
        default: 'unpaid',
      },
      payments: [
        {
          amount: { type: Number, required: true },
          method: {
            type: String,
            enum: ['cash', 'jazzcash', 'easypaisa', 'bank_transfer', 'other'],
            default: 'cash',
          },
          note: { type: String, default: '' },
          receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          receivedAt: { type: Date, default: Date.now },
        },
      ],
    },
    cancelReason: {
      type: String,
      default: '',
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate taskId before saving if not present
taskSchema.pre('save', async function (next) {
  if (!this.taskId) {
    const seq = await getNextSequence('taskId');
    this.taskId = `T-${seq}`;
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
