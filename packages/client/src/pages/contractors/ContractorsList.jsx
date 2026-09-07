import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Phone, IndianRupee, Package } from 'lucide-react';
import { Users } from 'lucide-react';
import { useContractors }   from '../../lib/api';
import { formatCurrency, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { PageHeader, SearchInput, Select, RiskBadge, Avatar, EmptyState, LoadingState, ErrorState } from '../../components/ui';
import { AddContractorModal, IssueMaterialModal, RecordPaymentModal } from '../../components/modals';

const RISK_OPTIONS = [
  { value: 'normal',   label: 'Normal'   },
  { value: 'medium',   label: 'Medium'   },
  { value: 'high',     label: 'High'     },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active'   },
  { value: 'inactive', label: 'Inactive' },
];

export default function ContractorsList() {
  const { data: contractors, loading, error, refetch } = useContractors();
  const [search,       setSearch]       = useState('');
  const [riskFilter,   setRiskFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showModal,    setShowModal]    = useState(false);
  
  const [showIssue, setShowIssue] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedConId, setSelectedConId] = useState(null);
  const [outstandingAmt, setOutstandingAmt] = useState(0);

  const list = contractors || [];

  const filtered = list.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.city  || '').toLowerCase().includes(search.toLowerCase());
    const matchRisk   = !riskFilter   || getRiskLevel(c.overdue, c.outstanding) === riskFilter;
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchRisk && matchStatus;
  });

  const totalOutstanding = filtered.reduce((s, c) => s + (c.outstanding || 0), 0);
  const totalOverdue     = filtered.reduce((s, c) => s + (c.overdue    || 0), 0);

  return (
    <div>
      <PageHeader
        title="Contractors"
        description={loading ? 'Loading…' : `${list.length} contractors — ${formatCurrency(totalOutstanding, true)} outstanding`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Add Contractor
          </button>
        }
      />

      {/* Filter bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div className="filter-bar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search contractors, phone, city…"
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            value={riskFilter}
            onChange={setRiskFilter}
            options={RISK_OPTIONS}
            placeholder="All Risk Levels"
            style={{ width: 160 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="All Statuses"
            style={{ width: 140 }}
          />
          {(search || riskFilter || statusFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setRiskFilter(''); setStatusFilter('active'); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Contractors', value: list.length,                             color: 'var(--accent-400)' },
            { label: 'Filtered',          value: filtered.length,                         color: 'var(--text-secondary)' },
            { label: 'Outstanding',       value: formatCurrency(totalOutstanding, true),  color: 'var(--warning)' },
            { label: 'Overdue',           value: formatCurrency(totalOverdue, true),      color: 'var(--danger)' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">All Contractors</div>
            <div className="table-toolbar-subtitle">Showing {filtered.length} of {list.length}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={refetch} disabled={loading} title="Refresh">
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading contractors…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Contractor</th>
                <th>Contact</th>
                <th>City</th>
                <th>Customers</th>
                <th>Total Issued</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Overdue</th>
                <th>Risk</th>
                <th>Last Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <EmptyState
                      icon={Users}
                      title="No contractors found"
                      description={list.length === 0 ? 'Add your first contractor to get started.' : 'Try adjusting your search or filters.'}
                      action={list.length === 0 ? (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                          <Plus size={14} /> Add First Contractor
                        </button>
                      ) : null}
                    />
                  </td>
                </tr>
              ) : filtered.map(c => {
                const risk = getRiskLevel(c.overdue, c.outstanding);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          {c.contact && c.contact !== c.name && (
                            <div className="td-secondary">{c.contact}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.phone
                        ? <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-400)' }}>
                            <Phone size={11} /> {c.phone}
                          </a>
                        : <span className="td-secondary">—</span>}
                    </td>
                    <td className="td-secondary">{c.city || '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.customers || 0}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(c.totalIssued || 0, true)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {formatCurrency(c.totalPaid || 0, true)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: (c.outstanding || 0) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {(c.outstanding || 0) > 0 ? formatCurrency(c.outstanding, true) : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: (c.overdue || 0) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {(c.overdue || 0) > 0 ? formatCurrency(c.overdue, true) : '—'}
                      </span>
                    </td>
                    <td>
                      {(c.outstanding || 0) > 0
                        ? <RiskBadge level={risk} />
                        : <span className="badge badge-success">Clear</span>}
                    </td>
                    <td className="td-secondary">{formatRelativeDate(c.lastPayment)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/contractors/${c.id}`} className="btn btn-ghost btn-xs" title="View Details" style={{ padding: '4px 8px', fontSize: 11 }}>
                          <Eye size={12} style={{ marginRight: 2 }} /> Details
                        </Link>
                        <button
                          className="btn btn-secondary btn-xs"
                          title="Issue Material (Record Cost)"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                          onClick={() => { setSelectedConId(c.id); setShowIssue(true); }}
                        >
                          <Package size={12} style={{ marginRight: 2 }} /> Issue
                        </button>
                        <button
                          className="btn btn-xs"
                          title="Record Payment (Collections)"
                          style={{
                            padding: '4px 10px', fontSize: 11,
                            background: (c.outstanding || 0) > 0
                              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                              : 'var(--bg-surface)',
                            border: (c.outstanding || 0) > 0 ? 'none' : '1px solid var(--border)',
                            color: (c.outstanding || 0) > 0 ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 700,
                            boxShadow: (c.outstanding || 0) > 0 ? '0 2px 6px rgba(34,197,94,0.35)' : 'none',
                            display: 'flex', alignItems: 'center', gap: 4,
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => { setSelectedConId(c.id); setOutstandingAmt(c.outstanding); setShowPayment(true); }}
                        >
                          <IndianRupee size={11} />
                          {(c.outstanding || 0) > 0
                            ? `Pay ₹${(c.outstanding).toLocaleString('en-IN')}`
                            : 'Pay'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="table-footer">
            <span>Total outstanding: {formatCurrency(totalOutstanding, true)}</span>
            <span>{filtered.length} contractors</span>
          </div>
        )}
      </div>

      <AddContractorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { refetch(); }}
      />
      
      <IssueMaterialModal
        isOpen={showIssue}
        onClose={() => setShowIssue(false)}
        onSuccess={() => { refetch(); }}
        preselectedContractorId={selectedConId}
      />
      
      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={() => { refetch(); }}
        preselectedContractorId={selectedConId}
        outstandingAmount={outstandingAmt}
      />
    </div>
  );
}
