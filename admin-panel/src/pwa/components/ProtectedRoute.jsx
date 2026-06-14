import { Navigate } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import RestrictedPage from './RestrictedPage';
import { useAuth } from '../hooks/useAuth';
import { redirectToAdminPanel } from '../lib/adminPanel';
import { logInfo } from '../lib/firestoreDebug';

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, loading } = useAuth();

  logInfo('ProtectedRoute', 'Evaluating route access:', {
    loading,
    uid: currentUser?.uid || null,
    role: currentUser?.role || null,
  });

  if (loading) {
    return <SplashScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (!currentUser.isMainAdmin && currentUser.status === 'inactive') {
    return (
      <RestrictedPage
        title="Account Inactive"
        message="Your account is currently inactive."
        subtext="Contact your administrator to restore access."
      />
    );
  }

  return children;
}
