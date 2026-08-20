import {
  Package, Receipt, CreditCard, TrendingDown,
  AlertTriangle, MessageSquare, FileText, Settings, BarChart3
} from 'lucide-react';

function ComingSoon({ title, description, icon: Icon }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{description}</p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 'var(--radius-xl)',
          background: 'rgba(245,158,11,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Icon size={28} color="var(--accent-400)" />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Coming in Next Phase</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto' }}>
          This section is planned and the architecture is in place. Full implementation will follow in Phase 2.
        </p>
      </div>
    </div>
  );
}

export function MaterialsPage() {
  return (
    <ComingSoon
      title="Materials"
      description="Manage your material catalog, rates, and inventory"
      icon={Package}
    />
  );
}

export function TransactionsPage() {
  return (
    <ComingSoon
      title="All Transactions"
      description="Complete history of material issues, payments, and credits"
      icon={Receipt}
    />
  );
}

export function PaymentsPage() {
  return (
    <ComingSoon
      title="Payments"
      description="Record and track all payment receipts and advances"
      icon={CreditCard}
    />
  );
}

export function BillsPage() {
  return (
    <ComingSoon
      title="Bills"
      description="Generate, view, and manage bills for contractors and customers"
      icon={FileText}
    />
  );
}

export function UdhariPage() {
  return (
    <ComingSoon
      title="Udhari / Outstanding"
      description="Complete udhari ledger — credit extended and amounts yet to be collected"
      icon={TrendingDown}
    />
  );
}

export function RiskPage() {
  return (
    <ComingSoon
      title="Risk Monitoring"
      description="Monitor contractor payment behavior and identify high-risk accounts"
      icon={AlertTriangle}
    />
  );
}

export function BillRequestsPage() {
  return (
    <ComingSoon
      title="Bill Requests"
      description="Handle incoming bill requests from contractors and customers"
      icon={FileText}
    />
  );
}

export function WhatsAppPage() {
  return (
    <ComingSoon
      title="WhatsApp"
      description="Send bills, payment reminders, and statements via WhatsApp"
      icon={MessageSquare}
    />
  );
}

export function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Business intelligence — udhari reports, payment trends, contractor analytics"
      icon={BarChart3}
    />
  );
}

export function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Configure your business profile, preferences, and integrations"
      icon={Settings}
    />
  );
}
