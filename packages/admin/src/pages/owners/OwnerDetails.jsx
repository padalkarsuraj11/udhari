import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Clock,
  Users, Home, Receipt, CreditCard, Wifi, WifiOff,
  Edit, UserX, UserCheck, Building2, BadgeCheck
} from 'lucide-react';
import { OWNERS } from '../../data/mockData';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { Avatar, StatusBadge, RiskBadge, Card, PageHeader } from '../../components/ui';

export default function OwnerDetails() {
  const { id } = useParams();
  const owner   = OWNERS.find(o => o.id === id);

  if (!owner) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Owner Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          The owner you are looking for does not exist.
        </p>
        <Link to="/owners" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back to Owners
        </Link>
      </div>
    );
  }

  const risk = getRiskLevel(owner.overdue, owner.outstanding);
  const collectionRate = owner.outstanding > 0
    ? Math.round((1 - owner.outstanding / (owner.outstanding + (owner.transactions * 1200))) * 100)
    : 95;

  return (
    <div>
      {/* Back + Header */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/owners" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> Back to Owners
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar name={owner.ownerName} color={owner.avatarColor} size="lg" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800 }}>{owner.businessName}</h1>
                <StatusBadge status={owner.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={12} /> {owner.businessType}
                </span>
                <span>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> {owner.city}, {owner.state}
                </span>
                <span>·</span>
                <span>ID: {owner.id}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm">
              <Edit size={13} /> Edit Owner
            </button>
            {owner.status === 'active' ? (
              <button className="btn btn-danger btn-sm">
                <UserX size={13} /> Deactivate
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm" style={{ color: 'var(--success)' }}>
                <UserCheck size={13} /> Activate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <KpiMini label="Contractors" value={owner.contractors} icon={<Users size={16} />} color="#6366f1" />
        <KpiMini label="Customers" value={owner.customers} icon={<Home size={16} />} color="#0ea5e9" />
        <KpiMini label="Transactions" value={owner.transactions} icon={<Receipt size={16} />} color="#f59e0b" />
        <KpiMini label="Risk Level" value={<RiskBadge level={risk} />} icon={<BadgeCheck size={16} />} color={risk === 'critical' ? '#ef4444' : risk === 'high' ? '#f97316' : '#22c55e'} />
      </div>

      {/* Main Content Grid */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Business Information */}
        <Card>
          <div className="card-header">
            <div className="card-title">Business Information</div>
            <Building2 size={16} color="var(--text-muted)" />
          </div>

          <div className="detail-section-title">Owner Details</div>
          <DetailRow label="Owner Name"   value={owner.ownerName} />
          <DetailRow label="Business Name" value={owner.businessName} />
          <DetailRow label="Business Type" value={<span className="badge badge-neutral">{owner.businessType}</span>} />
          <DetailRow label="City"          value={`${owner.city}, ${owner.state}`} />

          <div className="detail-section-title" style={{ marginTop: 16 }}>Contact</div>
          <DetailRow
            label="Email"
            value={<a href={`mailto:${owner.email}`} style={{ color: 'var(--brand-400)' }}>{owner.email}</a>}
          />
          <DetailRow label="Phone" value={owner.phone} />
        </Card>

        {/* Account Information */}
        <Card>
          <div className="card-header">
            <div className="card-title">Account Information</div>
            <BadgeCheck size={16} color="var(--text-muted)" />
          </div>

          <div className="detail-section-title">Access</div>
          <DetailRow label="Account Status" value={<StatusBadge status={owner.status} />} />
          <DetailRow label="Plan"           value={
            <span className={`badge ${owner.plan === 'Enterprise' ? 'badge-brand' : owner.plan === 'Professional' ? 'badge-info' : 'badge-neutral'}`}>
              {owner.plan}
            </span>
          } />
          <DetailRow label="Account ID"    value={<span className="font-mono" style={{ fontSize: 11 }}>{owner.id}</span>} />

          <div className="detail-section-title" style={{ marginTop: 16 }}>Timeline</div>
          <DetailRow
            label="Created"
            value={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={12} color="var(--text-muted)" />
                {formatDate(owner.createdAt)}
              </span>
            }
          />
          <DetailRow
            label="Last Login"
            value={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color="var(--text-muted)" />
                {formatRelativeDate(owner.lastLogin)}
              </span>
            }
          />
        </Card>
      </div>

      {/* Financial Overview */}
      <Card style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Financial Overview</div>
            <div className="card-subtitle">Business credit and payment summary</div>
          </div>
          <CreditCard size={16} color="var(--text-muted)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Material Issued',   value: formatCurrency(owner.outstanding + owner.overdue + (owner.transactions * 800)), color: '#6366f1' },
            { label: 'Total Collected',   value: formatCurrency(owner.transactions * 800), color: '#22c55e' },
            { label: 'Outstanding',       value: formatCurrency(owner.outstanding), color: '#f59e0b' },
            { label: 'Overdue',           value: formatCurrency(owner.overdue), color: '#ef4444' },
            { label: 'Collection Rate',   value: `${collectionRate}%`, color: '#0ea5e9' },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 12px',
                border: '1px solid var(--border)',
                borderTop: `3px solid ${item.color}`,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Integration Overview */}
      <Card>
        <div className="card-header">
          <div className="card-title">Integration Overview</div>
          <Wifi size={16} color="var(--text-muted)" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <IntegrationRow
            name="WhatsApp Business"
            status="connected"
            description="Bill sharing & payment reminders active"
          />
          <IntegrationRow
            name="SMS Notifications"
            status="disconnected"
            description="Not configured — requires phone number"
          />
          <IntegrationRow
            name="Email Reports"
            status="connected"
            description="Daily summary emails enabled"
          />
        </div>
      </Card>
    </div>
  );
}

// ---- Helper sub-components ----
function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-key">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function KpiMini({ label, value, icon, color }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: typeof value === 'string' ? 22 : 'inherit', fontWeight: 800, color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function IntegrationRow({ name, status, description }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 'var(--radius-md)',
        background: status === 'connected' ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {status === 'connected'
          ? <Wifi size={16} color="#22c55e" />
          : <WifiOff size={16} color="#64748b" />
        }
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{description}</div>
      </div>
      <span className={`badge ${status === 'connected' ? 'badge-success' : 'badge-neutral'}`}>
        {status === 'connected' ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
