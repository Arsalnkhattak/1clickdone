import mongoose from 'mongoose';

const serviceTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
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
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      enum: ['flat', 'per_page', 'per_copy', 'per_set'],
      default: 'flat',
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const ServiceTemplate = mongoose.model('ServiceTemplate', serviceTemplateSchema);
export default ServiceTemplate;
