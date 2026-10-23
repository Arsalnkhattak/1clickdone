import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import {
  HiOutlineUserAdd,
  HiOutlineSearch,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineLocationMarker,
  HiOutlineClipboardList,
  HiOutlinePlusCircle,
  HiOutlinePencil,
  HiOutlineX,
} from 'react-icons/hi';
import { STATUS_META, CATEGORY_MAP } from '../../utils/constants';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTasks, setCustomerTasks] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers', {
        params: { page, limit: 15, search },
      });
      setCustomers(res.data.data.customers);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const handleOpenHistory = async (customer) => {
    setSelectedCustomer(customer);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/customers/${customer._id}/tasks`);
      setCustomerTasks(res.data.data);
    } catch {
      toast.error('Failed to load customer tasks');
    } finally {
      setHistoryLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      const res = await api.post('/customers', formData);
      toast.success('Customer created successfully');
      setIsCreateOpen(false);
      fetchCustomers();
      return res.data.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      await api.patch(`/customers/${selectedCustomer._id}`, formData);
      toast.success('Customer updated successfully');
      setIsEditOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer profiles, contact info, and independent task histories
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
          <HiOutlineUserAdd className="w-5 h-5 mr-1" />
          Add Customer
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or customer ID (e.g. C-1001)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={HiOutlineUserAdd}
            title="No customers found"
            description={
              search
                ? 'Try a different search term'
                : 'Create your first customer to get started.'
            }
            action={
              !search && (
                <Button onClick={handleOpenCreate}>
                  <HiOutlineUserAdd className="w-4 h-4 mr-1" />
                  Add First Customer
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">Customer ID</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Address / Notes</th>
                  <th className="px-6 py-3.5 text-center">Active Tasks</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">
                      {c.customerId || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      {c.email && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <HiOutlineMail className="w-3.5 h-3.5" />
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-gray-800">
                        <HiOutlinePhone className="w-4 h-4 text-gray-400" />
                        {c.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-xs text-gray-500">
                      {c.address && (
                        <div className="flex items-center gap-1 mb-0.5">
                          <HiOutlineLocationMarker className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}
                      {c.notes && <div className="italic text-gray-400 truncate">{c.notes}</div>}
                      {!c.address && !c.notes && '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">
                          {c.taskStats?.totalTasks || 0}
                        </span>
                        {c.taskStats?.pendingTasks > 0 && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                            {c.taskStats.pendingTasks} active
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate(`/tasks/new?customerId=${c._id}`)}
                          title="New Task for this customer"
                        >
                          <HiOutlinePlusCircle className="w-4 h-4 text-blue-600" />
                          <span className="hidden md:inline">Task</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenHistory(c)}
                          title="View customer task history"
                        >
                          <HiOutlineClipboardList className="w-4 h-4 text-gray-600" />
                          <span className="hidden md:inline">History</span>
                        </Button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Customer"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} customers)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Customer */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Customer"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Muhammad Ali"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
          />
          <Input
            label="Phone Number *"
            placeholder="e.g. 03001234567"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={formErrors.phone}
          />
          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="e.g. ali@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Address (Optional)"
            placeholder="e.g. Street 4, Sector G-9, Islamabad"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Regular passport photo customer"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Customer */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Customer: ${selectedCustomer?.customerId || ''}`}
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
          />
          <Input
            label="Phone Number *"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            error={formErrors.phone}
          />
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Customer Task History */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Tasks for ${selectedCustomer?.name || ''} (${selectedCustomer?.customerId || ''})`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-blue-50/60 p-3 rounded-lg border border-blue-100">
            <div>
              <div className="font-semibold text-gray-900">{selectedCustomer?.name}</div>
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                <span>Phone: {selectedCustomer?.phone}</span>
                {selectedCustomer?.email && <span>• {selectedCustomer?.email}</span>}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setIsHistoryOpen(false);
                navigate(`/tasks/new?customerId=${selectedCustomer?._id}`);
              }}
            >
              <HiOutlinePlusCircle className="w-4 h-4 mr-1" />
              New Task
            </Button>
          </div>

          {historyLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : customerTasks.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No tasks found for this customer yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {customerTasks.map((t) => {
                const meta = STATUS_META[t.status] || STATUS_META.pending;
                return (
                  <div
                    key={t._id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-3 bg-white"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-600">
                          {t.taskId}
                        </span>
                        <span className="font-medium text-gray-900 text-sm">{t.title}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span>{CATEGORY_MAP[t.category] || t.category}</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${meta.bg}`}>
                        {meta.label}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setIsHistoryOpen(false);
                          navigate(`/tasks?taskId=${t.taskId}`);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsHistoryOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
