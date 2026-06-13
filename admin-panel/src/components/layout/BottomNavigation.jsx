import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CreditCard, MessageSquare, Menu } from 'lucide-react';

export default function BottomNavigation({ onMenuToggle }) {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden px-3 flex items-center justify-around py-1"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)', minHeight: '60px' }}
    >
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
          isActive ? 'text-[#1a73e8]' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <LayoutDashboard className="w-[20px] h-[20px] mb-0.5" />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/projects"
        className={({ isActive }) => `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
          isActive ? 'text-[#1a73e8]' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <FolderKanban className="w-[20px] h-[20px] mb-0.5" />
        <span>Projects</span>
      </NavLink>

      <NavLink
        to="/payments"
        className={({ isActive }) => `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
          isActive ? 'text-[#1a73e8]' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <CreditCard className="w-[20px] h-[20px] mb-0.5" />
        <span>Payments</span>
      </NavLink>

      <NavLink
        to="/followups"
        className={({ isActive }) => `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
          isActive ? 'text-[#1a73e8]' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <MessageSquare className="w-[20px] h-[20px] mb-0.5" />
        <span>Follow-ups</span>
      </NavLink>

      <button
        type="button"
        onClick={onMenuToggle}
        className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 transition-colors border-none bg-transparent cursor-pointer"
      >
        <Menu className="w-[20px] h-[20px] mb-0.5" />
        <span>More</span>
      </button>
    </div>
  );
}
