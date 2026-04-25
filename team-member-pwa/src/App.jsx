import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RealtimeProvider } from './context/RealtimeContext';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import ProtectedRoute from './components/ProtectedRoute';
import MemberPageRoute from './components/MemberPageRoute';
import RestrictedPage from './components/RestrictedPage';
import MobileLayout from './components/layout/MobileLayout';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet';
import { Button } from './components/ui/button';
import { usePushNotifications } from './hooks/usePushNotifications';
import SplashScreen from './components/SplashScreen';
import OfflineBanner from './components/OfflineBanner';
import AutoUpdateHandler from './components/AutoUpdateHandler';
import { getFirstAccessiblePath } from './lib/accessControl';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const EnquiriesPage = lazy(() => import('./pages/EnquiriesPage'));
const FollowUpsPage = lazy(() => import('./pages/FollowUpsPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const RgpPage = lazy(() => import('./pages/RgpPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function PageSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid #0D9488',
          borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

function MemberLayout() {
  return (
    <ProtectedRoute requiredRole="member">
      <MobileLayout />
    </ProtectedRoute>
  );
}

function MemberHomeRedirect() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const firstAccessiblePath = getFirstAccessiblePath(currentUser, 'member');

  if (firstAccessiblePath) {
    return <Navigate to={firstAccessiblePath} replace />;
  }

  return (
    <RestrictedPage
      message="Your account is active, but no PWA pages are assigned right now."
      subtext="Ask your administrator to grant access to at least one member page."
    />
  );
}

function ExitHandler() {
  const [showExit, setShowExit] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = () => {
      const mainTabs = ['/dashboard', '/tasks', '/enquiries', '/rgp', '/profile', '/login'];

      if (mainTabs.includes(window.location.pathname) || mainTabs.includes(location.pathname)) {
        window.history.pushState(null, null, window.location.pathname);
        setShowExit(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname]);

  const handleExit = () => {
    if (navigator.app?.exitApp) {
      navigator.app.exitApp();
    } else {
      window.close();
    }
  };

  return (
    <Sheet open={showExit} onOpenChange={setShowExit}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Exit App?</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <p className="text-gray-600">Are you sure you want to exit the application?</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-500 hover:bg-red-50"
              onClick={handleExit}
            >
              Exit
            </Button>
            <Button className="flex-1" onClick={() => setShowExit(false)}>
              Stay
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NotificationHandler() {
  const { showPrompt, requestPermission, setShowPrompt } = usePushNotifications();

  return (
    <Sheet open={showPrompt} onOpenChange={setShowPrompt}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Enable Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <p className="text-gray-600">
            Get real-time updates for tasks, payments, and follow-ups. We promise not to spam you!
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowPrompt(false)}>
              Later
            </Button>
            <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={requestPermission}>
              Enable
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AutoUpdateHandler />
      <OfflineBanner />
      <ExitHandler />
      <AuthProvider>
        <RealtimeProvider>
          <ToastProvider>
            <SplashScreen />
            <NotificationHandler />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/access-denied" element={<AccessDeniedPage />} />

                <Route element={<MemberLayout />}>
                  <Route path="/" element={<MemberHomeRedirect />} />
                  <Route
                    path="/dashboard"
                    element={(
                      <MemberPageRoute pageKey="dashboard">
                        <DashboardPage />
                      </MemberPageRoute>
                    )}
                  />
                  <Route
                    path="/tasks"
                    element={(
                      <MemberPageRoute pageKey="tasks">
                        <TasksPage />
                      </MemberPageRoute>
                    )}
                  />
                  <Route
                    path="/enquiries"
                    element={(
                      <MemberPageRoute pageKey="enquiry">
                        <EnquiriesPage />
                      </MemberPageRoute>
                    )}
                  />
                  <Route
                    path="/follow-ups"
                    element={(
                      <MemberPageRoute pageKey="followups">
                        <FollowUpsPage />
                      </MemberPageRoute>
                    )}
                  />
                  <Route
                    path="/payments"
                    element={(
                      <MemberPageRoute pageKey="payments">
                        <PaymentsPage />
                      </MemberPageRoute>
                    )}
                  />
                  <Route
                    path="/rgp"
                    element={(
                      <MemberPageRoute pageKey="rgp">
                        <RgpPage />
                      </MemberPageRoute>
                    )}
                  />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route
                    path="/profile"
                    element={(
                      <MemberPageRoute pageKey="profile">
                        <ProfilePage />
                      </MemberPageRoute>
                    )}
                  />
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
