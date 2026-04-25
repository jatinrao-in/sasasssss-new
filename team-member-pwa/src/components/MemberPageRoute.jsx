import RestrictedPage from './RestrictedPage';
import { useAuth } from '../hooks/useAuth';
import { canAccessPage } from '../lib/accessControl';

export default function MemberPageRoute({ pageKey, children }) {
  const { currentUser } = useAuth();

  if (!pageKey || canAccessPage(currentUser, pageKey, 'member')) {
    return children;
  }

  return <RestrictedPage />;
}
