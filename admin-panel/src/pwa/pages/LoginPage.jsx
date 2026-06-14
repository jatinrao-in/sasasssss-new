import React, { useState, useEffect } from 'react';
import logoImg from '../assets/logo.jpg';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Asterisk, ArrowLeft, Download } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { redirectToAdminPanel } from '../lib/adminPanel';
import { getFirstAccessiblePath } from '../lib/accessControl';
import { useToast } from '../hooks/useToast';
import { logInfo } from '../lib/firestoreDebug';
import InteractiveGrid from '../components/InteractiveGrid';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, logout, user, userData, loading: authLoading } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password state
  const [view, setView] = useState('login'); // 'login' or 'forgot-password'
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Standalone PWA detection state
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone || 
                               document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();
  }, []);

  // Route authenticated users into the correct app without rendering the wrong dashboard first.
  useEffect(() => {
    if (authLoading || !user) return;

    logInfo('LoginPage', 'Auth screen state:', {
      userUid: user?.uid || null,
      role: userData?.role || null,
    });

    if (userData?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (userData?.role === 'member') {
      navigate(getFirstAccessiblePath(userData, 'member') || '/pwa/dashboard', { replace: true });
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
      if (data?.role === 'admin') {
        toast.success('Redirecting to Admin Panel...');
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      if (data?.role === 'member') {
        if (!data.isMainAdmin && data.status === 'inactive') {
          await logout();
          setError('Your account is inactive. Contact administrator.');
          toast.error('Your account is inactive. Contact administrator.');
          return;
        }

        toast.success(`Welcome back, ${data.name || 'Team Member'}!`);
        navigate(getFirstAccessiblePath(data, 'member') || '/pwa/dashboard', { replace: true });
        return;
      }

      await logout();
      setError('Access denied. Contact administrator.');
      toast.error('Access denied. Contact administrator.');
    } catch (err) {
      const message = getFirebaseErrorMessage(err.code);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetEmail) {
      setError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success('Password reset link sent to your email!');
      setView('login');
      setResetEmail('');
    } catch (err) {
      const message = getFirebaseErrorMessage(err.code);
      setError(message);
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white w-full font-sans text-gray-900">
      
      {/* Left side: Crimson/Graphite Graphic (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 relative overflow-hidden bg-[#E23744] text-white flex-col justify-between p-16">
        {/* Abstract background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#E23744] via-[#1E293B] to-[#0F172A] z-0 opacity-95" />
        
        {/* Interactive Grid Background */}
        <InteractiveGrid />

        {/* Top: Custom Asterisk/Star symbol */}
        <div className="relative z-20">
          <div className="w-14 h-14 flex items-center justify-center bg-white/10 rounded-full border border-white/20 shadow-lg">
            <Asterisk className="w-8 h-8 text-white stroke-[2.5]" />
          </div>
        </div>
        
        {/* Middle: Welcome Text & Greeting */}
        <div className="relative z-20 my-auto">
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Hello <br />
            Saya CRM! 👋
          </h1>
          <p className="text-lg lg:text-xl text-blue-100 max-w-md leading-relaxed font-medium opacity-90">
            Skip repetitive and manual workspace tasks. Get highly productive through automation and save tons of time!
          </p>
        </div>
        
        {/* Bottom: Copyright */}
        <div className="relative z-20">
          <p className="text-sm text-blue-200/80">
            &copy; 2026 Saya Industrial. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side / Mobile View: Login Form */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col justify-between p-6 sm:p-12 md:p-16 bg-[#FAF9FF] min-h-screen md:min-h-0 relative overflow-hidden z-40">
        
        {/* Glowing aura blobs for mobile background (placed behind content with z-0) */}
        <div className="md:hidden absolute top-[-10%] right-[-20%] w-80 h-80 rounded-full bg-blue-300/40 blur-[100px] pointer-events-none z-0" />
        <div className="md:hidden absolute bottom-[-10%] left-[-20%] w-80 h-80 rounded-full bg-indigo-400/30 blur-[120px] pointer-events-none z-0" />
        
        {/* Subtle dot-grid overlay for mobile (placed behind content with z-0) */}
        <div className="md:hidden absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-70 pointer-events-none z-0" />

        {/* Top Header - Logo & Brand (Centered on mobile, left-aligned on desktop - z-10) */}
        <div className="flex justify-between items-center pt-4 md:pt-0 relative z-10 w-full animate-fade-in">
          <span className="flex items-center gap-2.5 text-xl font-black text-gray-900 tracking-tight">
            <img src={logoImg} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            Saya CRM
          </span>
          {!isStandalone && (
            <button 
              type="button"
              onClick={() => navigate('/download')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#E23744] hover:bg-[#E23744]/10 rounded-lg border border-[#E23744]/20 transition-all cursor-pointer shadow-sm bg-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download App</span>
            </button>
          )}
        </div>

        {/* Center: Main Form Card (Centered on all viewports - z-10) */}
        <div className="w-full max-w-[380px] mx-auto my-auto py-8 md:py-0 relative z-10">
          
          {view === 'login' ? (
            <>
              <div className="text-center md:text-left mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back!</h2>
                <p className="text-gray-500 mt-2 text-sm font-medium">Please enter your details to sign in.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="bg-[#FFF5F5] text-[#E23744] text-sm px-4 py-3.5 rounded-xl border border-[#FFE3E3] font-medium">
                    {error}
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-gray-700 font-semibold text-xs ml-1">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 focus:border-[#E23744] focus:outline-none focus:ring-4 focus:ring-[#E23744]/10 transition-all text-sm text-gray-800 bg-white"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="password" className="text-gray-700 font-semibold text-xs">
                      Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 pl-12 pr-12 rounded-xl border border-gray-200 focus:border-[#E23744] focus:outline-none focus:ring-4 focus:ring-[#E23744]/10 transition-all text-sm text-gray-800 bg-white"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Solid Black Login Button */}
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-12 rounded-xl bg-black hover:bg-gray-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 border-0"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <>
                      <span>Login Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Forgot Password View */}
              <div className="text-center md:text-left mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reset Password</h2>
                <p className="text-gray-500 mt-2 text-sm font-medium">Enter your email and we'll send you a recovery link.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                {error && (
                  <div className="bg-[#FFF5F5] text-[#E23744] text-sm px-4 py-3.5 rounded-xl border border-[#FFE3E3] font-medium">
                    {error}
                  </div>
                )}

                {/* Reset Email Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="resetEmail" className="text-gray-700 font-semibold text-xs ml-1">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="resetEmail"
                      type="email"
                      placeholder="name@company.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 focus:border-[#E23744] focus:outline-none focus:ring-4 focus:ring-[#E23744]/10 transition-all text-sm text-gray-800 bg-white"
                    />
                  </div>
                </div>

                {/* Send Reset Link Button */}
                <Button 
                  type="submit" 
                  disabled={resetLoading} 
                  className="w-full h-12 rounded-xl bg-black hover:bg-gray-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 border-0"
                >
                  {resetLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                {/* Back to Login Link */}
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError('');
                  }}
                  className="w-full h-12 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </button>
              </form>
            </>
          )}

        </div>

        {/* Bottom Footer */}
        <div className="text-center text-sm text-gray-500 pb-4 md:pb-0 font-semibold relative z-10">
          {view === 'login' ? (
            <>
              Forgot password?{' '}
              <button 
                onClick={() => {
                  setView('forgot-password');
                  setError('');
                }}
                className="text-[#E23744] hover:underline transition-colors font-bold align-baseline"
              >
                Click here
              </button>
            </>
          ) : (
            <span>Saya Industrial Team Portal</span>
          )}
        </div>
      </div>
    </div>
  );
}
