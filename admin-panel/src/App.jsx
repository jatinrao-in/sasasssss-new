import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { RealtimeProvider } from './context/RealtimeContext';
import { ToastProvider } from './hooks/useToast';
import ProtectedRoute from './components/ProtectedRoute';
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

// Wrapper that combines ProtectedRoute + Layout
function AdminLayout() {
  return (
    <ProtectedRoute requiredRole="admin">
      <Layout />
      <AIAssistantPanel />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <RealtimeProvider>
          <ToastProvider>
            <SplashScreen />
              <Routes>
                {/* Public Route */}
                <Route path="/" element={<LoginPage />} />

                {/* Protected Routes (wrapped in Layout) */}
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="/enquiry" element={<EnquiryPage />} />
                  <Route path="/followup" element={<FollowupPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/outgoing-payments" element={<OutgoingPaymentsPage />} />
                  <Route path="/rgp-challan" element={<RgpChallanPage />} />
                  <Route path="/salary" element={<SalaryPage />} />
                  <Route path="/tools" element={<ToolAssignPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/whatsapp" element={<WhatsAppAutomationPage />} />
                  <Route path="/notification-logs" element={<NotificationLogsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
          </ToastProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
