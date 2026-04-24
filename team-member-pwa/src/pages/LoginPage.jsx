import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Building2 } from 'lucide-react';
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

 // If already logged in as member, redirect (in useEffect to avoid React warning)
 useEffect(() => {
 if (!authLoading && user && userData?.role === 'member') {
 navigate('/dashboard', { replace: true });
 }
 }, [authLoading, user, userData, navigate]);

 const getFirebaseErrorMessage = (code) => {
 switch (code) {
 case 'auth/invalid-email': return 'Invalid email address.';
 case 'auth/user-disabled': return 'This account has been disabled.';
 case 'auth/user-not-found': return 'No account found with this email.';
 case 'auth/wrong-password': return 'Incorrect password.';
 case 'auth/invalid-credential': return 'Invalid email or password.';
 case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
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
 if (data.role === 'member') {
 toast.success(`Welcome back, ${data.name || 'Team Member'}!`);
 navigate('/dashboard');
 } else if (data.role === 'admin') {
 await logout();
 setError('Please use the Admin Panel to log in.');
 toast.warning('This app is for team members only.');
 } else {
 toast.success('Logged in successfully!');
 navigate('/dashboard');
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
 <div className="flex flex-col h-full bg-white">
 <div className="flex-1 flex flex-col items-center justify-center px-6">
 {/* Logo */}
 <div className="mb-8 flex flex-col items-center">
 <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-200 mb-4">
 <Building2 className="h-10 w-10 text-white" />
 </div>
 <h1 className="text-2xl font-bold text-gray-900">Enterprise</h1>
 <p className="text-sm text-gray-400 mt-1">Team Member Portal</p>
 </div>

 {/* Welcome text */}
 <div className="text-center mb-8">
 <h2 className="text-xl font-semibold text-gray-800">Welcome back!</h2>
 <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to continue to your account</p>
 </div>

 {/* Form */}
 <form onSubmit={handleLogin} className="w-full space-y-4">
 {error && (
 <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
 {error}
 </div>
 )}
 <div className="space-y-2">
 <Label htmlFor="email">Email Address</Label>
 <Input
 id="email"
 type="email"
 placeholder="you@company.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="password">Password</Label>
 <div className="relative">
 <Input
 id="password"
 type={showPassword ? 'text' : 'password'}
 placeholder="Enter your password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 />
 <button
 type="button"
 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
 onClick={() => setShowPassword(!showPassword)}
 >
 {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
 </button>
 </div>
 </div>
 <div className="flex justify-end">
 <button type="button" className="text-sm text-teal-600 font-medium">
 Forgot password?
 </button>
 </div>
 <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold">
 {loading ? (
 <span className="flex items-center gap-2">
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 Signing in...
 </span>
 ) : (
 'Sign In'
 )}
 </Button>
 </form>

 <p className="text-xs text-gray-400 mt-8 text-center">
 Contact your admin if you can't access your account
 </p>
 </div>
 </div>
 );
}
