import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Map route paths to permission keys
const routePermissionMap = {
 '/dashboard': 'dashboard',
 '/tasks': 'projects',
 '/enquiries': 'enquiry',
 '/follow-ups': 'followups',
 '/payments': 'payments',
 '/notifications': 'dashboard',
 '/profile': 'dashboard',
};

export default function ProtectedRoute({ children, requiredRole }) {
 const { user, userData, loading } = useAuth();
 const location = useLocation();

 if (loading) {
 return null;
 }

 if (!user) {
 return <Navigate to="/login" replace />;
 }

 // ✅ Fix P4: Admin trying to use PWA → redirect to /access-denied (not /login)
 if (requiredRole && userData?.role !== requiredRole) {
 return <Navigate to="/access-denied" replace />;
 }

 // Permission-based access check for team members
 if (userData?.role === 'member' && userData?.permissions) {
 const permKey = routePermissionMap[location.pathname];
 if (permKey && !userData.permissions.includes(permKey)) {
 return <Navigate to="/access-denied" replace />;
 }
 }

 return children;
}
