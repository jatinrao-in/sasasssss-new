import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import KeyboardShortcuts from '../ui/KeyboardShortcuts';
import { DarkModeProvider } from '../../hooks/useDarkMode';
import MaintenanceAlert from '../MaintenanceAlert';

export default function Layout({ maintenanceReady = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [shortcutAction, setShortcutAction] = useState(null);
  const [dateRange, setDateRange] = useState('30');

  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleShortcut = useCallback((action) => {
    setShortcutAction(action);
    // Reset after 100ms so child pages can react
    setTimeout(() => setShortcutAction(null), 100);
  }, []);

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
        />
        <Header
          collapsed={collapsed}
          onMenuToggle={() => setMobileSidebarOpen((current) => !current)}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
        <main
          className={`min-h-screen pt-16 pb-16 lg:pb-0 transition-all duration-300 ${
            collapsed ? 'lg:pl-[72px]' : 'lg:pl-[280px]'
          }`}
        >
          <div className="page-transition mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5 lg:p-6">
            <Outlet context={{ shortcutAction, dateRange, setDateRange }} />
          </div>
        </main>
        <BottomNavigation onMenuToggle={() => setMobileSidebarOpen((current) => !current)} />
        <MaintenanceAlert enabled={maintenanceReady} />
        <KeyboardShortcuts onShortcut={handleShortcut} />
      </div>
    </DarkModeProvider>
  );
}
