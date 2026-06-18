import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.jpg';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  Users,
  Wallet,
  Wrench,
  X,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ADMIN_PAGE_OPTIONS, getAccessiblePages } from '../../lib/accessControl';
import { useEnquiries } from '../../hooks/useEnquiries';
import { useFollowups } from '../../hooks/useFollowUps';
import { useProjects } from '../../hooks/useProjects';
import { useTeam } from '../../hooks/useTeam';
import { useToast } from '../../hooks/useToast';

const iconByKey = {
  dashboard: LayoutDashboard,
  payments: DollarSign,
  enquiry: ClipboardList,
  projects: FolderKanban,
  followups: MessageSquare,
  outgoing_payments: Wallet,
  team: Users,
  rgp: Package,
  salary: CreditCard,
  tools: Wrench,
  reports: BarChart3,
  settings: Settings,
};

const SECTIONS = [
  {
    title: 'SALES',
    keys: ['enquiry', 'followups'],
  },
  {
    title: 'OPERATIONS',
    keys: ['projects', 'team'],
  },
  {
    title: 'FINANCE',
    keys: ['payments', 'outgoing_payments', 'salary', 'rgp'],
  },
  {
    title: 'SYSTEM',
    keys: ['tools', 'settings'],
  },
];

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const toast = useToast();

  // Load datasets dynamically for live counts
  const { enquiries } = useEnquiries();
  const { followups } = useFollowups();
  const { projects } = useProjects();
  const { members } = useTeam({ includeAdmins: true });

  const visiblePages = useMemo(() => (
    currentUser?.isMainAdmin
      ? ADMIN_PAGE_OPTIONS
      : getAccessiblePages(currentUser, 'admin')
  ), [currentUser]);

  const dashboardPage = useMemo(() => (
    visiblePages.find(p => p.key === 'dashboard')
  ), [visiblePages]);

  const sectionPages = useMemo(() => {
    return SECTIONS.map(sec => {
      const pages = sec.keys
        .map(key => visiblePages.find(p => p.key === key))
        .filter(Boolean);
      return { title: sec.title, pages };
    }).filter(sec => sec.pages.length > 0);
  }, [visiblePages]);

  const counts = useMemo(() => ({
    enquiry: enquiries ? enquiries.filter(e => e.status !== 'closed').length : 0,
    followups: followups ? followups.filter(f => f.status !== 'closed').length : 0,
    projects: projects ? projects.filter(p => p.status !== 'completed').length : 0,
    team: members ? members.filter(m => m.role === 'member').length : 0,
  }), [enquiries, followups, projects, members]);

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex transform flex-col border-r border-slate-100 bg-[#FFFFFF] shadow-sm transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'sidebar-collapsed lg:w-[72px]' : 'lg:w-[280px]'} w-[min(18rem,85vw)] lg:translate-x-0`}
      >
        {/* LOGO HEADER */}
        <div className={`flex h-16 items-center border-b border-slate-100 px-4 ${collapsed ? 'lg:justify-center' : 'gap-3'}`}>
          <img
            src={logoImg}
            alt="Logo"
            className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
          />
          {!collapsed && (
            <div>
              <p className="text-sm font-bold leading-tight text-[#0F172A]">Admin Panel</p>
              <p className="text-xs text-gray-400">
                {currentUser?.isMainAdmin ? 'Main Admin' : 'Access Controlled'}
              </p>
            </div>
          )}

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 text-gray-400 hover:bg-slate-50 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* NAVIGATION LIST */}
        <nav className="flex-1 space-y-1 overflow-y-auto py-4">
          {/* Dashboard (Main Header) */}
          {dashboardPage && (
            <NavLink
              key="dashboard"
              to={dashboardPage.path}
              title={collapsed ? 'Dashboard' : ''}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard className="h-[18px] w-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">Dashboard</span>}
            </NavLink>
          )}

          {/* Grouped sections */}
          {sectionPages.map((sec) => (
            <div key={sec.title} className="space-y-0.5">
              {!collapsed && (
                <div className="sidebar-section-title">
                  {sec.title}
                </div>
              )}
              {sec.pages.map((page) => {
                const Icon = iconByKey[page.key] || LayoutDashboard;
                const count = counts[page.key];

                return (
                  <NavLink
                    key={page.key}
                    to={page.path}
                    title={collapsed ? page.label : ''}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {!collapsed && <span className="truncate flex-1">{page.label}</span>}
                    {!collapsed && count !== undefined && count > 0 && (
                      <span className="ml-auto rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 tracking-tight">
                        {count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* FOOTER */}
        <div className="border-t border-slate-100 p-2 space-y-0.5">
          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : ''}
            className={`sidebar-link w-full text-[#EF4444] hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* FLOATING TOGGLE BUTTON */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-[#FFFFFF] shadow-sm transition-shadow hover:shadow-md lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3 text-gray-500" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-gray-500" />
          )}
        </button>
      </aside>
    </>
  );
}
