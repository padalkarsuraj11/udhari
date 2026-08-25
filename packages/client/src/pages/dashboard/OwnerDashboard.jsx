// ============================================================
// OWNER DASHBOARD — Client (Owner) Frontend
// Displays real business metrics fetched from /api/owner/dashboard
// Falls back to empty states when no data exists yet.
// Mock data is no longer used.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Package, CreditCard, TrendingDown, AlertTriangle,
  Clock, ShieldAlert, IndianRupee, CheckCircle,
  ArrowUpRight, RefreshCw, Calendar, Building2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { StatCard, PageHeader, RiskBadge, StatusBadge, Avatar, EmptyState, Card } from '../../components/ui';
import { Link } from 'react-router-dom';

export default function OwnerDashboard() {
  const { session, businessName, tenantId } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    if (!session?.access_token || session.access_token === 'demo-owner-token') {
      // Demo mode — use empty data, not mock data
      setData(EMPTY_DASHBOARD);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/owner/dashboard`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Dashboard request failed: ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard');
      setData(EMPTY_DASHBOARD); // Show empty state rather than nothing
    } finally {
      setLoading(false);
    }
  }, [apiUrl, session?.access_token]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const stats = data?.stats || EMPTY_DASHBOARD.stats;
  const riskSummary = data?.riskSummary || { normal: 0, medium: 0, high: 0, critical: 0 };
  const recentTransactions = data?.recentTransactions || [];
  const topContractors = data?.topContractors || [];

  const isNewAccount = !loading && stats.totalTransactions === 0;

  return (
    <div>
      <PageHeader
        title={businessName ? `${businessName} Dashboard` : 'Business Dashboard'}
        description="Your complete trade credit overview — materials, udhari, and collections"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary btn-sm">
              <Calendar size={13} /> This Month
            </button>
            <button className="btn btn-ghost btn-sm" onClick={loadDashboard} disabled={loading} title="Refresh">
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
            </button>
          </div>
        }
      />

      {/* Error banner */}
      {error && !loading && (
        <div style={{
          marginBottom: 20,
          padding: '10px 16px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={14} />
          {error}
          <button className="btn btn-ghost btn-sm" onClick={loadDashboard} style={{ marginLeft: 'auto', fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* New Account Welcome */}
      {isNewAccount && !error && (
        <div style={{
          marginBottom: 20,
          padding: '20px 24px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={24} color="var(--brand-400)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Welcome to {businessName || 'your business'}! 🎉</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Your account is set up and ready. Start by adding your contractors and customers.
            </div>
          </div>
          <Link to="/contractors" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            Add First Contractor
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          label="Material Issued"
          value={formatCurrency(stats.totalMaterialIssued, true)}
          icon={Package}
          accentColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          changeLabel="Total credit extended"
          change={0}
        />
        <StatCard
          label="Advance Received"
          value={formatCurrency(stats.totalAdvanceReceived, true)}
          icon={IndianRupee}
          accentColor="#22c55e"
          iconBg="rgba(34,197,94,0.12)"
          changeLabel="Upfront payments"
          change={stats.totalAdvanceReceived > 0 ? 1 : 0}
        />
        <StatCard
          label="Total Collected"
          value={formatCurrency(stats.totalPaid, true)}
          icon={CheckCircle}
          accentColor="#22c55e"
          iconBg="rgba(34,197,94,0.12)"
          changeLabel="Payments received"
          change={stats.totalPaid > 0 ? 1 : 0}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.totalOutstanding, true)}
          icon={TrendingDown}
          accentColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          changeLabel="Yet to be collected"
          change={stats.totalOutstanding > 0 ? -1 : 0}
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(stats.totalOverdue, true)}
          icon={AlertTriangle}
          accentColor="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          changeLabel="Past due date"
          change={stats.totalOverdue > 0 ? -1 : 0}
        />
        <StatCard
          label="Due Today"
          value={formatCurrency(stats.dueToday, true)}
          icon={Clock}
          accentColor="#f97316"
          iconBg="rgba(249,115,22,0.12)"
          changeLabel="Needs attention today"
          change={stats.dueToday > 0 ? -1 : 0}
        />
        <StatCard
          label="High Risk"
          value={formatCurrency(stats.highRiskOutstanding, true)}
          icon={ShieldAlert}
          accentColor="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          changeLabel="Critical + High risk"
          change={stats.highRiskOutstanding > 0 ? -1 : 0}
        />
      </div>

      {/* Risk Overview + Collection Summary */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Udhari Risk Overview */}
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Udhari Risk Overview</div>
              <div className="card-subtitle">Outstanding by risk level</div>
            </div>
          </div>

          {isNewAccount ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No risk data yet — add transactions to see risk distribution
            </div>
          ) : (
            <>
              <div className="risk-overview">
                <div className="risk-card risk-card-normal">
                  <div className="risk-card-value">{riskSummary.normal}</div>
                  <div className="risk-card-label">Normal</div>
                </div>
                <div className="risk-card risk-card-medium">
                  <div className="risk-card-value">{riskSummary.medium}</div>
                  <div className="risk-card-label">Medium</div>
                </div>
                <div className="risk-card risk-card-high">
                  <div className="risk-card-value">{riskSummary.high}</div>
                  <div className="risk-card-label">High</div>
                </div>
                <div className="risk-card risk-card-critical">
                  <div className="risk-card-value">{riskSummary.critical}</div>
                  <div className="risk-card-label">Critical</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Risk Distribution</span>
                  <span>Total: {riskSummary.normal + riskSummary.medium + riskSummary.high + riskSummary.critical} accounts</span>
                </div>
                <div style={{ display: 'flex', height: 8, borderRadius: 'var(--radius-full)', overflow: 'hidden', gap: 2 }}>
                  {riskSummary.normal   > 0 && <div style={{ flex: riskSummary.normal,   background: '#22c55e', borderRadius: 'var(--radius-full)' }} />}
                  {riskSummary.medium   > 0 && <div style={{ flex: riskSummary.medium,   background: '#eab308' }} />}
                  {riskSummary.high     > 0 && <div style={{ flex: riskSummary.high,     background: '#f97316' }} />}
                  {riskSummary.critical > 0 && <div style={{ flex: riskSummary.critical, background: '#ef4444', borderRadius: 'var(--radius-full)' }} />}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Collection Summary */}
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Collection Summary</div>
              <div className="card-subtitle">Material issued vs collected</div>
            </div>
          </div>

          {isNewAccount ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No transactions recorded yet
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <CollectionRow
                  label="Total Issued"
                  value={formatCurrency(stats.totalMaterialIssued, true)}
                  amount={stats.totalMaterialIssued}
                  max={stats.totalMaterialIssued}
                  color="#6366f1"
                />
                <CollectionRow
                  label="Collected"
                  value={formatCurrency(stats.totalPaid, true)}
                  amount={stats.totalPaid}
                  max={stats.totalMaterialIssued}
                  color="#22c55e"
                />
                <CollectionRow
                  label="Outstanding"
                  value={formatCurrency(stats.totalOutstanding, true)}
                  amount={stats.totalOutstanding}
                  max={stats.totalMaterialIssued}
                  color="#f59e0b"
                />
                <CollectionRow
                  label="Overdue"
                  value={formatCurrency(stats.totalOverdue, true)}
                  amount={stats.totalOverdue}
                  max={stats.totalMaterialIssued}
                  color="#ef4444"
                />
              </div>

              <div className="divider" />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e' }}>
                  {stats.totalMaterialIssued > 0
                    ? Math.round((stats.totalPaid / stats.totalMaterialIssued) * 100)
                    : 0}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Collection Rate</div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Top Outstanding Contractors */}
      {topContractors.length > 0 && (
        <div className="table-container" style={{ marginBottom: 20 }}>
          <div className="table-toolbar">
            <div>
              <div className="table-toolbar-title">Top Outstanding Contractors</div>
              <div className="card-subtitle">Where your money is currently deployed</div>
            </div>
            <Link to="/contractors" className="btn btn-secondary btn-sm">
              All Contractors <ArrowUpRight size={13} />
            </Link>
          </div>

          <table>
            <thead>
              <tr>
                <th>Contractor</th>
                <th>Outstanding</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {topContractors.map(c => {
                const risk = getRiskLevel(0, c.outstanding);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} size="sm" />
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          {c.phone && <div className="td-secondary">{c.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>
                        {c.outstanding > 0 ? formatCurrency(c.outstanding, true) : 'Clear'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/contractors/${c.id}`} className="btn btn-ghost btn-sm">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">Recent Transactions</div>
            <div className="card-subtitle">Material issues and payment receipts</div>
          </div>
          <Link to="/transactions" className="btn btn-secondary btn-sm">
            All Transactions <ArrowUpRight size={13} />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description={
              isNewAccount
                ? "Start by adding a contractor, then record material transactions."
                : "No transactions recorded in the selected period."
            }
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Contractor</th>
                <th>Customer / Project</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Advance</th>
                <th>Outstanding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(txn => (
                <tr key={txn.id}>
                  <td className="td-secondary">{formatDate(txn.date)}</td>
                  <td style={{ fontWeight: 600 }}>{txn.contractorName}</td>
                  <td>{txn.customerName || '—'}</td>
                  <td className="truncate" style={{ maxWidth: 180 }} title={txn.description}>
                    <span style={{ fontSize: 12 }}>{txn.description || '—'}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(txn.amount)}</td>
                  <td>
                    {txn.advance > 0
                      ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(txn.advance)}</span>
                      : <span className="td-secondary">—</span>}
                  </td>
                  <td>
                    {txn.outstanding > 0
                      ? <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{formatCurrency(txn.outstanding)}</span>
                      : <span style={{ color: 'var(--success)' }}>—</span>}
                  </td>
                  <td><StatusBadge status={txn.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {recentTransactions.length > 0 && (
          <div className="table-footer">
            <span>Showing last {recentTransactions.length} transactions</span>
            <Link to="/transactions" style={{ color: 'var(--accent-400)', fontSize: 12 }}>View all →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty dashboard skeleton when no data ──
const EMPTY_DASHBOARD = {
  stats: {
    totalContractors:     0,
    activeContractors:    0,
    totalCustomers:       0,
    totalTransactions:    0,
    totalMaterialIssued:  0,
    totalAdvanceReceived: 0,
    totalOutstanding:     0,
    totalOverdue:         0,
    totalPaid:            0,
    dueToday:             0,
    highRiskOutstanding:  0,
  },
  riskSummary:        { normal: 0, medium: 0, high: 0, critical: 0 },
  recentTransactions: [],
  topContractors:     [],
};

// ── Sub-components ──
function CollectionRow({ label, value, amount, max, color }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
