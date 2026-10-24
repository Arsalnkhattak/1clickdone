import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import CustomersPage from './pages/customers/CustomersPage';
import TasksPage from './pages/tasks/TasksPage';
import CreateTaskPage from './pages/tasks/CreateTaskPage';
import ScanDocumentsPage from './pages/documents/ScanDocumentsPage';
import CnicStudioPage from './pages/services/CnicStudioPage';
import PassportStudioPage from './pages/services/PassportStudioPage';
import CustomPrintStudioPage from './pages/services/CustomPrintStudioPage';
import ApplicationStudioPage from './pages/applications/ApplicationStudioPage';
import PrintingPage from './pages/printing/PrintingPage';
import {
  HiOutlineClock,
  HiOutlineHome,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';

/* ---------- Utility pages ---------- */

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <HiOutlineClock className="w-8 h-8 text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500 max-w-sm">
        This specialized workspace tool will be ready in the upcoming Document & Layout phase. You can already manage tasks for this service under All Tasks!
      </p>
      <Link
        to={`/tasks`}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        View Service Tasks
      </Link>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
      <HiOutlineExclamationCircle className="w-16 h-16 text-gray-300 mb-4" />
      <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-500 mb-6">
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
      >
        <HiOutlineHome className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />

              {/* Phase 2: Customers & Tasks Management */}
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/new" element={<CreateTaskPage />} />

              {/* Staff — role-restricted */}
              <Route
                element={
                  <ProtectedRoute roles={['super_admin', 'admin']} />
                }
              >
                <Route path="/users" element={<UsersPage />} />
              </Route>

              {/* Phase 3 & 4: Studios & Print Layout Engines */}
              <Route path="/scan" element={<ScanDocumentsPage />} />
              <Route path="/cnic" element={<CnicStudioPage />} />
              <Route path="/passport" element={<PassportStudioPage />} />
              <Route path="/photos" element={<CustomPrintStudioPage />} />
              <Route path="/printing" element={<PrintingPage />} />
              {/* Legacy redirects so old bookmarks still work */}
              <Route path="/a4-print" element={<Navigate to="/printing" replace />} />
              <Route path="/custom-print" element={<Navigate to="/printing?tab=custom" replace />} />
              {/* Phase 5: Job, University & College Applications */}
              <Route path="/job-applications" element={<ApplicationStudioPage type="job_application" />} />
              <Route path="/university" element={<ApplicationStudioPage type="university_admission" />} />
              <Route path="/college" element={<ApplicationStudioPage type="college_admission" />} />
              <Route path="/other-services" element={<ApplicationStudioPage type="other" />} />
              <Route path="/billing" element={<ComingSoon title="Billing & Invoicing" />} />
              <Route path="/reports" element={<ComingSoon title="Reports & History" />} />
              <Route path="/settings" element={<ComingSoon title="Services & Settings" />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
