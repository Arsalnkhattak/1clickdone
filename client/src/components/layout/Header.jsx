import { HiOutlineMenu, HiOutlineBell } from 'react-icons/hi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/constants';
import Badge from '../ui/Badge';

export default function Header({ onMenuClick, title }) {
  const { user } = useAuth();

  const roleVariant =
    user?.role === 'super_admin'
      ? 'info'
      : user?.role === 'admin'
      ? 'warning'
      : 'default';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden transition-colors"
          >
            <HiOutlineMenu className="w-5 h-5" />
          </button>
          {title && (
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notification bell (placeholder) */}
          <button className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors relative">
            <HiOutlineBell className="w-5 h-5" />
          </button>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-700">
                {user?.name || 'User'}
              </p>
              <Badge variant={roleVariant}>
                {ROLE_LABELS[user?.role] || user?.role || 'Staff'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
