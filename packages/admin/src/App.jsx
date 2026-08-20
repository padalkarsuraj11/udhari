import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLayout      from './components/layout/AdminLayout';
import AdminLogin       from './pages/auth/AdminLogin';
import AdminDashboard   from './pages/dashboard/AdminDashboard';
import OwnersList       from './pages/owners/OwnersList';
import OwnerDetails     from './pages/owners/OwnerDetails';
import {
  OwnerActivity, Analytics, Integrations, Notifications, AdminSettings
} from './pages/Placeholders';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<AdminLogin />} />

        {/* Protected Admin App */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index              element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<AdminDashboard />} />
          <Route path="owners"      element={<OwnersList />} />
          <Route path="owners/:id"  element={<OwnerDetails />} />
          <Route path="owner-activity" element={<OwnerActivity />} />
          <Route path="analytics"   element={<Analytics />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings"    element={<AdminSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
