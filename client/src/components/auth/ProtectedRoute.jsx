import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (roles && roles.length > 0) {
    if (!user?.role || !roles.includes(user.role)) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-500 mb-6">
              You don't have permission to access this page.
            </p>
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
}
