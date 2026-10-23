import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import TaskDetailsModal from '../../components/tasks/TaskDetailsModal';
import toast from 'react-hot-toast';
import {
  HiOutlineClipboardList,
  HiOutlinePlusCircle,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineX,
  HiOutlineCalendar,
  HiOutlineEye,
  HiOutlineExclamation,
} from 'react-icons/hi';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  STATUS_META,
  CATEGORY_MAP,
} from '../../utils/constants';

const STATUS_TABS = [
  { value: '', label: 'All Tasks' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'missing_documents', label: 'Missing Docs' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function TasksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [priority, setPriority] = useState('');

  // Selected Task Modal
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks', {
        params: {
          page,
          limit: 15,
          search,
          status: status || undefined,
          category: category || undefined,
          priority: priority || undefined,
        },
      });
      setTasks(res.data.data.tasks);
      setPagination(res.data.data.pagination);

      // Check if taskId param is in URL, auto-open details
      const directTaskId = searchParams.get('taskId');
      if (directTaskId) {
        const found = res.data.data.tasks.find((t) => t.taskId === directTaskId);
        if (found) {
          setSelectedTaskId(found._id);
          setIsDetailsOpen(true);
        }
      }
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, category, priority, searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  const handleOpenDetails = (task) => {
    setSelectedTaskId(task._id);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedTaskId(null);
    // Remove taskId from url if present
    if (searchParams.get('taskId')) {
      searchParams.delete('taskId');
      setSearchParams(searchParams);
    }
  };

  const isOverdue = (deadline, currentStatus) => {
    if (!deadline || currentStatus === 'completed' || currentStatus === 'cancelled') return false;
    return new Date(deadline) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every customer request has its own tracked task, documents, and completion status
          </p>
        </div>
        <Button onClick={() => navigate('/tasks/new')} className="w-full sm:w-auto">
          <HiOutlinePlusCircle className="w-5 h-5 mr-1" />
          Add New Task
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by task title, task ID (e.g. T-1001), or customer name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Services</option>
            {TASK_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {(search || category || priority || status) && (
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setPriority('');
                setStatus('');
                setPage(1);
              }}
              title="Reset Filters"
              className="text-gray-400 hover:text-gray-700 p-2 rounded-lg"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={HiOutlineClipboardList}
            title="No tasks found"
            description={
              search || status || category
                ? 'Try adjusting your filters or search terms.'
                : 'Create your first printing or document task.'
            }
            action={
              <Button onClick={() => navigate('/tasks/new')}>
                <HiOutlinePlusCircle className="w-4 h-4 mr-1" />
                Add New Task
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">Task ID</th>
                  <th className="px-6 py-3.5">Title & Customer</th>
                  <th className="px-6 py-3.5">Service</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Checklist</th>
                  <th className="px-6 py-3.5">Deadline</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((t) => {
                  const meta = STATUS_META[t.status] || STATUS_META.pending;
                  const overdue = isOverdue(t.deadline, t.status);
                  const totalDocs = t.requiredDocuments?.length || 0;
                  const submittedDocs =
                    t.requiredDocuments?.filter((d) => d.isSubmitted).length || 0;

                  return (
                    <tr
                      key={t._id}
                      onClick={() => handleOpenDetails(t)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-blue-600 text-xs">
                        {t.taskId}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{t.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {t.customerId?.name} ({t.customerId?.phone})
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-gray-700">
                        {CATEGORY_MAP[t.category] || t.category}
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
                                submittedDocs === totalDocs
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {submittedDocs}/{totalDocs}
                            </span>
                            <span className="text-gray-400">docs</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {t.deadline ? (
                          <div className="flex items-center gap-1">
                            {overdue && (
                              <HiOutlineExclamation className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                            <span
                              className={
                                overdue ? 'text-red-600 font-semibold' : 'text-gray-600'
                              }
                            >
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
                            handleOpenDetails(t);
                          }}
                        >
                          <HiOutlineEye className="w-4 h-4" />
                          <span className="hidden sm:inline">Details</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} tasks)
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

      {/* Task Details Drawer/Modal */}
      <TaskDetailsModal
        taskId={selectedTaskId}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        onTaskUpdated={fetchTasks}
      />
    </div>
  );
}
