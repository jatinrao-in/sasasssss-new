import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// ✅ Fix P3: Wrong role redirect now shows "/access-denied" message instead of silently going to login
export default function ProtectedRoute({ children, requiredRole }) {
 const { user, userData, loading } = useAuth();

 if (loading) {
 return null;
 }

 if (!user) {
 return <Navigate to="/" replace />;
 }

 // ✅ Fix P3: If member tries to access admin panel, show meaningful page instead of silent redirect
 if (requiredRole && userData?.role !== requiredRole) {
 // Show a clear "wrong app" message for members trying to access admin
 return (
 <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
 <div className="max-w-md w-full text-center">
 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
 <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
 </svg>
 </div>
 <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
 <p className="text-gray-500 mb-2">This portal is for <strong>Admin</strong> users only.</p>
 <p className="text-sm text-gray-400 mb-8">
 If you are a Team Member, please use the{' '}
 <a
 href="https://saya-industrial-pwa.web.app"
 className="text-teal-600 hover:underline font-medium"
 >
 Team Member App
 </a>{' '}
 instead.
 </p>
 <button
 onClick={() => { import('../lib/firebase').then(({ auth }) => { import('firebase/auth').then(({ signOut }) => signOut(auth)); }); window.location.href = '/'; }}
 className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
 >
 Back to Login
 </button>
 </div>
 </div>
 );
 }

 return children;
}
