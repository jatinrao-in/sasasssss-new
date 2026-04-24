import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAdminPanelUrl } from '../lib/adminPanel';

export default function AccessDeniedPage() {
 const navigate = useNavigate();
 // ✅ Fix P19: Added logout function so user doesn't loop back to /dashboard
 const { logout } = useAuth();

 const handleLogout = async () => {
 await logout();
 navigate('/login', { replace: true });
 };

 return (
 <div className="flex flex-col items-center justify-center h-full px-6 text-center">
 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
 <ShieldX className="w-10 h-10 text-red-400" />
 </div>
 <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>
 <p className="text-sm text-[var(--text-muted)] max-w-xs mb-2">
 You don't have permission to access this page.
 </p>
 <p className="text-xs text-gray-400 max-w-xs mb-8">
 If you are an Admin, please use the{' '}
 <a
 href={getAdminPanelUrl()}
 className="text-teal-600 underline font-medium"
 >
 Admin Panel
 </a>{' '}
 instead.
 </p>
 {/* ✅ Fix P19: Now shows Logout button — prevents dashboard loop for users without permission */}
 <button
 onClick={handleLogout}
 className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-teal-700 transition-colors"
 >
 Logout &amp; Go Back
 </button>
 </div>
 );
}
