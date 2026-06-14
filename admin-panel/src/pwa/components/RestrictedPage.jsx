import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getAccessiblePages } from '../lib/accessControl';

export default function RestrictedPage({
  title = 'Access Restricted',
  message = "You don't have permission to access this page.",
  subtext = 'Restricted by Admin. Contact your administrator for access.',
}) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const accessiblePages = getAccessiblePages(currentUser, 'member');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-6 py-10 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <Lock className="h-9 w-9 text-red-600" />
      </div>

      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
      <p className="mb-2 max-w-sm text-sm text-[var(--text-secondary)]">{message}</p>
      <p className="mb-8 text-sm text-[var(--text-muted)]">{subtext}</p>

      <div className="mb-6 w-full max-w-sm rounded-3xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          Your Accessible Pages
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {accessiblePages.length > 0 ? accessiblePages.map((page) => (
            <button
              key={page.key}
              onClick={() => navigate(page.path, { replace: true })}
              className="rounded-full border border-[var(--accent-primary)] bg-[var(--accent-light)] px-4 py-1.5 text-sm font-medium text-[var(--accent-primary)]"
            >
              {page.navLabel || page.label}
            </button>
          )) : (
            <span className="text-sm text-[var(--text-muted)]">No pages available right now.</span>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          if (accessiblePages.length > 0) {
            navigate(accessiblePages[0].path, { replace: true });
            return;
          }

          navigate('/login', { replace: true });
        }}
        className="btn-primary min-w-[180px]"
      >
        Go Back
      </button>
    </div>
  );
}
