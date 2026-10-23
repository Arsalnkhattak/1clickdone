import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import PrintReceiptModal from '../../components/billing/PrintReceiptModal';
import toast from 'react-hot-toast';
import {
  HiOutlineCurrencyDollar,
  HiOutlineCash,
  HiOutlineCreditCard,
  HiOutlineClock,
  HiOutlinePrinter,
  HiOutlinePlus,
  HiOutlineSearch,
} from 'react-icons/hi';

export default function BillingPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick record payment modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [payTaskId, setPayTaskId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNote, setPayNote] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Print receipt modal
  const [selectedReceiptTaskId, setSelectedReceiptTaskId] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/billing/summary');
      setSummary(res.data.data);
    } catch {
      toast.error('Failed to load billing summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleOpenPayModal = async () => {
    try {
      const res = await api.get('/tasks?limit=50&isArchived=false');
      setTasks(res.data.data.tasks);
      setIsPayModalOpen(true);
    } catch {
      toast.error('Failed to fetch tasks');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payTaskId) {
      toast.error('Please select a task');
      return;
    }
    if (!payAmount || Number(payAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmittingPay(true);
      await api.post(`/billing/tasks/${payTaskId}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
        note: payNote,
      });

      toast.success('Payment recorded successfully!');
      setIsPayModalOpen(false);
      fetchSummary();
      setSelectedReceiptTaskId(payTaskId);
      setPayTaskId('');
      setPayAmount('');
      setPayNote('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment recording failed');
    } finally {
      setSubmittingPay(false);
    }
  };

  const metrics = summary?.metrics || {
    totalBilled: 0,
    totalCollected: 0,
    totalPendingBalance: 0,
    collectedToday: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HiOutlineCurrencyDollar className="w-7 h-7 text-blue-600" />
            Billing & Invoicing
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track customer payments, invoices, balances, and print official shop receipts
          </p>
        </div>

        <Button onClick={handleOpenPayModal} className="w-full sm:w-auto">
          <HiOutlineCash className="w-5 h-5 mr-1" />
          Record Payment
        </Button>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Today's Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HiOutlineCash className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">PKR {metrics.collectedToday}</div>
          <div className="text-[11px] text-gray-400 mt-1">Cash & Online collections today</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Collected</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <HiOutlineCreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600">PKR {metrics.totalCollected}</div>
          <div className="text-[11px] text-gray-400 mt-1">All-time payments received</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Billed</span>
            <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center">
              <HiOutlineCurrencyDollar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800">PKR {metrics.totalBilled}</div>
          <div className="text-[11px] text-gray-400 mt-1">Total invoiced charges</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Pending Balance</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <HiOutlineClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">PKR {metrics.totalPendingBalance}</div>
          <div className="text-[11px] text-gray-400 mt-1">Outstanding receivables</div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Recent Payment Transactions</h3>
          <span className="text-xs text-gray-500">
            {summary?.recentTransactions?.length || 0} recent transactions
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !summary?.recentTransactions || summary.recentTransactions.length === 0 ? (
          <EmptyState
            icon={HiOutlineCash}
            title="No transactions yet"
            description="Payments collected on tasks will be listed here automatically."
            action={
              <Button onClick={handleOpenPayModal}>
                <HiOutlineCash className="w-4 h-4 mr-1" />
                Record First Payment
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">Date / Time</th>
                  <th className="px-6 py-3.5">Task ID & Title</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Method</th>
                  <th className="px-6 py-3.5">Received By</th>
                  <th className="px-6 py-3.5 font-bold">Amount</th>
                  <th className="px-6 py-3.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.recentTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(tx.receivedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-blue-600">{tx.taskId}</div>
                      <div className="text-xs text-gray-700 truncate max-w-xs">{tx.taskTitle}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 text-xs">{tx.customerName}</div>
                      <div className="text-[11px] text-gray-400">{tx.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold uppercase bg-gray-100 text-gray-700">
                        {tx.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{tx.receivedBy}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 text-sm">
                      PKR {tx.amount}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedReceiptTaskId(tx.taskId)}
                      >
                        <HiOutlinePrinter className="w-4 h-4 mr-1 text-gray-500" />
                        Slip
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Record Payment */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="Record Customer Payment"
        size="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Select Task *
            </label>
            <select
              value={payTaskId}
              onChange={(e) => setPayTaskId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Task --</option>
              {tasks.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.taskId} — {t.title} ({t.customerId?.name}) — Billed: PKR{' '}
                  {t.billing?.finalAmount || 0}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount Paid (PKR) *"
              type="number"
              min="1"
              placeholder="e.g. 250"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Payment Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash in Hand</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="bank_transfer">Bank Transfer / Raast</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Payment Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Received partial advance, rest on pickup"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submittingPay}>
              Save & Print Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Print Receipt Modal */}
      <PrintReceiptModal
        taskId={selectedReceiptTaskId}
        isOpen={!!selectedReceiptTaskId}
        onClose={() => setSelectedReceiptTaskId(null)}
      />
    </div>
  );
}
