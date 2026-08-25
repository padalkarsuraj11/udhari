import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, RefreshCw,
  IndianRupee, Package, Home, Receipt, CreditCard, AlertTriangle,
} from 'lucide-react';
import { useContractor } from '../../lib/api';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { Avatar, RiskBadge, StatusBadge, Card, LoadingState, ErrorState } from '../../components/ui';
import { IssueMaterialModal, RecordPaymentModal, AddCustomerModal } from '../../components/modals';

const TABS = [
  { key: 'overview',      label: 'Overview',            icon: Home    },
  { key: 'customers',     label: 'Customers / Projects', icon: Home    },
  { key: 'transactions',  label: 'Transactions',         icon: Receipt },
  { key: 'payments',      label: 'Payments',             icon: CreditCard },
  { key: 'risk',          label: 'Risk',                 icon: AlertTriangle },
];

export default function ContractorDetails() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useContractor(id);

  const [activeTab,     setActiveTab]     = useState('overview');
  const [showIssue,     setShowIssue]     = useState(false);
  const [showPayment,   setShowPayment]   = useState(false);
  const [showAddCust,   setShowAddCust]   = useState(false);

  if (loading) return <LoadingState message="Loading contractor…" />;
  if (error)   return <ErrorState  message={error} onRetry={refetch} />;

  const contractor  = data?.contractor;
  const customers   = data?.customers   || [];
  const transactions= data?.transactions|| [];
  const payments    = data?.payments    || [];

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

  return (
    <div>
      {/* Back */}
      <Link to="/contractors" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Contractors
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={contractor.name} size="lg" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{contractor.name}</h1>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              {contractor.phone && (
                <a href={`tel:${contractor.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'inherit' }}>
                  <Phone size={12} /> {contractor.phone}
                </a>
              )}
              {contractor.email && (
                <a href={`mailto:${contractor.email}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'inherit' }}>
                  <Mail size={12} /> {contractor.email}
                </a>
              )}
              {contractor.city && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> {contractor.city}
                </span>
              )}
              <span>Member since {formatDate(contractor.joinedAt)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={refetch} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPayment(true)}>
            <IndianRupee size={13} /> Record Payment
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowIssue(true)}>
            <Package size={13} /> Issue Material
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Issued',  value: formatCurrency(contractor.totalIssued  || 0, true), color: '#6366f1' },
          { label: 'Paid',          value: formatCurrency(contractor.totalPaid    || 0, true), color: '#22c55e' },
          { label: 'Outstanding',   value: formatCurrency(contractor.outstanding  || 0, true), color: '#f59e0b' },
          { label: 'Overdue',       value: formatCurrency(contractor.overdue      || 0, true), color: '#ef4444' },
        ].map(item => (
          <div key={item.label} className="card" style={{ borderTop: `3px solid ${item.color}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid-2">
          <Card>
            <div className="card-header">
              <div className="card-title">Contractor Details</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <InfoRow label="Business"      value={contractor.name} />
              <InfoRow label="Contact Name"  value={contractor.contact_name || contractor.contact || '—'} />
              <InfoRow label="Phone"         value={contractor.phone || '—'} />
              <InfoRow label="Email"         value={contractor.email || '—'} />
              <InfoRow label="City"          value={contractor.city  || '—'} />
              {contractor.address && <InfoRow label="Address" value={contractor.address} />}
              <InfoRow label="Last Payment"  value={formatRelativeDate(contractor.lastPayment)} />
              <InfoRow label="Credit Limit"  value={contractor.credit_limit > 0 ? formatCurrency(contractor.credit_limit) : 'None set'} />
              <InfoRow label="Risk Level"    value={<RiskBadge level={risk} />} />
              <InfoRow label="Status"        value={<span className={`badge ${contractor.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{contractor.status}</span>} />
            </div>
          </Card>

          <Card>
            <div className="card-header">
              <div className="card-title">Financial Summary</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Total Material Issued', value: contractor.totalIssued || 0, color: '#6366f1' },
                { label: 'Total Collected',       value: contractor.totalPaid   || 0, color: '#22c55e' },
                { label: 'Outstanding Balance',   value: contractor.outstanding || 0, color: '#f59e0b' },
                { label: 'Overdue Amount',        value: contractor.overdue     || 0, color: '#ef4444' },
              ].map(row => {
                const pct = contractor.totalIssued > 0 ? Math.min(100, (row.value / contractor.totalIssued) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{formatCurrency(row.value, true)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: row.color }} />
                    </div>
                  </div>
                );
              })}
              {contractor.totalIssued > 0 && (
                <div style={{ textAlign: 'center', paddingTop: 8 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>
                    {Math.round(((contractor.totalPaid || 0) / contractor.totalIssued) * 100)}%
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Collection Rate</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Customers */}
      {activeTab === 'customers' && (
        <div className="table-container">
          <div className="table-toolbar">
            <div>
              <div className="table-toolbar-title">Customers / Projects ({customers.length})</div>
              <div className="table-toolbar-subtitle">Projects under {contractor.name}</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddCust(true)}>
              <Home size={13} /> Add Customer
            </button>
          </div>
          {customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No customers yet — add the first project for this contractor.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Project / Customer</th>
                  <th>Type</th>
                  <th>Address</th>
                  <th>Total Issued</th>
                  <th>Outstanding</th>
                  <th>Overdue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(cus => (
                  <tr key={cus.id}>
                    <td style={{ fontWeight: 600 }}>{cus.name}</td>
                    <td className="td-secondary">{cus.type}</td>
                    <td className="td-secondary" style={{ maxWidth: 180 }}>{cus.address || '—'}</td>
                    <td>{formatCurrency(cus.totalIssued  || 0, true)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: (cus.outstanding || 0) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {(cus.outstanding || 0) > 0 ? formatCurrency(cus.outstanding, true) : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: (cus.overdue || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {(cus.overdue || 0) > 0 ? formatCurrency(cus.overdue, true) : '—'}
                      </span>
                    </td>
                    <td><StatusBadge status={cus.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Transactions */}
      {activeTab === 'transactions' && (
        <div className="table-container">
          <div className="table-toolbar">
            <div>
              <div className="table-toolbar-title">Material Transactions</div>
              <div className="table-toolbar-subtitle">{transactions.length} entries</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowIssue(true)}>
              <Package size={13} /> Issue Material
            </button>
          </div>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No transactions yet. Issue material to this contractor to get started.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Advance</th>
                  <th>Outstanding</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td className="td-secondary">{formatDate(t.date)}</td>
                    <td style={{ maxWidth: 200 }}>
                      <span style={{ fontSize: 12 }}>{t.description || '—'}</span>
                    </td>
                    <td className="td-secondary">{t.customerName || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(t.amount)}</td>
                    <td>
                      {t.advance > 0
                        ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(t.advance)}</span>
                        : <span className="td-secondary">—</span>}
                    </td>
                    <td>
                      {t.outstanding > 0
                        ? <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{formatCurrency(t.outstanding)}</span>
                        : <span style={{ color: 'var(--success)' }}>—</span>}
                    </td>
                    <td className="td-secondary">{t.dueDate ? formatDate(t.dueDate) : '—'}</td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === 'payments' && (
        <div className="table-container">
          <div className="table-toolbar">
            <div>
              <div className="table-toolbar-title">Payment History</div>
              <div className="table-toolbar-subtitle">{payments.length} payments received</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPayment(true)}>
              <IndianRupee size={13} /> Record Payment
            </button>
          </div>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No payments recorded yet.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Customer</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="td-secondary">{formatDate(p.date)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(p.amount)}</td>
                    <td><span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{p.method}</span></td>
                    <td className="td-secondary">{p.customerName || '—'}</td>
                    <td className="td-secondary">{p.reference || '—'}</td>
                    <td className="td-secondary">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {payments.length > 0 && (
            <div className="table-footer">
              <span>Total received: {formatCurrency(payments.reduce((s, p) => s + p.amount, 0), true)}</span>
              <span>{payments.length} payments</span>
            </div>
          )}
        </div>
      )}

      {/* Tab: Risk */}
      {activeTab === 'risk' && (
        <div className="grid-2">
          <Card>
            <div className="card-header"><div className="card-title">Risk Assessment</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <InfoRow label="Risk Level" value={<RiskBadge level={risk} />} />
              <InfoRow label="Outstanding" value={formatCurrency(contractor.outstanding || 0)} />
              <InfoRow label="Overdue"     value={formatCurrency(contractor.overdue     || 0)} />
              <InfoRow label="Last Payment" value={formatRelativeDate(contractor.lastPayment)} />
              {contractor.outstanding > 0 && (
                <InfoRow
                  label="Overdue Ratio"
                  value={`${Math.round(((contractor.overdue || 0) / contractor.outstanding) * 100)}%`}
                />
              )}
            </div>
          </Card>
          <Card>
            <div className="card-header"><div className="card-title">Risk Guidelines</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              {[
                { level: 'normal',   color: '#22c55e', desc: 'No overdue — payments are current'    },
                { level: 'medium',   color: '#eab308', desc: 'Overdue < 20% of outstanding'          },
                { level: 'high',     color: '#f97316', desc: 'Overdue 20–50% of outstanding'         },
                { level: 'critical', color: '#ef4444', desc: 'Overdue > 50% of outstanding'          },
              ].map(r => (
                <div key={r.level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, textTransform: 'capitalize', minWidth: 64 }}>{r.level}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Modals */}
      <IssueMaterialModal
        isOpen={showIssue}
        onClose={() => setShowIssue(false)}
        onSuccess={() => refetch()}
        preselectedContractorId={id}
      />
      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => refetch()}
        preselectedContractorId={id}
        outstandingAmount={contractor.outstanding}
      />
      <AddCustomerModal
        isOpen={showAddCust}
        onClose={() => setShowAddCust(false)}
        onSuccess={() => refetch()}
        preselectedContractorId={id}
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ width: 120, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
