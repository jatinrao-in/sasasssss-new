import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
 LayoutDashboard,
 FolderKanban,
 ClipboardList,
 MessageSquare,
 CreditCard,
 Package,
 Wallet,
 Users,
 Settings,
 LogOut,
 ChevronLeft,
 ChevronRight,
 Building2,
 ArrowUpRight,
 Wrench,
 MessageCircle,
 Bell,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
 { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
 { path: '/projects', label: 'Project Management', icon: FolderKanban },
 { path: '/enquiry', label: 'Open Enquiry', icon: ClipboardList },
 { path: '/followup', label: 'Follow-Up', icon: MessageSquare },
 { path: '/payments', label: 'Pending Payments', icon: CreditCard },
 { path: '/outgoing-payments', label: 'Outgoing Payments', icon: ArrowUpRight },
 { path: '/rgp-challan', label: 'RGP / Challan', icon: Package },
 { path: '/salary', label: 'Salary Management', icon: Wallet },
 { path: '/tools', label: 'Tool Assign', icon: Wrench },
 { path: '/team', label: 'Team Members', icon: Users },
 { path: '/whatsapp', label: 'WhatsApp Automation', icon: MessageCircle },
 { path: '/notification-logs', label: 'Notification Logs', icon: Bell },
 { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed }) {
 const navigate = useNavigate();
 const { logout } = useAuth();

 const handleLogout = async () => {
 await logout();
 navigate('/');
 };

 return (
 <aside
 className={`fixed left-0 top-0 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--border-primary)] shadow-sm z-40 transition-all duration-300 flex flex-col ${
 collapsed ? 'w-16' : 'w-60'
 }`}
 >
 {/* Logo */}
 <div className={`flex items-center h-16 border-b border-[var(--border-primary)] px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
 <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
 <Building2 className="w-4 h-4 text-white" />
 </div>
 {!collapsed && (
 <div>
 <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">AdminPanel</p>
 <p className="text-xs text-gray-400">Enterprise Suite</p>
 </div>
 )}
 </div>

 {/* Nav Items */}
 <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
 {navItems.map((item) => {
 const Icon = item.icon;
 return (
 <NavLink
 key={item.path}
 to={item.path}
 title={collapsed ? item.label : ''}
 className={({ isActive }) =>
 `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
 }
 >
 <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
 {!collapsed && <span className="truncate">{item.label}</span>}
 </NavLink>
 );
 })}
 </nav>

 {/* Logout */}
 <div className="py-4 px-2 border-t border-[var(--border-primary)]">
 <button
 onClick={handleLogout}
 title={collapsed ? 'Logout' : ''}
 className={`sidebar-link w-full text-[var(--text-danger)] hover:bg-[var(--bg-hover)] ${collapsed ? 'justify-center px-2' : ''}`}
 >
 <LogOut style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
 {!collapsed && <span>Logout</span>}
 </button>
 </div>

 {/* Collapse Toggle */}
 <button
 onClick={() => setCollapsed(!collapsed)}
 className="absolute -right-3 top-20 bg-[var(--sidebar-bg)] border border-[var(--border-primary)] rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-50"
 >
 {collapsed ? (
 <ChevronRight className="w-3 h-3 text-gray-500" />
 ) : (
 <ChevronLeft className="w-3 h-3 text-gray-500" />
 )}
 </button>
 </aside>
 );
}
