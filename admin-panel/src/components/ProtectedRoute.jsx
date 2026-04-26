import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SplashScreen from './SplashScreen';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // Show splash while auth loads
  // NEVER redirect during loading
  if (loading) {
    return <SplashScreen />;
  }

  // Not logged in → go to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin
  if (currentUser.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  // All good — show page
  return children;
};

export default ProtectedRoute;
