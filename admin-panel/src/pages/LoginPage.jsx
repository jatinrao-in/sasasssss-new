import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { redirectToPwa } from '../lib/teamMemberApp';
import { getFirstAccessiblePath } from '../lib/accessControl';
import { useToast } from '../hooks/useToast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, logout, currentUser, loading: authLoading } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !currentUser) {
      return;
    }

    if (currentUser.role === 'admin') {
      navigate(getFirstAccessiblePath(currentUser, 'admin') || '/home', { replace: true });
      return;
    }

    redirectToPwa();
  }, [authLoading, currentUser, navigate]);

  const getFirebaseErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return 'Login failed. Please try again.';
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const profile = await login(email, password);

      if (profile.role !== 'admin') {
        toast.info('Redirecting you to the Team Member app...');
        redirectToPwa();
        return;
      }

      if (!profile.isMainAdmin && profile.status === 'inactive') {
        await logout();
        const message = 'Your admin account is inactive. Contact your main administrator.';
        setError(message);
        toast.error(message);
        return;
      }

      toast.success('Welcome back, Admin!');
      navigate(getFirstAccessiblePath(profile, 'admin') || '/home', { replace: true });
    } catch (err) {
      const message = getFirebaseErrorMessage(err.code);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 via-white to-gray-100 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-teal-100 opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-100 opacity-30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-teal-700" />

          <div className="px-8 py-10">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
              <p className="mt-1 text-sm text-gray-500">Sign in to your admin account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="label" htmlFor="email">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="input-field pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <a href="#" className="text-xs font-medium text-teal-600 hover:text-teal-700">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                id="login-btn"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-teal-700 disabled:bg-teal-400"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          (c) 2024 AdminPanel Enterprise Suite. All rights reserved.
        </p>
      </div>
    </div>
  );
}
