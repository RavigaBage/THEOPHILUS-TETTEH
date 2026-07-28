import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { HubAuthProvider } from './contexts/HubAuthContext';
import { ToastProvider } from './contexts/ToastContext';

import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ui/ProtectedRoutes';

import Login from './pages/Login';
import Home from './pages/Home';
import Lounge from './pages/Lounge';
import Rooms from './pages/Rooms';
import Devices from './pages/Devices';
import Reports from './pages/Reports';
import AttendanceQR from './pages/AttendanceQR';
import AttendanceForm from './pages/AttendanceForm';
import Hub from './pages/Hub';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <HubAuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Kiosk Attendance Form */}
              <Route path="/attendance-form" element={<AttendanceForm />} />

              {/* Visitor Mobile Web App */}
              <Route path="/hub" element={<Hub />} />

              {/* Staff Login */}
              <Route path="/login" element={<Login />} />

              {/* Protected Staff Operations Workspace */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Home />} />
                <Route path="lounge" element={<Lounge />} />
                <Route path="rooms" element={<Rooms />} />
                <Route path="devices" element={<Devices />} />
                <Route path="reports" element={<Reports />} />
                <Route path="attendance-qr" element={<AttendanceQR />} />
              </Route>

              {/* Catch-all redirect to hub */}
              <Route path="*" element={<Navigate to="/hub" replace />} />
            </Routes>
          </ToastProvider>
        </HubAuthProvider>
      </AuthProvider>
    </Router>
  );
}
