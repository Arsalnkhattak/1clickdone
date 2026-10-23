import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HiOutlineAdjustments,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineCheck,
} from 'react-icons/hi';
import { TASK_CATEGORIES } from '../../utils/constants';

export default function SettingsPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Service Modal
  const [editingService, setEditingService] = useState(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editUnit, setEditUnit] = useState('flat');
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Service Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'a4_print',
    price: 0,
    unit: 'flat',
  });
  const [addingService, setAddingService] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/billing/services');
      setServices(res.data.data);
    } catch {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleOpenEdit = (svc) => {
    setEditingService(svc);
    setEditPrice(svc.price);
    setEditUnit(svc.unit || 'flat');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      await api.patch(`/billing/services/${editingService._id}`, {
        price: Number(editPrice),
        unit: editUnit,
      });
      toast.success('Service rate updated');
      setEditingService(null);
      fetchServices();
    } catch (err) {
      toast.error('Failed to update service');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    try {
      setAddingService(true);
      await api.post('/billing/services', {
        ...addForm,
        price: Number(addForm.price),
      });
      toast.success('Service created');
      setIsAddOpen(false);
      setAddForm({ name: '', category: 'a4_print', price: 0, unit: 'flat' });
      fetchServices();
    } catch (err) {
      toast.error('Failed to create service');
    } finally {
      setAddingService(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineAdjustments className="w-7 h-7 text-blue-600" />
            Services & Standard Rates
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure your shop's standard pricing for printing, scanning, photos, and online application filing
          </p>
        </div>

        <Button onClick={() => setIsAddOpen(true)}>
          <HiOutlinePlus className="w-4 h-4 mr-1" />
          Add Custom Service
        </Button>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Active Service Price List</h3>
          <span className="text-xs text-gray-400">{services.length} configured services</span>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">Service Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Rate (PKR)</th>
                  <th className="px-6 py-3.5">Billing Unit</th>
                  <th className="px-6 py-3.5 text-right">Edit Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((svc) => (
                  <tr key={svc._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 text-sm">{svc.name}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {svc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                      PKR {svc.price}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 uppercase font-mono">
                      {svc.unit}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(svc)}>
                        <HiOutlinePencil className="w-3.5 h-3.5 mr-1" />
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Edit Service Rate */}
      <Modal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        title={`Adjust Rate: ${editingService?.name}`}
        size="sm"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Rate in PKR *"
            type="number"
            min="0"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Billing Unit
            </label>
            <select
              value={editUnit}
              onChange={(e) => setEditUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="flat">Flat Rate</option>
              <option value="per_page">Per Page</option>
              <option value="per_copy">Per Copy</option>
              <option value="per_set">Per Set</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setEditingService(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingEdit}>
              Update Rate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Service */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Custom Shop Service"
        size="md"
      >
        <form onSubmit={handleCreateService} className="space-y-4">
          <Input
            label="Service Title *"
            placeholder="e.g. Legal Bond Paper Drafting"
            value={addForm.name}
            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Category
              </label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Unit
              </label>
              <select
                value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="flat">Flat</option>
                <option value="per_page">Per Page</option>
                <option value="per_copy">Per Copy</option>
                <option value="per_set">Per Set</option>
              </select>
            </div>
          </div>

          <Input
            label="Standard Price (PKR) *"
            type="number"
            min="0"
            value={addForm.price}
            onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addingService}>
              Create Service
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
