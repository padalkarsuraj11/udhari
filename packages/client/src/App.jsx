import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ClientLayout      from './components/layout/ClientLayout';
import ClientLogin       from './pages/auth/ClientLogin';
import OwnerDashboard    from './pages/dashboard/OwnerDashboard';
import ContractorsList   from './pages/contractors/ContractorsList';
import ContractorDetails from './pages/contractors/ContractorDetails';
import CustomersList     from './pages/customers/CustomersList';
import CustomerLedger   from './pages/customers/CustomerLedger';
import BillsPage from './pages/bills/BillsPage';
import {
  MaterialsPage, TransactionsPage, PaymentsPage,
  UdhariPage, RiskPage, BillRequestsPage, WhatsAppPage,
  ReportsPage, SettingsPage,
} from './pages/Placeholders';

// ── Account Deactivated Screen ──
function AccountInactiveScreen({ status, signOut }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', padding: 40, textAlign: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(239,68,68,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <span style={{ fontSize: 36 }}>🔒</span>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
        Account {status === 'suspended' ? 'Suspended' : 'Deactivated'}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
        {status === 'suspended'
          ? 'Your account has been suspended. Please contact your platform administrator for assistance.'
          : 'Your business account has been deactivated. Please contact your platform administrator to restore access.'}
      </p>
      <button className="btn btn-secondary btn-sm" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
}

// ── Auth Guard ──
function RequireAuth({ children }) {
  const { user, loading, tenantStatus, signOut } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If tenant status is known and not active — block all app navigation
  if (tenantStatus && tenantStatus !== 'active') {
    return <AccountInactiveScreen status={tenantStatus} signOut={signOut} />;
  }

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

          {/* Business — most-specific routes first */}
          <Route path="contractors"        element={<ContractorsList />} />
          <Route path="contractors/:contractorId/customers/:customerId" element={<CustomerLedger />} />
          <Route path="contractors/:id"    element={<ContractorDetails />} />
          <Route path="customers"          element={<CustomersList />} />
          <Route path="materials"          element={<MaterialsPage />} />

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
