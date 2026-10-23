import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  HiOutlineChartBar,
  HiOutlineClipboardCheck,
  HiOutlineCurrencyDollar,
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import { CATEGORY_MAP } from '../../utils/constants';

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sumRes, billRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/billing/summary').catch(() => ({ data: { data: {} } })),
        ]);
        setSummary(sumRes.data.data);
        setBilling(billRes.data.data);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const counts = summary?.counts || {};
  const metrics = billing?.metrics || {};
  const categories = summary?.categoryBreakdown || {};

  const completionRate =
    counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HiOutlineChartBar className="w-7 h-7 text-blue-600" />
          Reports & Shop Performance
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Real-time business performance, completion rates, and service category breakdown
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Task Completion Rate
              </span>
              <div className="text-3xl font-extrabold text-blue-600 mt-2">{completionRate}%</div>
              <div className="text-xs text-gray-400 mt-1">
                {counts.completed} of {counts.total} tasks completed
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Revenue</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-2">
                PKR {metrics.totalCollected || 0}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                PKR {metrics.collectedToday || 0} collected today
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Active Customers
              </span>
              <div className="text-3xl font-extrabold text-purple-600 mt-2">
                {counts.totalCustomers || 0}
              </div>
              <div className="text-xs text-gray-400 mt-1">Registered shop customer profiles</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Pending Receivables
              </span>
              <div className="text-3xl font-extrabold text-rose-600 mt-2">
                PKR {metrics.totalPendingBalance || 0}
              </div>
              <div className="text-xs text-gray-400 mt-1">Outstanding customer balances</div>
            </div>
          </div>

          {/* Service Volume Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base">
              Workload by Service Category
            </h3>

            {Object.keys(categories).length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No service data available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(categories).map(([catKey, count]) => {
                  const label = CATEGORY_MAP[catKey] || catKey;
                  const pct =
                    counts.total > 0 ? Math.round((count / counts.total) * 100) : 0;
                  return (
                    <div
                      key={catKey}
                      className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{pct}% of shop requests</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{count}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operational Workflow Status */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Current Operational Pipeline</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-2xl font-bold text-amber-700">{counts.pending || 0}</div>
                <div className="text-xs font-semibold text-amber-800 mt-1">Pending</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{counts.inProgress || 0}</div>
                <div className="text-xs font-semibold text-blue-800 mt-1">In Progress</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                <div className="text-2xl font-bold text-rose-700">
                  {counts.missingDocuments || 0}
                </div>
                <div className="text-xs font-semibold text-rose-800 mt-1">Missing Docs</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">
                  {counts.readyForDelivery || 0}
                </div>
                <div className="text-xs font-semibold text-purple-800 mt-1">Ready for Delivery</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-2xl font-bold text-emerald-700">{counts.completed || 0}</div>
                <div className="text-xs font-semibold text-emerald-800 mt-1">Completed</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
