import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ClientLayout      from './components/layout/ClientLayout';
import ClientLogin       from './pages/auth/ClientLogin';
import OwnerDashboard    from './pages/dashboard/OwnerDashboard';
import ContractorsList   from './pages/contractors/ContractorsList';
import ContractorDetails from './pages/contractors/ContractorDetails';
import CustomersList     from './pages/customers/CustomersList';
import {
  MaterialsPage, TransactionsPage, PaymentsPage, BillsPage,
  UdhariPage, RiskPage, BillRequestsPage, WhatsAppPage,
  ReportsPage, SettingsPage,
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
          <Route path="/login" element={<ClientLogin />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <ClientLayout />
            </RequireAuth>
          }
        >
          <Route index             element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<OwnerDashboard />} />

          {/* Business */}
          <Route path="contractors"      element={<ContractorsList />} />
          <Route path="contractors/:id"  element={<ContractorDetails />} />
          <Route path="customers"        element={<CustomersList />} />
          <Route path="materials"        element={<MaterialsPage />} />

          {/* Finance */}
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="payments"     element={<PaymentsPage />} />
          <Route path="bills"        element={<BillsPage />} />
          <Route path="udhari"       element={<UdhariPage />} />

          {/* Risk & Communication */}
          <Route path="risk"          element={<RiskPage />} />
          <Route path="bill-requests" element={<BillRequestsPage />} />
          <Route path="whatsapp"      element={<WhatsAppPage />} />

          {/* Reports & Settings */}
          <Route path="reports"  element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
