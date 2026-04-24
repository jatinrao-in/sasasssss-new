import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import KeyboardShortcuts from '../ui/KeyboardShortcuts';
import { DarkModeProvider } from '../../hooks/useDarkMode';

export default function Layout() {
 const [collapsed, setCollapsed] = useState(false);
 const [shortcutAction, setShortcutAction] = useState(null);

 const handleShortcut = useCallback((action) => {
 setShortcutAction(action);
 // Reset after 100ms so child pages can react
 setTimeout(() => setShortcutAction(null), 100);
 }, []);

 return (
 <DarkModeProvider>
 <div className="min-h-screen bg-gray-50">
 <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
 <Header collapsed={collapsed} />
 <main
 className={`pt-16 min-h-screen transition-all duration-300 ${
 collapsed ? 'pl-16' : 'pl-60'
 }`}
 >
 <div className="p-6 page-transition">
 <Outlet context={{ shortcutAction }} />
 </div>
 </main>
 <KeyboardShortcuts onShortcut={handleShortcut} />
 </div>
 </DarkModeProvider>
 );
}
