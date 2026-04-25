import RestrictedPage from './RestrictedPage';
import { useAuth } from '../hooks/useAuth';
import { canAccessPage } from '../lib/accessControl';

export default function AdminRoute({ pageKey, children }) {
  const { currentUser } = useAuth();

  if (!pageKey || canAccessPage(currentUser, pageKey, 'admin')) {
    return children;
  }

  return <RestrictedPage />;
}
