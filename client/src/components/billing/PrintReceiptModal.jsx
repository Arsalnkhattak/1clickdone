import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { HiOutlinePrinter, HiOutlineCheck } from 'react-icons/hi';

export default function PrintReceiptModal({ taskId, isOpen, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && taskId) {
      const fetchReceipt = async () => {
        try {
          setLoading(true);
          const res = await api.get(`/billing/tasks/${taskId}/receipt`);
          setReceipt(res.data.data);
        } catch {
          // Fallback
        } finally {
          setLoading(false);
        }
      };
      fetchReceipt();
    }
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Receipt" size="md">
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : !receipt ? (
        <p className="py-6 text-center text-sm text-gray-500">Failed to load receipt.</p>
      ) : (
        <div className="space-y-4">
          {/* Printable Receipt Paper Card */}
          <div
            id="printable-receipt"
            className="p-6 bg-white border border-gray-300 rounded-xl font-mono text-gray-800 text-xs shadow-inner space-y-4"
          >
            {/* Header / Brand */}
            <div className="text-center pb-3 border-b border-dashed border-gray-300">
              <div className="text-xl font-extrabold text-blue-600 tracking-tight">1Click</div>
              <div className="text-[10px] text-gray-500 font-sans tracking-wide">
                Done in 1Click — Smart Printing & Document Center
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                Receipt #{receipt.receiptNumber} • {new Date(receipt.issuedAt).toLocaleString()}
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-1 py-1 border-b border-dashed border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-bold">{receipt.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone:</span>
                <span>{receipt.customer?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer ID:</span>
                <span className="font-semibold text-blue-600">{receipt.customer?.customerId}</span>
              </div>
            </div>

            {/* Task Item */}
            <div className="py-1 border-b border-dashed border-gray-200 space-y-1">
              <div className="flex justify-between font-bold text-gray-900">
                <span>Task #{receipt.task?.taskId}</span>
                <span>PKR {receipt.billing?.finalAmount}</span>
              </div>
              <div className="text-[11px] text-gray-600 font-sans">{receipt.task?.title}</div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Billed:</span>
                <span className="font-bold">PKR {receipt.billing?.finalAmount}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Total Paid:</span>
                <span>PKR {receipt.billing?.paidAmount}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold text-sm pt-1 border-t border-gray-200">
                <span>Balance Due:</span>
                <span>PKR {receipt.billing?.balance}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Payment Status:</span>
                <span className="uppercase font-bold text-gray-700">
                  {receipt.billing?.paymentStatus}
                </span>
              </div>
            </div>

            {/* Recent Payments Breakdown */}
            {receipt.billing?.payments?.length > 0 && (
              <div className="pt-2 border-t border-dashed border-gray-200 text-[10px] space-y-1 text-gray-500">
                <div className="font-bold text-gray-700">Transactions:</div>
                {receipt.billing.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {new Date(p.receivedAt).toLocaleDateString()} via {p.method?.toUpperCase()}
                    </span>
                    <span className="font-semibold text-gray-800">PKR {p.amount}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Receipt Footer */}
            <div className="text-center pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-400 font-sans">
              Thank you for trusting 1Click!
              <br />
              Please preserve this receipt for collection.
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={handlePrint}>
              <HiOutlinePrinter className="w-4 h-4 mr-1" />
              Print Slip
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
