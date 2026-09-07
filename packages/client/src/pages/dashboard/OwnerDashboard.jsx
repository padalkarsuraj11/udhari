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
  ArrowUpRight, RefreshCw, Calendar, Building2, Zap, Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { StatCard, PageHeader, RiskBadge, StatusBadge, Avatar, EmptyState, Card } from '../../components/ui';
import { RecordPaymentModal } from '../../components/modals';
import { Link } from 'react-router-dom';

// ── Plain-English Risk descriptions ──────────────────────────
const RISK_INFO = {
  normal:   { label: 'On Time',   desc: 'Paying regularly, no issues',     color: '#22c55e', bg: 'rgba(34,197,94,0.10)'   },
  medium:   { label: 'Delayed',   desc: 'A few days late, keep an eye',    color: '#eab308', bg: 'rgba(234,179,8,0.10)'   },
  high:     { label: 'At Risk',   desc: 'Often late, needs follow-up',     color: '#f97316', bg: 'rgba(249,115,22,0.10)'  },
  critical: { label: 'Urgent',    desc: 'Very overdue, action required',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)'   },
};

// ── Small count KPI card (for non-currency stats) ─────────────
function CountCard({ label, value, sub, icon: Icon, color, iconBg }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
        {Icon && (
          <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} style={{ color }} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export default function OwnerDashboard() {
  const { session, businessName, tenantId } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [quickPayContractor, setQuickPayContractor] = useState(null);

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

  // Collection rate = totalPaid / totalMaterialIssued (both now accurate from backend)
  const collectionPct = stats.totalMaterialIssued > 0
    ? Math.round((stats.totalPaid / stats.totalMaterialIssued) * 100)
    : 0;

  const totalRiskAccounts = riskSummary.normal + riskSummary.medium + riskSummary.high + riskSummary.critical;

  return (
    <div>
      <PageHeader
        title={businessName ? `${businessName} Dashboard` : 'Business Dashboard'}
        description="Your complete udhari overview — goods given, payments collected, and what's still pending"
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
              Your account is ready. Start by adding your contractors and customers to begin tracking udhari.
            </div>
          </div>
          <Link to="/contractors" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            Add First Contractor
          </Link>
        </div>
      )}

      {/* ── Section: People ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        👥 People
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <CountCard
          label="Contractors"
          value={stats.totalContractors}
          sub={`${stats.activeContractors ?? stats.totalContractors} currently active`}
          icon={Building2}
          color="#6366f1"
          iconBg="rgba(99,102,241,0.12)"
        />
        <CountCard
          label="Customers / Projects"
          value={stats.totalCustomers}
          sub={`${stats.activeCustomers ?? stats.totalCustomers} with open balance`}
          icon={Users}
          color="#8b5cf6"
          iconBg="rgba(139,92,246,0.12)"
        />
        <CountCard
          label="Total Transactions"
          value={stats.totalTransactions}
          sub="Material issue entries"
          icon={Package}
          color="#64748b"
          iconBg="rgba(100,116,139,0.12)"
        />
      </div>

      {/* ── Section: Money ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        💰 Money Overview
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Total Goods Issued"
          value={formatCurrency(stats.totalMaterialIssued, true)}
          icon={Package}
          accentColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          changeLabel="Total udhari given to contractors"
          change={0}
        />
        <StatCard
          label="Upfront Payments"
          value={formatCurrency(stats.totalAdvanceReceived, true)}
          icon={IndianRupee}
          accentColor="#22c55e"
          iconBg="rgba(34,197,94,0.12)"
          changeLabel="Received before material was given"
          change={stats.totalAdvanceReceived > 0 ? 1 : 0}
        />
        <StatCard
          label="Total Collected"
          value={formatCurrency(stats.totalPaid, true)}
          icon={CheckCircle}
          accentColor="#22c55e"
          iconBg="rgba(34,197,94,0.12)"
          changeLabel="Actual payments received so far"
          change={stats.totalPaid > 0 ? 1 : 0}
        />
        <StatCard
          label="Pending to Collect"
          value={formatCurrency(stats.totalOutstanding, true)}
          icon={TrendingDown}
          accentColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          changeLabel="Balance still to be received"
          change={stats.totalOutstanding > 0 ? -1 : 0}
        />
        <StatCard
          label="Overdue Amount"
          value={formatCurrency(stats.totalOverdue, true)}
          icon={AlertTriangle}
          accentColor="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          changeLabel="Past due date — needs attention"
          change={stats.totalOverdue > 0 ? -1 : 0}
        />
        <StatCard
          label="Due Today"
          value={formatCurrency(stats.dueToday, true)}
          icon={Clock}
          accentColor="#f97316"
          iconBg="rgba(249,115,22,0.12)"
          changeLabel="Needs collection today"
          change={stats.dueToday > 0 ? -1 : 0}
        />
        <StatCard
          label="At-Risk Amount"
          value={formatCurrency(stats.highRiskOutstanding, true)}
          icon={ShieldAlert}
          accentColor="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          changeLabel="High + Critical risk accounts"
          change={stats.highRiskOutstanding > 0 ? -1 : 0}
        />
      </div>

      {/* Risk Overview + Collection Summary */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Udhari Risk Overview */}
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Payment Risk Overview</div>
              <div className="card-subtitle">How likely each customer is to pay on time</div>
            </div>
          </div>

          {isNewAccount ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No risk data yet — add transactions to see how customers are paying
            </div>
          ) : totalRiskAccounts === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Risk data loading…
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {Object.entries(RISK_INFO).map(([key, info]) => (
                  <div key={key} style={{
                    background: info.bg,
                    border: `1px solid ${info.color}30`,
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 8px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: info.color, lineHeight: 1 }}>
                      {riskSummary[key] || 0}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: info.color, marginTop: 2 }}>{info.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>{info.desc}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Risk spread</span>
                  <span>Total: {totalRiskAccounts} account{totalRiskAccounts !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', height: 8, borderRadius: 'var(--radius-full)', overflow: 'hidden', gap: 2 }}>
                  {riskSummary.normal   > 0 && <div style={{ flex: riskSummary.normal,   background: '#22c55e', borderRadius: 'var(--radius-full)' }} title={`${riskSummary.normal} on time`} />}
                  {riskSummary.medium   > 0 && <div style={{ flex: riskSummary.medium,   background: '#eab308' }} title={`${riskSummary.medium} delayed`} />}
                  {riskSummary.high     > 0 && <div style={{ flex: riskSummary.high,     background: '#f97316' }} title={`${riskSummary.high} at risk`} />}
                  {riskSummary.critical > 0 && <div style={{ flex: riskSummary.critical, background: '#ef4444', borderRadius: 'var(--radius-full)' }} title={`${riskSummary.critical} urgent`} />}
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
              <div className="card-subtitle">How much of the total udhari has been collected</div>
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
                  label="Total Goods Issued (Full Amount)"
                  value={formatCurrency(stats.totalMaterialIssued, true)}
                  amount={stats.totalMaterialIssued}
                  max={stats.totalMaterialIssued}
                  color="#6366f1"
                />
                <CollectionRow
                  label="Collected So Far"
                  value={formatCurrency(stats.totalPaid, true)}
                  amount={stats.totalPaid}
                  max={stats.totalMaterialIssued}
                  color="#22c55e"
                />
                <CollectionRow
                  label="Still Pending"
                  value={formatCurrency(stats.totalOutstanding, true)}
                  amount={stats.totalOutstanding}
                  max={stats.totalMaterialIssued}
                  color="#f59e0b"
                />
                <CollectionRow
                  label="Overdue (Past Due Date)"
                  value={formatCurrency(stats.totalOverdue, true)}
                  amount={stats.totalOverdue}
                  max={stats.totalMaterialIssued}
                  color="#ef4444"
                />
              </div>

              <div className="divider" />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: collectionPct >= 80 ? '#22c55e' : collectionPct >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {collectionPct}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Collection Rate
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                    — {collectionPct >= 80 ? 'Great!' : collectionPct >= 50 ? 'Keep following up' : 'Needs attention'}
                  </span>
                </div>
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
              <div className="table-toolbar-title">Contractors with Pending Amount</div>
              <div className="card-subtitle">Contractors who still have udhari balance — sorted by highest first</div>
            </div>
            <Link to="/contractors" className="btn btn-secondary btn-sm">
              All Contractors <ArrowUpRight size={13} />
            </Link>
          </div>

          <table>
            <thead>
              <tr>
                <th>Contractor Name</th>
                <th>Pending Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {topContractors.map(c => {
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
                      {c.outstanding > 0 ? (
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--warning)', fontSize: 15 }}>
                            {formatCurrency(c.outstanding, true)}
                          </span>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>still to collect</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ All Clear</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/contractors/${c.id}`} className="btn btn-ghost btn-sm">
                          View →
                        </Link>
                        {c.outstanding > 0 && (
                          <button
                            className="btn btn-sm"
                            style={{
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              border: 'none', color: '#fff', fontWeight: 700, fontSize: 11,
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '5px 10px',
                              boxShadow: '0 2px 6px rgba(34,197,94,0.3)',
                            }}
                            onClick={() => setQuickPayContractor(c)}
                          >
                            <Zap size={11} /> Record Payment
                          </button>
                        )}
                      </div>
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
            <div className="table-toolbar-title">Recent Material Issues</div>
            <div className="card-subtitle">Latest goods given out — showing status of each</div>
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
                <th>What Was Given</th>
                <th>Total Amount</th>
                <th>Upfront Paid</th>
                <th>Balance Left</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(txn => (
                <tr key={txn.id}>
                  <td className="td-secondary">{formatDate(txn.date)}</td>
                  <td style={{ fontWeight: 600 }}>{txn.contractorName}</td>
                  <td>{txn.customerName || '—'}</td>
                  <td className="truncate" style={{ maxWidth: 160 }} title={txn.description}>
                    <span style={{ fontSize: 12 }}>{txn.description || 'Material issued'}</span>
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
                      : <span style={{ color: 'var(--success)' }}>✓ Cleared</span>}
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
      {/* Quick Pay Modal from Dashboard */}
      {quickPayContractor && (
        <RecordPaymentModal
          isOpen={Boolean(quickPayContractor)}
          onClose={() => setQuickPayContractor(null)}
          onSuccess={() => { setQuickPayContractor(null); loadDashboard(); }}
          preselectedContractorId={quickPayContractor.id}
          outstandingAmount={quickPayContractor.outstanding}
        />
      )}
    </div>
  );
}

// ── Empty dashboard skeleton when no data ──
const EMPTY_DASHBOARD = {
  stats: {
    totalContractors:     0,
    activeContractors:    0,
    totalCustomers:       0,
    activeCustomers:      0,
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
