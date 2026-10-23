import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal';
import toast from 'react-hot-toast';
import {
  HiOutlineBriefcase,
  HiOutlineAcademicCap,
  HiOutlineLibrary,
  HiOutlineCog,
  HiOutlinePlusCircle,
  HiOutlineSearch,
  HiOutlineUserAdd,
  HiOutlineClipboardCheck,
  HiOutlineCalendar,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineExclamation,
} from 'react-icons/hi';
import { STATUS_META, TASK_PRIORITIES } from '../../utils/constants';

const TYPE_CONFIG = {
  job_application: {
    title: 'Job Applications Hub',
    subtitle: 'Track employment applications, CVs, experience records, and job submission deadlines',
    icon: HiOutlineBriefcase,
    color: 'text-blue-600',
    entityLabel: 'Employer / Organization',
    entityPlaceholder: 'e.g. FPSC / PPSC / FBR / Rescue 1122',
    postLabel: 'Job Title / Post Applied',
    postPlaceholder: 'e.g. Assistant Director (BPS-17)',
    defaultChecklist: [
      { name: 'Updated CV / Resume', isSubmitted: false },
      { name: 'CNIC / Identity Card Copy', isSubmitted: false },
      { name: 'Passport Size Photographs', isSubmitted: false },
      { name: 'Highest Degree / Transcript', isSubmitted: false },
      { name: 'Experience Certificates', isSubmitted: false },
      { name: 'Paid Challan / Fee Slip', isSubmitted: false },
    ],
  },
  university_admission: {
    title: 'University Admissions Hub',
    subtitle: 'Manage higher education admissions, entry test slips, academic documents, and merit tracking',
    icon: HiOutlineAcademicCap,
    color: 'text-indigo-600',
    entityLabel: 'University Name',
    entityPlaceholder: 'e.g. NUST / COMSATS / Punjab University / FAST',
    postLabel: 'Degree / Program',
    postPlaceholder: 'e.g. BS Computer Science (Fall 2026)',
    defaultChecklist: [
      { name: 'Matric / O-Level Result Card', isSubmitted: false },
      { name: 'FSc / A-Level Result Card', isSubmitted: false },
      { name: 'CNIC / B-Form Copy', isSubmitted: false },
      { name: 'Father / Guardian CNIC Copy', isSubmitted: false },
      { name: 'Blue Background Photographs (4)', isSubmitted: false },
      { name: 'Domicile Certificate', isSubmitted: false },
      { name: 'Paid Admission Challan Slip', isSubmitted: false },
    ],
  },
  college_admission: {
    title: 'College Admissions Hub',
    subtitle: 'Track intermediate / college applications, matric certificates, and admission forms',
    icon: HiOutlineLibrary,
    color: 'text-purple-600',
    entityLabel: 'College / Institute Name',
    entityPlaceholder: 'e.g. Govt College / Punjab College / Superior',
    postLabel: 'Group / Discipline',
    postPlaceholder: 'e.g. FSc Pre-Medical / ICS / I.Com',
    defaultChecklist: [
      { name: 'Matric Result Sheet & Certificate', isSubmitted: false },
      { name: 'B-Form / CNIC Copy', isSubmitted: false },
      { name: 'Father / Guardian CNIC Copy', isSubmitted: false },
      { name: 'Photographs (4)', isSubmitted: false },
      { name: 'School Character Certificate', isSubmitted: false },
      { name: 'Admission Challan Receipt', isSubmitted: false },
    ],
  },
  other: {
    title: 'Other Customer Services',
    subtitle: 'Custom document requests, passport form fillings, verification requests, and special services',
    icon: HiOutlineCog,
    color: 'text-gray-700',
    entityLabel: 'Department / Agency',
    entityPlaceholder: 'e.g. Passport Office / NADRA / MOFA',
    postLabel: 'Service Title',
    postPlaceholder: 'e.g. Document Attestation / Token Tracking',
    defaultChecklist: [
      { name: 'Identity Document Copy', isSubmitted: false },
      { name: 'Original Document for Attestation', isSubmitted: false },
    ],
  },
};

export default function ApplicationStudioPage({ type = 'job_application' }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.other;
  const Icon = config.icon;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // New Application Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [programOrPost, setProgramOrPost] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [deadline, setDeadline] = useState('');
  const [feeAmount, setFeeAmount] = useState(0);
  const [priority, setPriority] = useState('normal');
  const [checklist, setChecklist] = useState(config.defaultChecklist);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Task Modal
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Quick Customer
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCust, setQuickCust] = useState({ name: '', phone: '', email: '' });
  const [savingCust, setSavingCust] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks', {
        params: {
          category: type,
          search,
          status: statusFilter || undefined,
          limit: 50,
          isArchived: false,
        },
      });
      setTasks(res.data.data.tasks);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [type, search, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers?limit=100');
        setCustomers(res.data.data.customers);
      } catch {
        // Fallback
      }
    };
    fetchCustomers();
  }, []);

  const handleOpenCreateModal = () => {
    setCustomerId('');
    setTitle('');
    setInstitution('');
    setProgramOrPost('');
    setReferenceNumber('');
    setDeadline('');
    setFeeAmount(0);
    setPriority('normal');
    setChecklist(config.defaultChecklist);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleAddChecklistDoc = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { name: newChecklistItem.trim(), isSubmitted: false }]);
    setNewChecklistItem('');
  };

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Please select an applicant customer');
      return;
    }

    const appTitle = title.trim() || `${programOrPost} - ${institution}`.trim() || config.title;

    try {
      setSubmitting(true);
      const payload = {
        customerId,
        category: type,
        title: appTitle,
        priority,
        deadline: deadline || undefined,
        requiredDocuments: checklist,
        initialNote: notes || undefined,
        applicationDetails: {
          institution: institution.trim(),
          programOrPost: programOrPost.trim(),
          referenceNumber: referenceNumber.trim(),
          feeAmount: Number(feeAmount) || 0,
        },
        billing: {
          estimatedAmount: Number(feeAmount) || 0,
        },
      };

      const res = await api.post('/tasks', payload);
      toast.success('Application created successfully!');
      setIsModalOpen(false);
      fetchTasks();
      setSelectedTaskId(res.data.data._id);
      setIsDetailsOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCustomer = async (e) => {
    e.preventDefault();
    if (!quickCust.name.trim() || !quickCust.phone.trim()) {
      toast.error('Name & Phone are required');
      return;
    }
    try {
      setSavingCust(true);
      const res = await api.post('/customers', quickCust);
      const newC = res.data.data;
      setCustomers([newC, ...customers]);
      setCustomerId(newC._id);
      setIsQuickCustomerOpen(false);
      setQuickCust({ name: '', phone: '', email: '' });
      toast.success(`Applicant ${newC.name} created!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer');
    } finally {
      setSavingCust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icon className={`w-7 h-7 ${config.color}`} />
            {config.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{config.subtitle}</p>
        </div>

        <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
          <HiOutlinePlusCircle className="w-5 h-5 mr-1" />
          New Application
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by applicant, employer, university, or reference number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="missing_documents">Missing Documents</option>
            <option value="in_progress">In Progress</option>
            <option value="ready_for_review">Ready for Review</option>
            <option value="completed">Completed / Submitted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={`No ${config.title} yet`}
            description="Create an applicant profile and track required degrees, CVs, and submission receipts."
            action={
              <Button onClick={handleOpenCreateModal}>
                <HiOutlinePlusCircle className="w-4 h-4 mr-1" />
                Create First Application
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">App ID</th>
                  <th className="px-6 py-3.5">Applicant / Customer</th>
                  <th className="px-6 py-3.5">Target Institution & Post</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Document Checklist</th>
                  <th className="px-6 py-3.5">Deadline</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((t) => {
                  const meta = STATUS_META[t.status] || STATUS_META.pending;
                  const totalDocs = t.requiredDocuments?.length || 0;
                  const submittedDocs =
                    t.requiredDocuments?.filter((d) => d.isSubmitted).length || 0;
                  const isOverdue =
                    t.deadline &&
                    new Date(t.deadline) < new Date() &&
                    !['completed', 'cancelled'].includes(t.status);

                  return (
                    <tr
                      key={t._id}
                      onClick={() => {
                        setSelectedTaskId(t._id);
                        setIsDetailsOpen(true);
                      }}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-blue-600 text-xs">
                        {t.taskId}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{t.customerId?.name}</div>
                        <div className="text-xs text-gray-500">{t.customerId?.phone}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 text-sm">
                          {t.applicationDetails?.institution || t.title}
                        </div>
                        {t.applicationDetails?.programOrPost && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {t.applicationDetails.programOrPost}
                          </div>
                        )}
                        {t.applicationDetails?.referenceNumber && (
                          <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                            Ref: {t.applicationDetails.referenceNumber}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${meta.bg}`}>
                          {meta.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {totalDocs > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-semibold ${
                                submittedDocs === totalDocs ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              {submittedDocs}/{totalDocs}
                            </span>
                            <span className="text-gray-400">docs submitted</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {t.deadline ? (
                          <div className="flex items-center gap-1">
                            {isOverdue && (
                              <HiOutlineExclamation className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                            <span className={isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}>
                              {new Date(t.deadline).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTaskId(t._id);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <HiOutlineEye className="w-4 h-4" />
                          <span className="hidden sm:inline">Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Application */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`New ${config.title}`}
        size="lg"
      >
        <form onSubmit={handleCreateApplication} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Customer Selection */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Applicant Customer *
              </label>
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(true)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                + Quick Add Customer
              </button>
            </div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.phone} ({c.customerId})
                </option>
              ))}
            </select>
          </div>

          {/* Institution & Post */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={config.entityLabel}
              placeholder={config.entityPlaceholder}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
            />
            <Input
              label={config.postLabel}
              placeholder={config.postPlaceholder}
              value={programOrPost}
              onChange={(e) => setProgramOrPost(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Tracking / Roll No / Challan #"
              placeholder="e.g. 984512"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Submission Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checklist Builder */}
          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase flex items-center gap-1.5">
                <HiOutlineClipboardCheck className="w-4 h-4 text-blue-600" />
                Required Document Checklist ({checklist.length})
              </span>
              <span className="text-[11px] text-gray-400">Prefilled based on application</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {checklist.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doc.isSubmitted}
                      onChange={(e) => {
                        const copy = [...checklist];
                        copy[idx].isSubmitted = e.target.checked;
                        setChecklist(copy);
                      }}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className={doc.isSubmitted ? 'text-gray-900 font-semibold' : 'text-gray-600'}>
                      {doc.name}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add another required document (e.g. Affidavit)..."
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistDoc();
                  }
                }}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleAddChecklistDoc}>
                <HiOutlinePlus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Special Notes / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Customer will bring matric certificate photocopy on Saturday"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Application Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quick Customer */}
      <Modal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        title="Quick Add Applicant"
        size="sm"
      >
        <form onSubmit={handleQuickCustomer} className="space-y-3">
          <Input
            label="Full Name *"
            value={quickCust.name}
            onChange={(e) => setQuickCust({ ...quickCust, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number *"
            value={quickCust.phone}
            onChange={(e) => setQuickCust({ ...quickCust, phone: e.target.value })}
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsQuickCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingCust}>
              Save & Select
            </Button>
          </div>
        </form>
      </Modal>

      {/* Task Details Modal */}
      <TaskDetailsModal
        taskId={selectedTaskId}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={fetchTasks}
      />
    </div>
  );
}
