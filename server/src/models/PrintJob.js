import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const printJobSchema = new mongoose.Schema(
  {
    jobNumber: {
      type: String,
      unique: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: ['scan_and_print', 'document_scan', 'photocopy', 'id_card', 'custom_print'],
      default: 'document_scan',
    },
    pageCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    paperSize: {
      type: String,
      default: 'A4',
    },
    customDimensions: {
      widthMm: { type: Number },
      heightMm: { type: Number },
    },
    colorMode: {
      type: String,
      enum: ['color', 'grayscale', 'bw'],
      default: 'color',
    },
    copies: {
      type: Number,
      default: 1,
      min: 1,
    },
    layoutDistribution: {
      type: String,
      enum: ['1-up', '2-up', 'custom'],
      default: '1-up',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'printed', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      index: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    files: [
      {
        originalName: { type: String, required: true },
        storageKey: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

printJobSchema.pre('save', async function (next) {
  if (!this.jobNumber) {
    const seq = await getNextSequence('printJobId');
    this.jobNumber = `PJ-${seq}`;
  }
  next();
});

const PrintJob = mongoose.model('PrintJob', printJobSchema);
export default PrintJob;
