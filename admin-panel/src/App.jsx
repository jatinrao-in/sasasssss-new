import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { RealtimeProvider } from './context/RealtimeContext';
import { ToastProvider } from './hooks/useToast';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import RestrictedPage from './components/RestrictedPage';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
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
import WhatsAppAutomationPage from './pages/WhatsAppAutomationPage';
import SettingsPage from './pages/SettingsPage';
import NotificationLogsPage from './pages/NotificationLogsPage';
import SplashScreen from './components/SplashScreen';
import AIAssistantPanel from './components/ui/AIAssistantPanel';
import AutoUpdateHandler from './components/AutoUpdateHandler';
import { getFirstAccessiblePath } from './lib/accessControl';

function AdminLayout() {
  return (
    <ProtectedRoute requiredRole="admin">
      <Layout />
      <AIAssistantPanel />
    </ProtectedRoute>
  );
}

function AdminHomeRedirect() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  const firstAccessiblePath = getFirstAccessiblePath(currentUser, 'admin');

  if (firstAccessiblePath) {
    return <Navigate to={firstAccessiblePath} replace />;
  }

  return (
    <RestrictedPage
      message="Your account is active, but you do not currently have any admin pages assigned."
      subtext="Ask your main administrator to grant access to at least one admin page."
    />
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AutoUpdateHandler />
      <AuthProvider>
        <RealtimeProvider>
          <ToastProvider>
            <SplashScreen />
            <Routes>
              <Route path="/" element={<LoginPage />} />

              <Route element={<AdminLayout />}>
                <Route path="/home" element={<AdminHomeRedirect />} />
                <Route
                  path="/dashboard"
                  element={(
                    <AdminRoute pageKey="dashboard">
                      <DashboardPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/projects"
                  element={(
                    <AdminRoute pageKey="projects">
                      <ProjectsPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/projects/:id"
                  element={(
                    <AdminRoute pageKey="projects">
                      <ProjectDetailPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/enquiry"
                  element={(
                    <AdminRoute pageKey="enquiry">
                      <EnquiryPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/followups"
                  element={(
                    <AdminRoute pageKey="followups">
                      <FollowupPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/payments"
                  element={(
                    <AdminRoute pageKey="payments">
                      <PaymentsPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/outgoing-payments"
                  element={(
                    <AdminRoute pageKey="outgoing_payments">
                      <OutgoingPaymentsPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/rgp"
                  element={(
                    <AdminRoute pageKey="rgp">
                      <RgpChallanPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/salary"
                  element={(
                    <AdminRoute pageKey="salary">
                      <SalaryPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/tools"
                  element={(
                    <AdminRoute pageKey="tools">
                      <ToolAssignPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/team"
                  element={(
                    <AdminRoute pageKey="team">
                      <TeamPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/whatsapp"
                  element={(
                    <AdminRoute pageKey="whatsapp">
                      <WhatsAppAutomationPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/notification-logs"
                  element={(
                    <AdminRoute pageKey="whatsapp">
                      <NotificationLogsPage />
                    </AdminRoute>
                  )}
                />
                <Route
                  path="/settings"
                  element={(
                    <AdminRoute pageKey="settings">
                      <SettingsPage />
                    </AdminRoute>
                  )}
                />

                <Route path="/followup" element={<Navigate to="/followups" replace />} />
                <Route path="/rgp-challan" element={<Navigate to="/rgp" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
