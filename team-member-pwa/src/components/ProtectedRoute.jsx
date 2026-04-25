import { Navigate, useLocation } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import { useAuth } from '../hooks/useAuth';
import { redirectToAdminPanel } from '../lib/adminPanel';
import { logInfo } from '../lib/firestoreDebug';

const routePermissionMap = {
  '/dashboard': 'dashboard',
  '/tasks': 'projects',
  '/enquiries': 'enquiry',
  '/follow-ups': 'followups',
  '/payments': 'payments',
  '/rgp': 'rgp',
  '/notifications': 'dashboard',
  '/profile': 'dashboard',
};

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  logInfo('ProtectedRoute', 'Evaluating route access:', {
    path: location.pathname,
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
    redirectToAdminPanel();
    return null;
  }

  if (currentUser.status === 'inactive') {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ message: 'Your account has been deactivated. Contact admin.' }}
      />
    );
  }

  const permissionKey = routePermissionMap[location.pathname];

  if (
    permissionKey &&
    Array.isArray(currentUser.permissions) &&
    currentUser.permissions.length > 0 &&
    !currentUser.permissions.includes(permissionKey)
  ) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ message: "You don't have access to this page." }}
      />
    );
  }

  return children;
}
