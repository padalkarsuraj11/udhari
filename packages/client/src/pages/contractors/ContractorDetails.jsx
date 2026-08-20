import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, Users, Home,
  Receipt, CreditCard, AlertTriangle, FileText
} from 'lucide-react';
import { CONTRACTORS, CUSTOMERS } from '../../data/mockData';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { Avatar, RiskBadge, StatusBadge, Card } from '../../components/ui';

const TABS = ['Overview', 'Customers / Projects', 'Transactions', 'Payments', 'Bills', 'Risk'];

export default function ContractorDetails() {
  const { id } = useParams();
  const contractor = CONTRACTORS.find(c => c.id === id);

  if (!contractor) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2 style={{ marginBottom: 8 }}>Contractor Not Found</h2>
        <Link to="/contractors" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>
    );
  }

  const risk = getRiskLevel(contractor.overdue, contractor.outstanding);
  const contractorCustomers = CUSTOMERS.filter(c => c.contractorId === id);

  return (
    <div>
      {/* Back */}
      <Link to="/contractors" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Contractors
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={contractor.name} color={contractor.avatarColor} size="lg" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{contractor.name}</h1>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={12} /> {contractor.phone}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {contractor.city}
              </span>
              <span>Member since {formatDate(contractor.joinedAt)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm">Record Payment</button>
          <button className="btn btn-primary btn-sm">Issue Material</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Issued',  value: formatCurrency(contractor.totalIssued, true), color: '#6366f1' },
          { label: 'Paid',          value: formatCurrency(contractor.paid, true),         color: '#22c55e' },
          { label: 'Outstanding',   value: formatCurrency(contractor.outstanding, true),  color: '#f59e0b' },
          { label: 'Overdue',       value: formatCurrency(contractor.overdue, true),      color: '#ef4444' },
        ].map(item => (
          <div
            key={item.label}
            className="card"
            style={{ borderTop: `3px solid ${item.color}` }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs placeholder */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((tab, i) => (
          <button key={tab} className={`tab ${i === 0 ? 'active' : ''}`}>{tab}</button>
        ))}
      </div>

      {/* Overview Content */}
      <div className="grid-2">
        {/* Business Info */}
        <Card>
          <div className="card-header">
            <div className="card-title">Contractor Details</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <InfoRow label="Full Name"   value={contractor.contact} />
            <InfoRow label="Business"    value={contractor.name} />
            <InfoRow label="Phone"       value={contractor.phone} />
            <InfoRow label="Email"       value={contractor.email} />
            <InfoRow label="City"        value={contractor.city} />
            <InfoRow label="Last Payment" value={formatRelativeDate(contractor.lastPayment)} />
            <InfoRow label="Risk Level"  value={<RiskBadge level={risk} />} />
          </div>
        </Card>

        {/* Customers / Projects */}
        <Card>
          <div className="card-header">
            <div className="card-title">Customers / Projects ({contractorCustomers.length})</div>
            <button className="btn btn-secondary btn-sm">
              <Home size={13} /> Add Customer
            </button>
          </div>

          {contractorCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              No customers added yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contractorCustomers.map(cus => (
                <div
                  key={cus.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', background: 'var(--bg-base)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{cus.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cus.type} · {cus.address}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: cus.outstanding > 0 ? 'var(--warning)' : 'var(--success)', fontSize: 13 }}>
                      {cus.outstanding > 0 ? formatCurrency(cus.outstanding, true) : 'Cleared'}
                    </div>
                    <StatusBadge status={cus.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ width: 110, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
