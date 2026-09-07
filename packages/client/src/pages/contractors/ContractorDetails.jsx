import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, MapPin, RefreshCw,
  IndianRupee, Package, Home, Receipt, CreditCard, AlertTriangle,
  ChevronRight, Clock, Users, ArrowUpDown, Filter, Zap,
} from 'lucide-react';
import { useContractor } from '../../lib/api';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { Avatar, RiskBadge, StatusBadge, Card, LoadingState, ErrorState } from '../../components/ui';
import { IssueMaterialModal, RecordPaymentModal, AddCustomerModal } from '../../components/modals';

const TABS = [
  { key: 'customers',     label: 'Customers / Projects', icon: Users        },
  { key: 'transactions',  label: 'Transactions',         icon: Receipt      },
  { key: 'payments',      label: 'Payments',             icon: CreditCard   },
];

const FILTER_OPTIONS = ['all', 'pending', 'overdue', 'paid'];
const SORT_OPTIONS = [
  { key: 'outstanding', label: 'Highest Outstanding' },
  { key: 'due_date',    label: 'Oldest Due'          },
  { key: 'updated',     label: 'Recently Updated'    },
];

// ── Hierarchy breadcrumb ────────────────────────────
function HierarchyBreadcrumb({ contractorName }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, color: 'var(--text-muted)',
      marginBottom: 4, letterSpacing: '0.02em',
    }}>
      <span>Owner</span>
      <ChevronRight size={11} />
      <span style={{ color: 'var(--accent-400)', fontWeight: 600 }}>{contractorName}</span>
      <ChevronRight size={11} />
      <span>Customers / Projects</span>
    </div>
  );
}

// ── Customer / Project Card ─────────────────────────
function CustomerCard({ cus, contractorId, onPay }) {
  const navigate   = useNavigate();
  const hasBalance = (cus.outstanding || 0) > 0;
  const isOverdue  = (cus.overdue || 0) > 0;

  // Days overdue — computed inline (no import needed for this simple calc)
  const daysDue = cus.latestDueDate
    ? Math.max(0, Math.floor((new Date() - new Date(cus.latestDueDate)) / 86400000))
    : 0;
  const isActuallyOverdue = isOverdue || (hasBalance && cus.latestDueDate && new Date(cus.latestDueDate) < new Date());
  const borderColor = isActuallyOverdue ? 'var(--danger)' : hasBalance ? 'var(--warning)' : '#1d4d2e';

  return (
    <div
      onClick={() => navigate(`/contractors/${contractorId}/customers/${cus.id}`)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'background var(--transition), transform var(--transition)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        alignItems: 'center',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.transform  = 'translateX(2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-card)';
        e.currentTarget.style.transform  = 'translateX(0)';
      }}
    >
      {/* Left: Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            {cus.name}
          </span>
          {cus.type && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(148,163,184,0.12)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {cus.type}
            </span>
          )}
          <StatusBadge status={cus.status} />
        </div>

        {/* Financial stats row */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <FinStat label="Material" value={formatCurrency(cus.totalIssued || 0, true)} />
          <FinStat label="Advance"  value={formatCurrency(cus.advance     || 0, true)} color="#22c55e" />
          <FinStat label="Paid"     value={formatCurrency(cus.totalPaid   || 0, true)} color="#22c55e" />
          {cus.latestDueDate && (
            <FinStat
              label="Due Date"
              value={formatDate(cus.latestDueDate)}
              color={isActuallyOverdue ? 'var(--danger)' : 'var(--text-secondary)'}
            />
          )}
          {isActuallyOverdue && daysDue > 0 && (
            <FinStat label="Overdue" value={`${daysDue}d ago`} color="var(--danger)" />
          )}
        </div>
      </div>

      {/* Right: Outstanding amount + quick pay button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2,
          }}>
            Outstanding
          </div>
          <div style={{
            fontSize: 20, fontWeight: 800,
            color: isActuallyOverdue ? 'var(--danger)' : hasBalance ? 'var(--warning)' : 'var(--success)',
          }}>
            {hasBalance ? formatCurrency(cus.outstanding, true) : '—'}
          </div>
          {cus.overdue > 0 && (
            <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>
              {formatCurrency(cus.overdue, true)} overdue
            </div>
          )}
        </div>

        {/* Quick Pay button — only shows if there's an outstanding balance */}
        {hasBalance && onPay && (
          <button
            onClick={e => { e.stopPropagation(); onPay(cus); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 'var(--radius-md)',
              background: isActuallyOverdue
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none', color: '#fff', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: isActuallyOverdue
                ? '0 2px 8px rgba(239,68,68,0.4)'
                : '0 2px 8px rgba(34,197,94,0.4)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = isActuallyOverdue ? '0 4px 14px rgba(239,68,68,0.5)' : '0 4px 14px rgba(34,197,94,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isActuallyOverdue ? '0 2px 8px rgba(239,68,68,0.4)' : '0 2px 8px rgba(34,197,94,0.4)'; }}
            title={`Pay outstanding ₹${(cus.outstanding || 0).toLocaleString('en-IN')} for ${cus.name}`}
          >
            <Zap size={12} />
            Pay {formatCurrency(cus.outstanding, true)}
          </button>
        )}

        <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>
    </div>
  );
}

function FinStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: color || 'var(--text-secondary)' }}>
        {value}
      </div>
    </div>
  );
}

// ── Customers / Projects Tab ────────────────────────
function CustomersTab({ customers, contractor, onAddCustomer, onPay }) {
  const [filter, setFilter] = useState('all');
  const [sort,   setSort]   = useState('outstanding');

  const enriched = useMemo(() =>
    customers.map(cus => ({
      ...cus,
      advance: Math.max(0, (cus.totalIssued || 0) - (cus.outstanding || 0) - (cus.totalPaid || 0)),
    })),
  [customers]);

  const filtered = useMemo(() => {
    let list = [...enriched];
    if (filter === 'pending') list = list.filter(c => (c.outstanding || 0) > 0 && (c.overdue || 0) === 0);
    if (filter === 'overdue') list = list.filter(c => (c.overdue || 0) > 0 || c.status === 'overdue');
    if (filter === 'paid')    list = list.filter(c => (c.outstanding || 0) === 0);
    return list;
  }, [enriched, filter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'outstanding') list.sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));
    if (sort === 'due_date')    list.sort((a, b) => {
      if (!a.latestDueDate) return 1;
      if (!b.latestDueDate) return -1;
      return new Date(a.latestDueDate) - new Date(b.latestDueDate);
    });
    if (sort === 'updated') list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [filtered, sort]);

  const counts = useMemo(() => ({
    all:     enriched.length,
    pending: enriched.filter(c => (c.outstanding || 0) > 0 && (c.overdue || 0) === 0).length,
    overdue: enriched.filter(c => (c.overdue || 0) > 0 || c.status === 'overdue').length,
    paid:    enriched.filter(c => (c.outstanding || 0) === 0).length,
  }), [enriched]);

  const totalOutstanding = enriched.reduce((s, c) => s + (c.outstanding || 0), 0);
  const totalOverdue     = enriched.reduce((s, c) => s + (c.overdue    || 0), 0);

  return (
    <div>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <HierarchyBreadcrumb contractorName={contractor.name} />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>
            Customers / Projects
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
              ({customers.length})
            </span>
          </h2>
          {totalOutstanding > 0 && (
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              Total Pending:{' '}
              <span style={{ color: totalOverdue > 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                {formatCurrency(totalOutstanding)}
              </span>
              {totalOverdue > 0 && (
                <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
                  · {formatCurrency(totalOverdue)} overdue
                </span>
              )}
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAddCustomer}>
          <Home size={13} /> Add Customer
        </button>
      </div>

      {/* Filter + Sort bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 12px', borderRadius: 'var(--radius-full)',
              fontSize: 12, fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer', transition: 'all var(--transition)',
              textTransform: 'capitalize',
              background: filter === f ? (
                f === 'overdue' ? 'var(--danger)' :
                f === 'pending' ? 'rgba(234,179,8,0.15)' :
                f === 'paid'    ? 'rgba(34,197,94,0.15)' :
                'var(--accent-600)'
              ) : 'transparent',
              borderColor: filter === f ? (
                f === 'overdue' ? 'var(--danger)' :
                f === 'pending' ? 'var(--warning)' :
                f === 'paid'    ? 'var(--success)' :
                'var(--accent-600)'
              ) : 'var(--border)',
              color: filter === f ? (
                f === 'overdue' ? '#fff' :
                f === 'pending' ? 'var(--warning)' :
                f === 'paid'    ? 'var(--success)' :
                '#fff'
              ) : 'var(--text-secondary)',
            }}
          >
            {f} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowUpDown size={12} style={{ color: 'var(--text-muted)' }} />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
              padding: '3px 8px', fontSize: 12, cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Cards */}
      {customers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <Users size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No customers yet</div>
          <div>Add the first project for {contractor.name}.</div>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          No customers match the <strong style={{ textTransform: 'capitalize' }}>{filter}</strong> filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(cus => (
            <CustomerCard key={cus.id} cus={cus} contractorId={contractor.id} onPay={onPay} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContractorDetails() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useContractor(id);

  const [activeTab,   setActiveTab]   = useState('customers');
  const [showIssue,   setShowIssue]   = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAddCust, setShowAddCust] = useState(false);
  // Per-customer quick-pay: stores { id, name, outstanding } of the customer being paid
  const [payCustomer, setPayCustomer] = useState(null);

  if (loading) return <LoadingState message="Loading contractor…" />;
  if (error)   return <ErrorState  message={error} onRetry={refetch} />;

  const contractor   = data?.contractor;
  const customers    = data?.customers    || [];
  const transactions = data?.transactions || [];
  const payments     = data?.payments     || [];

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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={refetch} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowIssue(true)}>
            <Package size={13} /> Issue Material
          </button>
          {contractor.outstanding > 0 ? (
            <button
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none', color: '#fff', fontWeight: 700,
                boxShadow: '0 3px 10px rgba(34,197,94,0.35)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onClick={() => setShowPayment(true)}
            >
              <Zap size={13} /> Pay ₹{(contractor.outstanding || 0).toLocaleString('en-IN')}
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPayment(true)}>
              <IndianRupee size={13} /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Issued',   value: formatCurrency(contractor.totalIssued  || 0, true), color: '#6366f1' },
          { label: 'Advance / Paid', value: formatCurrency(contractor.totalPaid    || 0, true), color: '#22c55e' },
          { label: 'Outstanding',    value: formatCurrency(contractor.outstanding  || 0, true), color: '#f59e0b' },
          { label: 'Overdue',        value: formatCurrency(contractor.overdue      || 0, true), color: '#ef4444' },
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

      {/* Overview tab removed — KPI cards above show the key numbers */}

      {/* Tab: Customers */}
      {activeTab === 'customers' && (
        <CustomersTab
          customers={customers}
          contractor={contractor}
          onAddCustomer={() => setShowAddCust(true)}
          onPay={cus => setPayCustomer(cus)}
        />
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
                      <span style={{ fontSize: 12, whiteSpace: 'pre-line' }}>{t.description || '—'}</span>
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

      {/* Risk tab removed — risk level is visible in KPI row */}

      {/* Modals */}
      <IssueMaterialModal
        isOpen={showIssue}
        onClose={() => setShowIssue(false)}
        onSuccess={() => refetch()}
        preselectedContractorId={id}
      />
      {/* Contractor-level payment (no specific customer) */}
      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => refetch()}
        preselectedContractorId={id}
        outstandingAmount={contractor.outstanding}
      />
      {/* Per-customer quick payment */}
      {payCustomer && (
        <RecordPaymentModal
          isOpen={Boolean(payCustomer)}
          onClose={() => setPayCustomer(null)}
          onSuccess={() => { setPayCustomer(null); refetch(); }}
          preselectedContractorId={id}
          preselectedCustomerId={payCustomer.id}
          preselectedCustomerName={payCustomer.name}
          outstandingAmount={payCustomer.outstanding}
        />
      )}
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
      <span style={{ width: 130, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
