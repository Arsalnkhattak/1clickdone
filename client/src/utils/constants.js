export const APP_NAME = '1Click';
export const APP_TAGLINE = 'Done in 1Click';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

export const TASK_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  MISSING_DOCUMENTS: 'missing_documents',
  ON_HOLD: 'on_hold',
  READY_FOR_REVIEW: 'ready_for_review',
  READY_FOR_DELIVERY: 'ready_for_delivery',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const STATUS_META = {
  pending: { label: 'Pending', variant: 'warning', bg: 'bg-amber-100 text-amber-800' },
  in_progress: { label: 'In Progress', variant: 'info', bg: 'bg-blue-100 text-blue-800' },
  missing_documents: { label: 'Missing Docs', variant: 'danger', bg: 'bg-rose-100 text-rose-800' },
  on_hold: { label: 'On Hold', variant: 'default', bg: 'bg-slate-200 text-slate-800' },
  ready_for_review: { label: 'Ready Review', variant: 'info', bg: 'bg-indigo-100 text-indigo-800' },
  ready_for_delivery: { label: 'Ready Delivery', variant: 'success', bg: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', variant: 'success', bg: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', variant: 'default', bg: 'bg-gray-200 text-gray-700' },
};

export const TASK_CATEGORIES = [
  { value: 'cnic', label: 'CNIC Printing' },
  { value: 'passport_photo', label: 'Passport Photos' },
  { value: 'portrait_photo', label: 'Portrait & Photos' },
  { value: 'a4_print', label: 'A4 & Document Print' },
  { value: 'custom_print', label: 'Custom Printing' },
  { value: 'job_application', label: 'Job Application' },
  { value: 'university_admission', label: 'University Admission' },
  { value: 'college_admission', label: 'College Admission' },
  { value: 'other', label: 'Other Service' },
];

export const CATEGORY_MAP = TASK_CATEGORIES.reduce((acc, curr) => {
  acc[curr.value] = curr.label;
  return acc;
}, {});

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', badge: 'bg-gray-100 text-gray-600' },
  { value: 'normal', label: 'Normal', badge: 'bg-blue-50 text-blue-700' },
  { value: 'high', label: 'High', badge: 'bg-amber-100 text-amber-800' },
  { value: 'urgent', label: 'Urgent', badge: 'bg-red-100 text-red-800' },
];

export const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: 'HiOutlineHome' },
  { name: 'Customers', path: '/customers', icon: 'HiOutlineUsers' },
  { name: 'All Tasks', path: '/tasks', icon: 'HiOutlineClipboardList' },
  { name: 'Add New Task', path: '/tasks/new', icon: 'HiOutlinePlusCircle' },
  { name: 'Scan & Documents', path: '/scan', icon: 'HiOutlineDocumentSearch' },
  { name: 'CNIC', path: '/cnic', icon: 'HiOutlineIdentification' },
  { name: 'Passport Photos', path: '/passport', icon: 'HiOutlineCamera' },
  { name: 'Portrait & Photos', path: '/photos', icon: 'HiOutlinePhotograph' },
  { name: 'A4 Printing', path: '/a4-print', icon: 'HiOutlinePrinter' },
  { name: 'Custom Printing', path: '/custom-print', icon: 'HiOutlineTemplate' },
  { name: 'Job Applications', path: '/job-applications', icon: 'HiOutlineBriefcase' },
  { name: 'University', path: '/university', icon: 'HiOutlineAcademicCap' },
  { name: 'College', path: '/college', icon: 'HiOutlineLibrary' },
  { name: 'Other Services', path: '/other-services', icon: 'HiOutlineCog' },
  { name: 'Billing', path: '/billing', icon: 'HiOutlineCurrencyDollar' },
  { name: 'Reports', path: '/reports', icon: 'HiOutlineChartBar' },
  { name: 'Settings', path: '/settings', icon: 'HiOutlineAdjustments' },
  { name: 'Staff', path: '/users', icon: 'HiOutlineUserGroup' },
];
