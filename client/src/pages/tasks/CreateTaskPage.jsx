import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardList,
  HiOutlineUserAdd,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineArrowLeft,
} from 'react-icons/hi';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../../utils/constants';

const CATEGORY_CHECKLIST_PRESETS = {
  cnic: [
    { name: 'CNIC Front Side Scan/Photo', isSubmitted: false },
    { name: 'CNIC Back Side Scan/Photo', isSubmitted: false },
  ],
  passport_photo: [
    { name: 'Recent Portrait Photograph', isSubmitted: false },
  ],
  portrait_photo: [
    { name: 'High Resolution Photo', isSubmitted: false },
  ],
  a4_print: [
    { name: 'Document File (PDF / Word / Image)', isSubmitted: false },
  ],
  job_application: [
    { name: 'Updated CV / Resume', isSubmitted: false },
    { name: 'CNIC Copy', isSubmitted: false },
    { name: 'Passport Size Photo', isSubmitted: false },
    { name: 'Educational Degrees / Certificates', isSubmitted: false },
    { name: 'Experience Letters', isSubmitted: false },
  ],
  university_admission: [
    { name: 'Metric / O-Level Result Card', isSubmitted: false },
    { name: 'FSc / A-Level Result Card', isSubmitted: false },
    { name: 'CNIC / B-Form Copy', isSubmitted: false },
    { name: 'Father/Guardian CNIC Copy', isSubmitted: false },
    { name: 'Passport Size Photographs (4)', isSubmitted: false },
    { name: 'Character Certificate', isSubmitted: false },
  ],
  college_admission: [
    { name: 'Matric Certificate & Marks Sheet', isSubmitted: false },
    { name: 'B-Form / CNIC Copy', isSubmitted: false },
    { name: 'Photographs (Blue background)', isSubmitted: false },
  ],
  custom_print: [
    { name: 'Input File to Print', isSubmitted: false },
  ],
  other: [],
};

export default function CreateTaskPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId');

  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('a4_print');
  const [priority, setPriority] = useState('normal');
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [description, setDescription] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const [checklist, setChecklist] = useState(CATEGORY_CHECKLIST_PRESETS.a4_print);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Quick New Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [customerSubmitting, setCustomerSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingInitial(true);
        const [custRes, staffRes] = await Promise.all([
          api.get('/customers?limit=100'),
          api.get('/users?limit=50').catch(() => ({ data: { data: { users: [] } } })),
        ]);
        setCustomers(custRes.data.data.customers);
        setStaffList(staffRes.data.data.users || []);

        if (preselectedCustomerId) {
          setCustomerId(preselectedCustomerId);
        }
      } catch (err) {
        toast.error('Failed to load customers or staff');
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchData();
  }, [preselectedCustomerId]);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    // Suggest preset title if empty
    const catObj = TASK_CATEGORIES.find((c) => c.value === newCat);
    if (!title || TASK_CATEGORIES.some((c) => c.label === title)) {
      setTitle(catObj ? catObj.label : '');
    }
    // Load default checklist for that category
    setChecklist(CATEGORY_CHECKLIST_PRESETS[newCat] || []);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { name: newChecklistItem.trim(), isSubmitted: false }]);
    setNewChecklistItem('');
  };

  const handleRemoveChecklistItem = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleQuickCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      toast.error('Name and Phone are required');
      return;
    }
    try {
      setCustomerSubmitting(true);
      const res = await api.post('/customers', customerForm);
      const newCust = res.data.data;
      setCustomers([newCust, ...customers]);
      setCustomerId(newCust._id);
      setIsCustomerModalOpen(false);
      toast.success(`Customer ${newCust.name} created and selected!`);
      setCustomerForm({ name: '', phone: '', email: '', address: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setCustomerSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerId,
        title: title.trim(),
        category,
        priority,
        deadline: deadline || undefined,
        assignedTo: assignedTo || undefined,
        description: description.trim() || undefined,
        initialNote: initialNote.trim() || undefined,
        requiredDocuments: checklist,
      };

      const res = await api.post('/tasks', payload);
      toast.success('Task created successfully!');
      navigate(`/tasks?taskId=${res.data.data.taskId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tasks')}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Task</h1>
          <p className="text-sm text-gray-500">
            Create an independent service request attached to a customer profile
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Customer Selection */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base">1. Customer Selection *</h3>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
            >
              <HiOutlineUserAdd className="w-4 h-4 mr-1 text-blue-600" />
              + Quick Add Customer
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Select Existing Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose a customer --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.phone} ({c.customerId || 'ID'})
                </option>
              ))}
            </select>
            {customers.length === 0 && !loadingInitial && (
              <p className="text-xs text-amber-600 mt-1">
                No customers found. Click "+ Quick Add Customer" above to create one.
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Service & Task Details */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-base">2. Service & Task Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Service Category *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TASK_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Task Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Blue background passport photo 8 copies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Deadline (Optional)
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
                Assign To Staff (Optional)
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Unassigned --</option>
                {staffList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Description / Special Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. White matte paper, crop closely around the head"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Card 3: Document Checklist */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineClipboardList className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-base">
                3. Required Document Checklist
              </h3>
            </div>
            <span className="text-xs text-gray-400">
              Auto-prefilled from category
            </span>
          </div>

          <div className="space-y-2">
            {checklist.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={item.isSubmitted}
                    onChange={(e) => {
                      const updated = [...checklist];
                      updated[index].isSubmitted = e.target.checked;
                      setChecklist(updated);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={item.isSubmitted ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                    {item.name}
                  </span>
                  {item.isSubmitted && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                      Received
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveChecklistItem(index)}
                  className="text-gray-400 hover:text-red-600 p-1"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add custom checklist item */}
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add another required document name..."
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChecklistItem();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddChecklistItem}
            >
              <HiOutlinePlus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Card 4: Initial Internal Note */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <h3 className="font-bold text-gray-900 text-base">4. Initial Work Note (Optional)</h3>
          <textarea
            rows={2}
            placeholder="e.g. Customer will bring physical photos in the evening"
            value={initialNote}
            onChange={(e) => setInitialNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/tasks')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={submitting} className="px-8">
            Create Task
          </Button>
        </div>
      </form>

      {/* Modal: Quick Customer Create */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Quick Add Customer"
        size="md"
      >
        <form onSubmit={handleQuickCustomerSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Usman Tariq"
            value={customerForm.name}
            onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number *"
            placeholder="e.g. 03121234567"
            value={customerForm.phone}
            onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
            required
          />
          <Input
            label="Email Address (Optional)"
            type="email"
            value={customerForm.email}
            onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
          />
          <Input
            label="Address (Optional)"
            value={customerForm.address}
            onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCustomerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={customerSubmitting}>
              Save & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
