import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Customer phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
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

// Auto-generate customerId before saving if not present
customerSchema.pre('save', async function (next) {
  if (!this.customerId) {
    const seq = await getNextSequence('customerId');
    this.customerId = `C-${seq}`;
  }
  next();
});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
