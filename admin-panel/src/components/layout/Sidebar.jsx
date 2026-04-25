import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MessageSquare,
  Package,
  Settings,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ADMIN_PAGE_OPTIONS, getAccessiblePages } from '../../lib/accessControl';

const iconByKey = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  enquiry: ClipboardList,
  followups: MessageSquare,
  payments: CreditCard,
  outgoing_payments: ArrowUpRight,
  rgp: Package,
  salary: Wallet,
  tools: Wrench,
  team: Users,
  settings: Settings,
  whatsapp: MessageCircle,
};

export default function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const visiblePages = useMemo(() => (
    currentUser?.isMainAdmin
      ? ADMIN_PAGE_OPTIONS
      : getAccessiblePages(currentUser, 'admin')
  ), [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--border-primary)] bg-[var(--sidebar-bg)] shadow-sm transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className={`flex h-16 items-center border-b border-[var(--border-primary)] px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-600">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold leading-tight text-[var(--text-primary)]">Admin Panel</p>
            <p className="text-xs text-gray-400">
              {currentUser?.isMainAdmin ? 'Main Admin' : 'Access Controlled'}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {visiblePages.map((page) => {
          const Icon = iconByKey[page.key] || LayoutDashboard;

          return (
            <NavLink
              key={page.key}
              to={page.path}
              title={collapsed ? page.label : ''}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{page.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border-primary)] px-2 py-4">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : ''}
          className={`sidebar-link w-full text-[var(--text-danger)] hover:bg-[var(--bg-hover)] ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-primary)] bg-[var(--sidebar-bg)] shadow-sm transition-shadow hover:shadow-md"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-gray-500" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-gray-500" />
        )}
      </button>
    </aside>
  );
}
