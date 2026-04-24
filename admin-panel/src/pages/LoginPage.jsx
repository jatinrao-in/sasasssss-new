import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function LoginPage() {
 const navigate = useNavigate();
 const { login, logout, user, userData, loading: authLoading } = useAuth();
 const toast = useToast();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');

 // If already logged in as admin, redirect (in useEffect to avoid React warning)
 useEffect(() => {
 if (!authLoading && user && userData?.role === 'admin') {
 navigate('/admin/dashboard', { replace: true });
 }
 }, [authLoading, user, userData, navigate]);

 const getFirebaseErrorMessage = (code) => {
 switch (code) {
 case 'auth/invalid-email': return 'Invalid email address.';
 case 'auth/user-disabled': return 'This account has been disabled.';
 case 'auth/user-not-found': return 'No account found with this email.';
 case 'auth/wrong-password': return 'Incorrect password.';
 case 'auth/invalid-credential': return 'Invalid email or password.';
 case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
 default: return 'Login failed. Please try again.';
 }
 };

 const handleLogin = async (e) => {
 e.preventDefault();
 setError('');
 if (!email || !password) {
 setError('Please fill in all fields.');
 return;
 }
 setLoading(true);
 try {
 const data = await login(email, password);
 if (data.role === 'admin') {
 toast.success('Welcome back, Admin!');
 navigate('/admin/dashboard');
 } else {
 await logout();
 setError('Access denied. This portal is for administrators only.');
 toast.error('Access denied. Use the Team Member app instead.');
 }
 } catch (err) {
 const message = getFirebaseErrorMessage(err.code);
 setError(message);
 toast.error(message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
 {/* Background decoration */}
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-100 rounded-full opacity-40 blur-3xl" />
 <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl" />
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-5">
 <div className="w-full h-full border border-teal-400 rounded-full" />
 <div className="absolute inset-8 border border-teal-400 rounded-full" />
 <div className="absolute inset-16 border border-teal-400 rounded-full" />
 <div className="absolute inset-24 border border-teal-400 rounded-full" />
 </div>
 </div>

 <div className="w-full max-w-md relative z-10">
 {/* Card */}
 <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
 {/* Top accent bar */}
 <div className="h-1 bg-gradient-to-r from-teal-500 to-teal-700" />

 <div className="px-8 py-10">
 {/* Logo */}
 <div className="text-center mb-8">
 <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl shadow-lg mb-4">
 <Building2 className="w-8 h-8 text-white" />
 </div>
 <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
 <p className="text-gray-500 text-sm mt-1">Sign in to your admin account</p>
 </div>

 {/* Form */}
 <form onSubmit={handleLogin} className="space-y-5">
 {error && (
 <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
 {error}
 </div>
 )}

 {/* Email */}
 <div>
 <label className="label" htmlFor="email">Email Address</label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input
 id="email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="admin@company.com"
 className="input-field pl-10"
 />
 </div>
 </div>

 {/* Password */}
 <div>
 <label className="label" htmlFor="password">Password</label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input
 id="password"
 type={showPassword ? 'text' : 'password'}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Enter your password"
 className="input-field pl-10 pr-10"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
 >
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>

 {/* Forgot password */}
 <div className="flex justify-end">
 <a href="#" className="text-xs text-teal-600 hover:text-teal-700 font-medium">
 Forgot password?
 </a>
 </div>

 {/* Submit */}
 <button
 type="submit"
 disabled={loading}
 id="login-btn"
 className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors duration-200 flex items-center justify-center gap-2 shadow-sm"
 >
 {loading ? (
 <>
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 Signing in...
 </>
 ) : (
 <>
 Sign In
 <ArrowRight className="w-4 h-4" />
 </>
 )}
 </button>
 </form>
 </div>
 </div>

 {/* Footer */}
 <p className="text-center text-xs text-gray-400 mt-6">
 © 2024 AdminPanel Enterprise Suite. All rights reserved.
 </p>
 </div>
 </div>
 );
}
