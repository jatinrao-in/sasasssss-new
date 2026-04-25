import { Navigate } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import { useAuth } from '../hooks/useAuth';
import { redirectToPwa } from '../lib/teamMemberApp';

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    redirectToPwa();
    return null;
  }

  return children;
}
