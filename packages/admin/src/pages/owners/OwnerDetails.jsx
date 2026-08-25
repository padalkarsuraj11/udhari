// ============================================================
// OWNER DETAILS PAGE — Admin Side
// Shows full details for a specific owner tenant, loaded from
// the real API endpoint: GET /api/admin/owners/:id
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Clock,
  Users, Home, Receipt, CreditCard, Wifi, WifiOff,
  Edit, UserX, UserCheck, Building2, BadgeCheck,
  RefreshCw, Globe, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { Avatar, StatusBadge, RiskBadge, Card, PageHeader } from '../../components/ui';

// ── API helper ──
function useApi() {
  const { session } = useAuth();
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  const apiFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Request failed: ${res.status}`);
    }
    return res.json();
  }, [apiUrl, session?.access_token]);

  return apiFetch;
}

export default function OwnerDetails() {
  const { id }     = useParams();
  const apiFetch   = useApi();

  const [owner,       setOwner]       = useState(null);
  const [auditLogs,   setAuditLogs]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMsg,   setStatusMsg]   = useState('');

  const loadOwner = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ownerData, auditData] = await Promise.all([
        apiFetch(`/admin/owners/${id}`),
        apiFetch(`/admin/owners/${id}/audit?limit=5`),
      ]);
      setOwner(ownerData);
      setAuditLogs(auditData.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load owner details');
    } finally {
      setLoading(false);
    }
  }, [id, apiFetch]);

  useEffect(() => { loadOwner(); }, [loadOwner]);

  async function handleStatusChange(newStatus) {
    setStatusLoading(true);
    setStatusMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
      const { session } = { session: null }; // will re-use apiFetch below

      await apiFetch(`/admin/owners/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      // Refresh owner data
      const updated = await apiFetch(`/admin/owners/${id}`);
      setOwner(updated);
      setStatusMsg(
        newStatus === 'active'
          ? '✅ Owner account activated'
          : '⚠️ Owner account deactivated'
      );
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setStatusMsg(`❌ ${err.message}`);
    } finally {
      setStatusLoading(false);
    }
  }

  // ── Loading State ──
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 4 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading owner details…</p>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={40} color="var(--danger)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>
          {error.includes('not found') ? 'Owner Not Found' : 'Failed to Load'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{error}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link to="/owners" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back to Owners
          </Link>
          <button className="btn btn-primary btn-sm" onClick={loadOwner}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!owner) return null;

  const stats = owner.stats || {};
  const risk  = getRiskLevel(stats.overdue || 0, stats.outstanding || 0);

  return (
    <div>
      {/* Back + Header */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/owners" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> Back to Owners
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar name={owner.owner_name} size="lg" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800 }}>{owner.business_name}</h1>
                <StatusBadge status={owner.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 12, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={12} /> {owner.business_type}
                </span>
                {(owner.city || owner.state) && (
                  <>
                    <span>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} /> {[owner.city, owner.state].filter(Boolean).join(', ')}
                    </span>
                  </>
                )}
                <span>·</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>ID: {owner.id?.slice(0, 8)}…</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {statusMsg && (
              <span style={{ fontSize: 12, color: statusMsg.startsWith('✅') ? 'var(--success)' : statusMsg.startsWith('❌') ? 'var(--danger)' : 'var(--warning)' }}>
                {statusMsg}
              </span>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={loadOwner}
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
            {owner.status === 'active' ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleStatusChange('inactive')}
                disabled={statusLoading}
              >
                {statusLoading
                  ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Updating…</>
                  : <><UserX size={13} /> Deactivate</>
                }
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--success)' }}
                onClick={() => handleStatusChange('active')}
                disabled={statusLoading}
              >
                {statusLoading
                  ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Updating…</>
                  : <><UserCheck size={13} /> Activate</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <KpiMini label="Contractors"  value={stats.contractors || 0}  icon={<Users size={16} />}   color="#6366f1" />
        <KpiMini label="Customers"    value={stats.customers || 0}    icon={<Home size={16} />}    color="#0ea5e9" />
        <KpiMini label="Transactions" value={stats.transactions || 0} icon={<Receipt size={16} />} color="#f59e0b" />
        <KpiMini
          label="Risk Level"
          value={<RiskBadge level={risk} />}
          icon={<BadgeCheck size={16} />}
          color={risk === 'critical' ? '#ef4444' : risk === 'high' ? '#f97316' : '#22c55e'}
        />
      </div>

      {/* Main Grid */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Business Information */}
        <Card>
          <div className="card-header">
            <div className="card-title">Business Information</div>
            <Building2 size={16} color="var(--text-muted)" />
          </div>

          <div className="detail-section-title">Owner Details</div>
          <DetailRow label="Owner Name"    value={owner.owner_name} />
          <DetailRow label="Business Name" value={owner.business_name} />
          <DetailRow label="Business Type" value={<span className="badge badge-neutral">{owner.business_type}</span>} />
          {(owner.city || owner.state) && (
            <DetailRow label="Location" value={[owner.city, owner.state, owner.country].filter(Boolean).join(', ')} />
          )}
          {owner.address && (
            <DetailRow label="Address" value={owner.address} />
          )}

          <div className="detail-section-title" style={{ marginTop: 16 }}>Contact</div>
          <DetailRow
            label="Email"
            value={<a href={`mailto:${owner.email}`} style={{ color: 'var(--brand-400)' }}>{owner.email}</a>}
          />
          {owner.phone && <DetailRow label="Phone" value={owner.phone} />}
          {owner.country && (
            <DetailRow
              label="Country"
              value={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={12} color="var(--text-muted)" />{owner.country}</span>}
            />
          )}
        </Card>

        {/* Account Information */}
        <Card>
          <div className="card-header">
            <div className="card-title">Account Information</div>
            <BadgeCheck size={16} color="var(--text-muted)" />
          </div>

          <div className="detail-section-title">Access</div>
          <DetailRow label="Account Status" value={<StatusBadge status={owner.status} />} />
          <DetailRow
            label="Plan"
            value={
              <span className={`badge ${owner.plan === 'Enterprise' ? 'badge-brand' : owner.plan === 'Professional' ? 'badge-info' : 'badge-neutral'}`}>
                {owner.plan}
              </span>
            }
          />
          <DetailRow
            label="Login ID"
            value={<span style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.05em' }}>{owner.login_identifier}</span>}
          />
          <DetailRow
            label="Account ID"
            value={<span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{owner.id}</span>}
          />

          <div className="detail-section-title" style={{ marginTop: 16 }}>Timeline</div>
          <DetailRow
            label="Created"
            value={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={12} color="var(--text-muted)" />
                {formatDate(owner.created_at)}
              </span>
            }
          />
          <DetailRow
            label="Last Updated"
            value={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} color="var(--text-muted)" />
                {formatRelativeDate(owner.updated_at)}
              </span>
            }
          />
          {owner.user_profiles?.[0]?.last_seen_at && (
            <DetailRow
              label="Last Login"
              value={
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} color="var(--text-muted)" />
                  {formatRelativeDate(owner.user_profiles[0].last_seen_at)}
                </span>
              }
            />
          )}
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

        {stats.transactions === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            No transactions yet — this owner has just been set up.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Material Issued',   value: formatCurrency(stats.totalIssued || 0, true),  color: '#6366f1' },
              { label: 'Outstanding',       value: formatCurrency(stats.outstanding || 0, true),   color: '#f59e0b' },
              { label: 'Overdue',           value: formatCurrency(stats.overdue || 0, true),        color: '#ef4444' },
              { label: 'Contractors',       value: stats.contractors || 0,                          color: '#0ea5e9' },
              { label: 'Customers',         value: stats.customers || 0,                            color: '#22c55e' },
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
        )}
      </Card>

      {/* Audit Log */}
      {auditLogs.length > 0 && (
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Platform actions for this owner</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {auditLogs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{formatAction(log.action)}</div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatMetadata(log.metadata)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatRelativeDate(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Helper functions ──
function formatAction(action) {
  const labels = {
    admin_created_owner:    '✅ Owner account created',
    admin_activated_owner:  '✅ Account activated',
    admin_deactivated_owner:'⚠️ Account deactivated',
    admin_suspended_owner:  '🚫 Account suspended',
    admin_updated_owner:    '✏️ Owner info updated',
    user_login:             '🔐 Owner logged in',
    user_logout:            '🚪 Owner logged out',
  };
  return labels[action] || action.replace(/_/g, ' ');
}

function formatMetadata(meta) {
  if (meta.updated_fields) return `Fields: ${meta.updated_fields.join(', ')}`;
  if (meta.created_by)     return `By: ${meta.created_by}`;
  if (meta.updated_by)     return `By: ${meta.updated_by}`;
  return '';
}

// ── Sub-components ──
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
