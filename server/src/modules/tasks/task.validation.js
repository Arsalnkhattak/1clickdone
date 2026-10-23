import { z } from 'zod';

const categoryEnum = z.enum([
  'cnic',
  'passport_photo',
  'portrait_photo',
  'a4_print',
  'custom_print',
  'job_application',
  'university_admission',
  'college_admission',
  'other',
]);

const statusEnum = z.enum([
  'pending',
  'in_progress',
  'missing_documents',
  'on_hold',
  'ready_for_review',
  'ready_for_delivery',
  'completed',
  'cancelled',
]);

const priorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);

export const createTaskSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  title: z.string().trim().min(2, 'Task title is required'),
  category: categoryEnum,
  subcategory: z.string().trim().optional(),
  description: z.string().trim().optional(),
  priority: priorityEnum.optional().default('normal'),
  deadline: z.string().datetime().optional().or(z.literal('')).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  assignedTo: z.string().optional().or(z.literal('')),
  requiredDocuments: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        isSubmitted: z.boolean().optional().default(false),
        notes: z.string().optional().default(''),
      })
    )
    .optional(),
  applicationDetails: z
    .object({
      institution: z.string().trim().optional(),
      programOrPost: z.string().trim().optional(),
      referenceNumber: z.string().trim().optional(),
      submissionDate: z.string().optional().or(z.null()),
      feePaid: z.boolean().optional(),
      feeAmount: z.number().min(0).optional(),
      challanReceiptKey: z.string().optional(),
    })
    .optional(),
  billing: z
    .object({
      estimatedAmount: z.number().min(0).optional(),
      finalAmount: z.number().min(0).optional(),
      paidAmount: z.number().min(0).optional(),
      paymentStatus: z.enum(['unpaid', 'partial', 'paid']).optional(),
    })
    .optional(),
  initialNote: z.string().trim().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).optional(),
  category: categoryEnum.optional(),
  subcategory: z.string().trim().optional(),
  description: z.string().trim().optional(),
  priority: priorityEnum.optional(),
  deadline: z.string().optional().or(z.null()),
  assignedTo: z.string().optional().or(z.null()).or(z.literal('')),
  applicationDetails: z
    .object({
      institution: z.string().trim().optional(),
      programOrPost: z.string().trim().optional(),
      referenceNumber: z.string().trim().optional(),
      submissionDate: z.string().optional().or(z.null()),
      feePaid: z.boolean().optional(),
      feeAmount: z.number().min(0).optional(),
      challanReceiptKey: z.string().optional(),
    })
    .optional(),
  billing: z
    .object({
      estimatedAmount: z.number().min(0).optional(),
      finalAmount: z.number().min(0).optional(),
      paidAmount: z.number().min(0).optional(),
      paymentStatus: z.enum(['unpaid', 'partial', 'paid']).optional(),
    })
    .optional(),
});

export const updateTaskStatusSchema = z.object({
  status: statusEnum,
  note: z.string().trim().optional(),
});

export const addTaskNoteSchema = z.object({
  text: z.string().trim().min(1, 'Note text cannot be empty'),
});

export const updateChecklistSchema = z.object({
  documents: z.array(
    z.object({
      _id: z.string().optional(),
      name: z.string().trim().min(1),
      isSubmitted: z.boolean(),
      notes: z.string().optional(),
    })
  ),
});

export const cancelTaskSchema = z.object({
  reason: z.string().trim().min(2, 'Reason for cancellation is required'),
});
