import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineClipboardList,
  HiOutlinePlusCircle,
  HiOutlineDocumentSearch,
  HiOutlineIdentification,
  HiOutlineCamera,
  HiOutlinePhotograph,
  HiOutlinePrinter,
  HiOutlineTemplate,
  HiOutlineBriefcase,
  HiOutlineAcademicCap,
  HiOutlineLibrary,
  HiOutlineCog,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineAdjustments,
  HiOutlineUserGroup,
  HiOutlineLogout,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineX,
} from 'react-icons/hi';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS, ROLE_LABELS } from '../../utils/constants';

// Map icon name strings to actual icon components
const iconMap = {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineClipboardList,
  HiOutlinePlusCircle,
  HiOutlineDocumentSearch,
  HiOutlineIdentification,
  HiOutlineCamera,
  HiOutlinePhotograph,
  HiOutlinePrinter,
  HiOutlineTemplate,
  HiOutlineBriefcase,
  HiOutlineAcademicCap,
  HiOutlineLibrary,
  HiOutlineCog,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineAdjustments,
  HiOutlineUserGroup,
};

export default function Sidebar({ isOpen, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarWidth = expanded ? 'w-64' : 'w-16';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50
          bg-gray-900 text-white
          transition-all duration-300 ease-in-out
          flex flex-col
          ${sidebarWidth}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Brand section */}
        <div className="flex items-center justify-between px-2 h-16 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-0 min-w-0">
            {/* Logo icon */}
            <svg
              width="40"
              height="40"
              viewBox="0 0 100 100"
              className="shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer blue ring */}
              <circle cx="50" cy="50" r="44" fill="none" stroke="#2563eb" strokeWidth="8"/>
              {/* Inner dark fill */}
              <circle cx="50" cy="50" r="36" fill="#1e3a5f"/>
              {/* Number 1 */}
              <text x="50" y="63" textAnchor="middle" fontSize="38" fontWeight="bold" fill="white" fontFamily="Arial, sans-serif">1</text>
              {/* Orange swirl arrow */}
              <path
                d="M 70 18 Q 90 10 88 30 Q 85 48 68 55"
                fill="none"
                stroke="#f97316"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Arrowhead */}
              <polygon
                points="62,52 75,48 72,62"
                fill="#f97316"
              />
              {/* Blue arc on left */}
              <path
                d="M 20 72 Q 5 50 20 28"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
            {expanded && (
              <div className="flex flex-col leading-none ml-1.5 min-w-0">
                <span
                  className="leading-none tracking-wide uppercase"
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    background: 'linear-gradient(90deg, #ffffff 0%, #93c5fd 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.08em',
                  }}
                >
                  click
                </span>
                <span
                  className="leading-none"
                  style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontWeight: 300,
                    fontSize: '0.65rem',
                    color: '#60a5fa',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    marginTop: '1px',
                  }}
                >
                  Done
                </span>
              </div>
            )}
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-800 lg:hidden"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
          {/* Expand/collapse toggle for desktop */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-lg hover:bg-gray-800 hidden lg:block"
          >
            {expanded ? (
              <HiOutlineChevronLeft className="w-4 h-4 text-gray-400" />
            ) : (
              <HiOutlineChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon] || HiOutlineHome;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                      ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                    end={item.path === '/'}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {expanded && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info section */}
        <div className="border-t border-gray-800 p-3 shrink-0">
          {expanded ? (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {ROLE_LABELS[user?.role] || user?.role || 'Staff'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <HiOutlineLogout className="w-5 h-5 shrink-0" />
            {expanded && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
