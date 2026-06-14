import { ShieldX } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAdminPanelUrl } from '../lib/adminPanel';

export default function AccessDeniedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const message = location.state?.message || "You don't have permission to access this page.";

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <ShieldX className="h-10 w-10 text-red-400" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Access Denied</h1>
      <p className="mb-2 max-w-xs text-sm text-[var(--text-muted)]">
        {message}
      </p>
      <p className="mb-8 max-w-xs text-xs text-gray-400">
        If you are an Admin, please use the{' '}
        <a href={getAdminPanelUrl()} className="font-medium text-teal-600 underline">
          Admin Panel
        </a>{' '}
        instead.
      </p>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
      >
        Logout &amp; Go Back
      </button>
    </div>
  );
}
