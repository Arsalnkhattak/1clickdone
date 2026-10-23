import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardCheck,
  HiOutlineCalendar,
  HiOutlineUser,
  HiOutlineChatAlt,
  HiOutlineClock,
  HiOutlineBan,
  HiOutlineCheck,
} from 'react-icons/hi';
import { STATUS_META, CATEGORY_MAP, TASK_PRIORITIES } from '../../utils/constants';
import TaskAttachmentsSection from './TaskAttachmentsSection';
import PrintReceiptModal from '../billing/PrintReceiptModal';

export default function TaskDetailsModal({ taskId, isOpen, onClose, onTaskUpdated }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [updatingChecklist, setUpdatingChecklist] = useState(false);

  // Cancel state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Billing state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [isPayFormOpen, setIsPayFormOpen] = useState(false);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const res = await api.get(`/tasks/${taskId}`);
      setTask(res.data.data);
    } catch {
      toast.error('Failed to load task details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
    } else {
      setTask(null);
    }
  }, [isOpen, taskId]);

  const handleStatusChange = async (newStatus) => {
    try {
      setChangingStatus(true);
      const res = await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
      setTask((prev) => ({ ...prev, status: newStatus, history: res.data.data.history || prev.history }));
      toast.success(`Status changed to ${STATUS_META[newStatus]?.label || newStatus}`);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleToggleChecklist = async (index) => {
    if (!task) return;
    const updatedDocs = [...task.requiredDocuments];
    updatedDocs[index].isSubmitted = !updatedDocs[index].isSubmitted;

    try {
      setUpdatingChecklist(true);
      const res = await api.patch(`/tasks/${task._id}/checklist`, { documents: updatedDocs });
      setTask(res.data.data);
      toast.success('Checklist updated');
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update checklist');
    } finally {
      setUpdatingChecklist(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setAddingNote(true);
      const res = await api.post(`/tasks/${task._id}/notes`, { text: newNote.trim() });
      setTask(res.data.data);
      setNewNote('');
      toast.success('Note added');
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    try {
      setRecordingPayment(true);
      const res = await api.post(`/billing/tasks/${task._id}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
      });
      setTask(res.data.data);
      setPayAmount('');
      setIsPayFormOpen(false);
      toast.success('Payment recorded');
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleCancelTask = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    try {
      setCancelling(true);
      const res = await api.post(`/tasks/${task._id}/cancel`, { reason: cancelReason });
      setTask(res.data.data);
      toast.success('Task cancelled');
      setIsCancelModalOpen(false);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel task');
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !isCancelModalOpen}
        onClose={onClose}
        title={task ? `${task.taskId} — ${task.title}` : 'Task Details'}
        size="lg"
      >
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !task ? (
          <p className="text-gray-500 py-8 text-center">No task data available.</p>
        ) : (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Top Info Bar */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Customer</div>
                <div className="font-semibold text-gray-900 mt-0.5">
                  {task.customerId?.name} ({task.customerId?.customerId})
                </div>
                <div className="text-xs text-gray-600">{task.customerId?.phone}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Service</div>
                <div className="text-sm font-medium text-gray-800 mt-0.5">
                  {CATEGORY_MAP[task.category] || task.category}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Priority</div>
                <div className="mt-0.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      TASK_PRIORITIES.find((p) => p.value === task.priority)?.badge || ''
                    }`}
                  >
                    {task.priority?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Status</div>
                <div className="mt-0.5">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      STATUS_META[task.status]?.bg || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {STATUS_META[task.status]?.label || task.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Description if present */}
            {task.description && (
              <div className="text-sm text-gray-700 bg-blue-50/40 p-3 rounded-lg border border-blue-100/60">
                <span className="font-semibold text-blue-900">Description: </span>
                {task.description}
              </div>
            )}

            {/* Status Change Selector */}
            <div className="border border-gray-200 rounded-xl p-4">
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                Update Task Status
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_META).map(([key, meta]) => {
                  const isCurrent = task.status === key;
                  if (key === 'cancelled') return null; // Handled by separate cancel button
                  return (
                    <button
                      key={key}
                      disabled={changingStatus || isCurrent}
                      onClick={() => handleStatusChange(key)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                        isCurrent
                          ? `${meta.bg} border-current ring-2 ring-blue-400 font-bold`
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
                {task.status !== 'cancelled' && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    Cancel Task
                  </button>
                )}
              </div>
              {task.cancelReason && (
                <div className="mt-2 text-xs text-red-600 font-medium bg-red-50 p-2 rounded">
                  Cancelled Reason: {task.cancelReason}
                </div>
              )}
            </div>

            {/* Required Documents Checklist */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HiOutlineClipboardCheck className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-gray-900 text-sm">
                    Required Document Checklist
                  </h4>
                </div>
                <span className="text-xs text-gray-500">
                  {task.requiredDocuments?.filter((d) => d.isSubmitted).length || 0} of{' '}
                  {task.requiredDocuments?.length || 0} submitted
                </span>
              </div>

              {task.requiredDocuments?.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No checklist required for this task.</p>
              ) : (
                <div className="space-y-2">
                  {task.requiredDocuments?.map((doc, idx) => (
                    <label
                      key={doc._id || idx}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        doc.isSubmitted
                          ? 'bg-emerald-50/50 border-emerald-200 text-gray-900'
                          : 'bg-gray-50/50 border-gray-200 text-gray-700 hover:bg-gray-100/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={doc.isSubmitted}
                        disabled={updatingChecklist}
                        onChange={() => handleToggleChecklist(idx)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <span className={doc.isSubmitted ? 'line-through text-gray-400' : 'font-medium'}>
                          {doc.name}
                        </span>
                        {doc.submittedAt && (
                          <div className="text-[11px] text-emerald-600 mt-0.5">
                            Submitted on {new Date(doc.submittedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments & Files Section */}
            <TaskAttachmentsSection task={task} onUpdated={fetchTaskDetails} />

            {/* Billing & Payments Section */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 text-sm">Billing & Customer Invoice</h4>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsReceiptOpen(true)}
                  >
                    Print Receipt
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsPayFormOpen(!isPayFormOpen)}
                  >
                    Record Payment
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Total Billed</div>
                  <div className="text-sm font-bold text-gray-900">
                    PKR {task.billing?.finalAmount || 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Total Paid</div>
                  <div className="text-sm font-bold text-emerald-600">
                    PKR {task.billing?.paidAmount || 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">Balance Due</div>
                  <div className="text-sm font-bold text-rose-600">
                    PKR {Math.max(0, (task.billing?.finalAmount || 0) - (task.billing?.paidAmount || 0))}
                  </div>
                </div>
              </div>

              {isPayFormOpen && (
                <form onSubmit={handleRecordPayment} className="flex gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                  <input
                    type="number"
                    min="1"
                    placeholder="Amount PKR..."
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  />
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="bank_transfer">Bank</option>
                  </select>
                  <Button type="submit" size="sm" loading={recordingPayment}>
                    Save
                  </Button>
                </form>
              )}
            </div>

            {/* Internal Notes Section */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <HiOutlineChatAlt className="w-5 h-5 text-gray-600" />
                <h4 className="font-bold text-gray-900 text-sm">Internal Work Notes</h4>
              </div>

              <div className="space-y-2.5 mb-3 max-h-48 overflow-y-auto">
                {task.notes?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No notes added yet.</p>
                ) : (
                  task.notes?.map((n) => (
                    <div key={n._id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                      <div className="text-gray-800">{n.text}</div>
                      <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                        <span>{n.author?.name || 'Staff'}</span>
                        <span>•</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a quick note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" size="sm" loading={addingNote}>
                  Add Note
                </Button>
              </form>
            </div>

            {/* History / Audit Log */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <HiOutlineClock className="w-5 h-5 text-gray-600" />
                <h4 className="font-bold text-gray-900 text-sm">Activity History</h4>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {task.history?.map((h) => (
                  <div key={h._id} className="text-[11px] text-gray-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-800">{h.action}:</span>{' '}
                      <span>{h.note || 'Updated'}</span>
                      <span className="text-gray-400 ml-1">
                        ({new Date(h.timestamp).toLocaleString()})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Task Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Task"
        size="sm"
      >
        <form onSubmit={handleCancelTask} className="space-y-4">
          <p className="text-sm text-gray-600">
            Please enter a reason for cancelling this task. This action will be logged in the task history.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g. Customer decided not to apply / incorrect documents"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Back
            </Button>
            <Button type="submit" variant="danger" loading={cancelling}>
              Confirm Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
