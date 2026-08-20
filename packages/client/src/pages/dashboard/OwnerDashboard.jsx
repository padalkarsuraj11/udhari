import {
  Package, CreditCard, TrendingDown, AlertTriangle,
  Clock, ShieldAlert, IndianRupee, CheckCircle,
  ArrowUpRight, RefreshCw, Calendar
} from 'lucide-react';
import {
  DASHBOARD_STATS, CONTRACTORS, OVERDUE_PAYMENTS, RECENT_TRANSACTIONS, UDHARI_RISK
} from '../../data/mockData';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { StatCard, PageHeader, RiskBadge, StatusBadge, Avatar, EmptyState, Card } from '../../components/ui';
import { Link } from 'react-router-dom';

export default function OwnerDashboard() {
  const stats = DASHBOARD_STATS;

  return (
    <div>
      <PageHeader
        title="Business Dashboard"
        description="Your complete trade credit overview — materials, udhari, and collections"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary btn-sm">
              <Calendar size={13} /> This Month
            </button>
            <button className="btn btn-ghost btn-sm">
              <RefreshCw size={13} />
            </button>
          </div>
        }
      />

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
          change={1}
        />
        <StatCard
          label="Total Collected"
          value={formatCurrency(stats.totalPaid, true)}
          icon={CheckCircle}
          accentColor="#22c55e"
          iconBg="rgba(34,197,94,0.12)"
          changeLabel="Payments received"
          change={1}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.totalOutstanding, true)}
          icon={TrendingDown}
          accentColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          changeLabel="Yet to be collected"
          change={-1}
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(stats.totalOverdue, true)}
          icon={AlertTriangle}
          accentColor="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          changeLabel="Past due date"
          change={-1}
        />
        <StatCard
          label="Due Today"
          value={formatCurrency(stats.dueToday, true)}
          icon={Clock}
          accentColor="#f97316"
          iconBg="rgba(249,115,22,0.12)"
          changeLabel="Needs attention today"
          change={-1}
        />
        <StatCard
          label="High Risk"
          value={formatCurrency(stats.highRiskOutstanding, true)}
          icon={ShieldAlert}
          accentColor="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          changeLabel="Critical + High risk"
          change={-1}
        />
      </div>

      {/* Udhari Risk Overview + Payments Attention */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Udhari Risk */}
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Udhari Risk Overview</div>
              <div className="card-subtitle">Current outstanding by risk level</div>
            </div>
            <Link to="/risk" className="btn btn-ghost btn-sm">
              View All <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="risk-overview">
            <div className="risk-card risk-card-normal">
              <div className="risk-card-value">{UDHARI_RISK.normal.count}</div>
              <div className="risk-card-label">Normal</div>
              <div className="risk-card-amount">{formatCurrency(UDHARI_RISK.normal.amount, true)}</div>
            </div>
            <div className="risk-card risk-card-medium">
              <div className="risk-card-value">{UDHARI_RISK.medium.count}</div>
              <div className="risk-card-label">Medium</div>
              <div className="risk-card-amount">{formatCurrency(UDHARI_RISK.medium.amount, true)}</div>
            </div>
            <div className="risk-card risk-card-high">
              <div className="risk-card-value">{UDHARI_RISK.high.count}</div>
              <div className="risk-card-label">High</div>
              <div className="risk-card-amount">{formatCurrency(UDHARI_RISK.high.amount, true)}</div>
            </div>
            <div className="risk-card risk-card-critical">
              <div className="risk-card-value">{UDHARI_RISK.critical.count}</div>
              <div className="risk-card-label">Critical</div>
              <div className="risk-card-amount">{formatCurrency(UDHARI_RISK.critical.amount, true)}</div>
            </div>
          </div>

          {/* Risk summary bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Risk Distribution</span>
              <span>Total: {formatCurrency(Object.values(UDHARI_RISK).reduce((s, r) => s + r.amount, 0), true)}</span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 'var(--radius-full)', overflow: 'hidden', gap: 2 }}>
              <div style={{ flex: UDHARI_RISK.normal.amount,   background: '#22c55e', borderRadius: 'var(--radius-full)' }} />
              <div style={{ flex: UDHARI_RISK.medium.amount,   background: '#eab308' }} />
              <div style={{ flex: UDHARI_RISK.high.amount,     background: '#f97316' }} />
              <div style={{ flex: UDHARI_RISK.critical.amount, background: '#ef4444', borderRadius: 'var(--radius-full)' }} />
            </div>
          </div>
        </Card>

        {/* Collection Rate */}
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Collection Summary</div>
              <div className="card-subtitle">Material issued vs collected</div>
            </div>
          </div>

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
              {Math.round((stats.totalPaid / stats.totalMaterialIssued) * 100)}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Collection Rate</div>
          </div>
        </Card>
      </div>

      {/* Payments Requiring Attention */}
      <div className="table-container" style={{ marginBottom: 20 }}>
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">⚠️ Payments Requiring Attention</div>
            <div className="table-toolbar-subtitle">
              {OVERDUE_PAYMENTS.length} overdue payments — {formatCurrency(OVERDUE_PAYMENTS.reduce((s, p) => s + p.outstanding, 0), true)} outstanding
            </div>
          </div>
          <Link to="/udhari" className="btn btn-secondary btn-sm">
            View All <ArrowUpRight size={13} />
          </Link>
        </div>

        {OVERDUE_PAYMENTS.length === 0 ? (
          <EmptyState
            title="No overdue payments"
            description="All payments are up to date. Great work!"
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Contractor</th>
                <th>Customer / Project</th>
                <th>Outstanding</th>
                <th>Due Date</th>
                <th>Days Overdue</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {OVERDUE_PAYMENTS.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.contractor}</td>
                  <td>{p.customer}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
                      {formatCurrency(p.outstanding)}
                    </span>
                  </td>
                  <td>{formatDate(p.dueDate)}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: p.daysOverdue > 15 ? 'var(--danger)' : 'var(--warning)' }}>
                      {p.daysOverdue} days
                    </span>
                  </td>
                  <td><RiskBadge level={p.risk} /></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-sm">Remind</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Top Outstanding Contractors */}
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
              <th>Customers</th>
              <th>Material Issued</th>
              <th>Paid</th>
              <th>Outstanding</th>
              <th>Overdue</th>
              <th>Risk</th>
              <th>Last Payment</th>
            </tr>
          </thead>
          <tbody>
            {[...CONTRACTORS]
              .sort((a, b) => b.outstanding - a.outstanding)
              .slice(0, 5)
              .map(c => {
                const risk = getRiskLevel(c.overdue, c.outstanding);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} color={c.avatarColor} size="sm" />
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          <div className="td-secondary">{c.contact}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.customers}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(c.totalIssued, true)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {formatCurrency(c.paid, true)}
                    </td>
                    <td style={{ fontWeight: 700, color: c.outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>
                      {c.outstanding > 0 ? formatCurrency(c.outstanding, true) : '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: c.overdue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {c.overdue > 0 ? formatCurrency(c.overdue, true) : '—'}
                    </td>
                    <td>
                      {c.outstanding > 0 ? <RiskBadge level={risk} /> : <span className="badge badge-success">Clear</span>}
                    </td>
                    <td className="td-secondary">{formatRelativeDate(c.lastPayment)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

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

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Contractor</th>
              <th>Customer / Project</th>
              <th>Material / Note</th>
              <th>Amount</th>
              <th>Advance</th>
              <th>Outstanding</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_TRANSACTIONS.map(txn => (
              <tr key={txn.id}>
                <td className="td-secondary">{formatDate(txn.date)}</td>
                <td style={{ fontWeight: 600 }}>{txn.contractorName}</td>
                <td>{txn.customerName}</td>
                <td
                  className="truncate"
                  style={{ maxWidth: 180 }}
                  title={txn.material}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: txn.type === 'payment' ? 'var(--success)' : 'var(--text-primary)',
                    }}
                  >
                    {txn.material}
                  </span>
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

        <div className="table-footer">
          <span>Showing last {RECENT_TRANSACTIONS.length} transactions</span>
          <Link to="/transactions" style={{ color: 'var(--accent-400)', fontSize: 12 }}>View all →</Link>
        </div>
      </div>
    </div>
  );
}

// ---- Helper sub-components ----
function CollectionRow({ label, value, amount, max, color }) {
  const pct = max > 0 ? (amount / max) * 100 : 0;
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
