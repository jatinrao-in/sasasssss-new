import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { RealtimeProvider } from './context/RealtimeContext';
import { ToastProvider } from './hooks/useToast';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import RestrictedPage from './components/RestrictedPage';
import Layout from './components/layout/Layout';

// Admin Pages
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import EnquiryPage from './pages/EnquiryPage';
import FollowupPage from './pages/FollowupPage';
import PaymentsPage from './pages/PaymentsPage';
import OutgoingPaymentsPage from './pages/OutgoingPaymentsPage';
import RgpChallanPage from './pages/RgpChallanPage';
import SalaryPage from './pages/SalaryPage';
import ToolAssignPage from './pages/ToolAssignPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import NotificationLogsPage from './pages/NotificationLogsPage';
import AdminNotificationsPage from './pages/NotificationsPage';
import SplashScreen from './components/SplashScreen';
import AIAssistantPanel from './components/ui/AIAssistantPanel';
import AutoUpdateHandler from './components/AutoUpdateHandler';
import { db } from './lib/firebase';
import { COLLECTIONS } from './lib/firestore-helpers';
import { MAINTENANCE_CYCLE_DAYS, addDays } from './lib/systemConfig';

// PWA / Member UI Imports
import MemberPageRoute from './pwa/components/MemberPageRoute';
import PwaProtectedRoute from './pwa/components/ProtectedRoute';
import MobileLayout from './pwa/components/layout/MobileLayout';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './pwa/components/ui/sheet';
import { Button } from './pwa/components/ui/button';
import { usePushNotifications } from './pwa/hooks/usePushNotifications';
import OfflineBanner from './pwa/components/OfflineBanner';
import { getFirstAccessiblePath } from './lib/accessControl';

// PWA / Member Lazy Pages
const LoginPage = lazy(() => import('./pwa/pages/LoginPage'));
const AccessDeniedPage = lazy(() => import('./pwa/pages/AccessDeniedPage'));
const MemberDashboardPage = lazy(() => import('./pwa/pages/DashboardPage'));
const TasksPage = lazy(() => import('./pwa/pages/TasksPage'));
const EnquiriesPage = lazy(() => import('./pwa/pages/EnquiriesPage'));
const FollowUpsPage = lazy(() => import('./pwa/pages/FollowUpsPage'));
const MemberPaymentsPage = lazy(() => import('./pwa/pages/PaymentsPage'));
const RgpPage = lazy(() => import('./pwa/pages/RgpPage'));
const NotificationsPage = lazy(() => import('./pwa/pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pwa/pages/ProfilePage'));
const DownloadPage = lazy(() => import('./pwa/pages/DownloadPage'));

function MemberLayout() {
  return (
    <PwaProtectedRoute requiredRole="member">
      <NotificationHandler />
      <MobileLayout />
    </PwaProtectedRoute>
  );
}

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

function ExitHandler() {
  const [showExit, setShowExit] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = () => {
      const mainTabs = ['/pwa/dashboard', '/pwa/tasks', '/pwa/enquiries', '/pwa/rgp', '/pwa/profile', '/login'];

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
  const { currentUser } = useAuth();
  const location = useLocation();

  const memberPaths = [
    '/pwa/dashboard',
    '/pwa/tasks',
    '/pwa/enquiries',
    '/pwa/follow-ups',
    '/pwa/payments',
    '/pwa/rgp',
    '/pwa/notifications',
    '/pwa/profile'
  ];

  if (!currentUser || !memberPaths.includes(location.pathname)) {
    return null;
  }

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

function RootRedirect() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (currentUser.role === 'member') {
    const firstAccessiblePath = getFirstAccessiblePath(currentUser, 'member');
    return <Navigate to={firstAccessiblePath || '/pwa/dashboard'} replace />;
  }

  return <Navigate to="/login" replace />;
}

function AdminLayout() {
  const { currentUser, loading } = useAuth();
  const [maintenanceReady, setMaintenanceReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initMaintenance = async () => {
      if (loading || !currentUser?.uid) {
        return;
      }

      try {
        const maintenanceRef = doc(db, COLLECTIONS.settings, 'maintenance');
        const maintenanceSnap = await getDoc(maintenanceRef);

        if (!maintenanceSnap.exists()) {
          const today = new Date();
          const nextDate = addDays(today, MAINTENANCE_CYCLE_DAYS);

          await setDoc(maintenanceRef, {
            lastMaintenanceDate: today,
            nextMaintenanceDate: nextDate,
            maintenancePercent: 0,
            updatedBy: 'System',
            updatedAt: serverTimestamp(),
            notes: 'Initial setup',
          });
        }
      } catch (error) {
        console.error('Maintenance init failed:', error);
      } finally {
        if (mounted) {
          setMaintenanceReady(true);
        }
      }
    };

    initMaintenance();

    return () => {
      mounted = false;
    };
  }, [currentUser?.uid, loading]);

  return (
    <ProtectedRoute>
      <Layout maintenanceReady={maintenanceReady} />
      <AIAssistantPanel />
    </ProtectedRoute>
  );
}

function RedirectToProjectDetail() {
  const { id } = useParams();
  return <Navigate to={`/admin/projects/${id}`} replace />;
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    const fullWidthPaths = ['/', '/login', '/access-denied'];
    if (fullWidthPaths.includes(location.pathname)) {
      document.body.classList.add('full-width-layout');
    } else {
      document.body.classList.remove('full-width-layout');
    }
  }, [location.pathname]);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Auth routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/dowlode" element={<Navigate to="/download" replace />} />
        <Route path="/downlode" element={<Navigate to="/download" replace />} />
        <Route path="/projects" element={<Navigate to="/admin/projects" replace />} />
        <Route path="/projects/:id" element={<RedirectToProjectDetail />} />

        {/* Member (PWA) portal routes */}
        <Route path="/pwa" element={<MemberLayout />}>
          <Route
            path="dashboard"
            element={(
              <MemberPageRoute pageKey="dashboard">
                <MemberDashboardPage />
              </MemberPageRoute>
            )}
          />
          <Route
            path="tasks"
            element={(
              <MemberPageRoute pageKey="tasks">
                <TasksPage />
              </MemberPageRoute>
            )}
          />
          <Route
            path="enquiries"
            element={(
              <MemberPageRoute pageKey="enquiry">
                <EnquiriesPage />
              </MemberPageRoute>
            )}
          />
          <Route
            path="follow-ups"
            element={(
              <MemberPageRoute pageKey="followups">
                <FollowUpsPage />
              </MemberPageRoute>
            )}
          />
          <Route
            path="payments"
            element={(
              <MemberPageRoute pageKey="payments">
                <MemberPaymentsPage />
              </MemberPageRoute>
            )}
          />
          <Route
            path="rgp"
            element={(
              <MemberPageRoute pageKey="rgp">
                <RgpPage />
              </MemberPageRoute>
            )}
          />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin portal routes */}
        <Route path="/admin">
          <Route element={<AdminLayout />}>
            <Route
              path="dashboard"
              element={(
                <AdminRoute pageKey="dashboard">
                  <DashboardPage />
                </AdminRoute>
              )}
            />
            <Route
              path="projects"
              element={(
                <AdminRoute pageKey="projects">
                  <ProjectsPage />
                </AdminRoute>
              )}
            />
            <Route
              path="projects/:id"
              element={(
                <AdminRoute pageKey="projects">
                  <ProjectDetailPage />
                </AdminRoute>
              )}
            />
            <Route
              path="enquiry"
              element={(
                <AdminRoute pageKey="enquiry">
                  <EnquiryPage />
                </AdminRoute>
              )}
            />
            <Route
              path="followups"
              element={(
                <AdminRoute pageKey="followups">
                  <FollowupPage />
                </AdminRoute>
              )}
            />
            <Route
              path="payments"
              element={(
                <AdminRoute pageKey="payments">
                  <PaymentsPage />
                </AdminRoute>
              )}
            />
            <Route
              path="outgoing-payments"
              element={(
                <AdminRoute pageKey="outgoing_payments">
                  <OutgoingPaymentsPage />
                </AdminRoute>
              )}
            />
            <Route
              path="rgp"
              element={(
                <AdminRoute pageKey="rgp">
                  <RgpChallanPage />
                </AdminRoute>
              )}
            />
            <Route
              path="salary"
              element={(
                <AdminRoute pageKey="salary">
                  <SalaryPage />
                </AdminRoute>
              )}
            />
            <Route
              path="tools"
              element={(
                <AdminRoute pageKey="tools">
                  <ToolAssignPage />
                </AdminRoute>
              )}
            />
            <Route
              path="team"
              element={(
                <AdminRoute pageKey="team">
                  <TeamPage />
                </AdminRoute>
              )}
            />
            <Route
              path="notification-logs"
              element={(
                <AdminRoute pageKey="settings">
                  <NotificationLogsPage />
                </AdminRoute>
              )}
            />
            <Route
              path="notifications"
              element={(
                <AdminRoute pageKey="dashboard">
                  <AdminNotificationsPage />
                </AdminRoute>
              )}
            />
            <Route
              path="settings"
              element={(
                <AdminRoute pageKey="settings">
                  <SettingsPage />
                </AdminRoute>
              )}
            />
            <Route
              path="settings/:sectionId"
              element={(
                <AdminRoute pageKey="settings">
                  <SettingsPage />
                </AdminRoute>
              )}
            />

            <Route path="project" element={<Navigate to="projects" replace />} />
            <Route path="projecs" element={<Navigate to="projects" replace />} />
            <Route path="project/:id" element={<RedirectToProjectDetail />} />
            <Route path="followup" element={<Navigate to="followups" replace />} />
            <Route path="rgp-challan" element={<Navigate to="rgp" replace />} />
            <Route path="" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return (
    <BrowserRouter>
      <AutoUpdateHandler />
      <OfflineBanner />
      <ExitHandler />
      <AuthProvider>
        <RealtimeProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
