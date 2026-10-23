import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineTruck,
  HiOutlineUserAdd,
  HiOutlinePlusCircle,
  HiOutlineDocumentSearch,
  HiOutlineUsers,
  HiOutlineArrowRight,
} from 'react-icons/hi';
import { useAuth } from '../../hooks/useAuth';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal';
import { STATUS_META, CATEGORY_MAP } from '../../utils/constants';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/summary');
      setSummary(res.data.data);
    } catch {
      // Fallback silently if DB is empty or fresh
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const counts = summary?.counts || {
    total: 0,
    pending: 0,
    inProgress: 0,
    missingDocuments: 0,
    readyForDelivery: 0,
    completed: 0,
    totalCustomers: 0,
    overdue: 0,
  };

  const statCards = [
    {
      label: 'Total Tasks',
      count: counts.total,
      icon: HiOutlineClipboardList,
      color: 'text-blue-600',
      iconBg: 'bg-blue-50',
      filter: '',
    },
    {
      label: 'Pending',
      count: counts.pending,
      icon: HiOutlineClock,
      color: 'text-amber-600',
      iconBg: 'bg-amber-50',
      filter: 'pending',
    },
    {
      label: 'In Progress',
      count: counts.inProgress,
      icon: HiOutlineRefresh,
      color: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      filter: 'in_progress',
    },
    {
      label: 'Missing Docs',
      count: counts.missingDocuments,
      icon: HiOutlineExclamation,
      color: 'text-rose-600',
      iconBg: 'bg-rose-50',
      filter: 'missing_documents',
    },
    {
      label: 'Ready for Delivery',
      count: counts.readyForDelivery,
      icon: HiOutlineTruck,
      color: 'text-purple-600',
      iconBg: 'bg-purple-50',
      filter: 'ready_for_delivery',
    },
    {
      label: 'Completed',
      count: counts.completed,
      icon: HiOutlineCheckCircle,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      filter: 'completed',
    },
  ];

  const quickActions = [
    {
      label: 'New Customer',
      sub: 'Create profile & phone',
      icon: HiOutlineUserAdd,
      path: '/customers',
      color: 'border-blue-200 hover:border-blue-400 bg-blue-50/50 text-blue-700',
    },
    {
      label: 'New Task',
      sub: 'Print or application request',
      icon: HiOutlinePlusCircle,
      path: '/tasks/new',
      color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/50 text-emerald-700',
    },
    {
      label: 'All Customers',
      sub: `${counts.totalCustomers} registered`,
      icon: HiOutlineUsers,
      path: '/customers',
      color: 'border-purple-200 hover:border-purple-400 bg-purple-50/50 text-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name || 'Shopkeeper'}!
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            1Click Printing Shop & Document Management System
          </p>
        </div>
        {counts.overdue > 0 && (
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold">
            <HiOutlineExclamation className="w-4 h-4 text-red-500" />
            {counts.overdue} overdue task{counts.overdue > 1 ? 's' : ''} require attention
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              onClick={() => navigate(card.filter ? `/tasks?status=${card.filter}` : '/tasks')}
              className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}
                >
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-2xl font-bold text-gray-900">{card.count}</span>
              </div>
              <p className="text-xs font-medium text-gray-600">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`
                  flex items-center gap-3.5 p-4
                  rounded-xl border
                  shadow-xs hover:shadow-md
                  transition-all duration-150 text-left
                  ${action.color}
                `}
              >
                <div className="w-10 h-10 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{action.label}</div>
                  <div className="text-xs text-gray-500">{action.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Recent Tasks</h3>
            <p className="text-xs text-gray-500">Latest active jobs across all customers</p>
          </div>
          <button
            onClick={() => navigate('/tasks')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All Tasks
            <HiOutlineArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : !summary?.recentTasks || summary.recentTasks.length === 0 ? (
          <EmptyState
            icon={HiOutlineClipboardList}
            title="No tasks yet"
            description="Create your first customer task to begin processing orders."
            action={
              <button
                onClick={() => navigate('/tasks/new')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <HiOutlinePlusCircle className="w-4 h-4" />
                Create First Task
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Task ID</th>
                  <th className="px-4 py-3">Title & Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.recentTasks.map((t) => {
                  const meta = STATUS_META[t.status] || STATUS_META.pending;
                  return (
                    <tr
                      key={t._id}
                      onClick={() => {
                        setSelectedTaskId(t._id);
                        setIsDetailsOpen(true);
                      }}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-xs text-blue-600">
                        {t.taskId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 text-sm">{t.title}</div>
                        <div className="text-xs text-gray-500">
                          {t.customerId?.name} ({t.customerId?.phone})
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {CATEGORY_MAP[t.category] || t.category}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${meta.bg}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-right">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        taskId={selectedTaskId}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={fetchSummary}
      />
    </div>
  );
}
