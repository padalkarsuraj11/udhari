import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Phone, Search as SearchIcon } from 'lucide-react';
import { CONTRACTORS } from '../../data/mockData';
import { formatCurrency, formatRelativeDate, getRiskLevel } from '../../utils/format';
import { PageHeader, SearchInput, Select, StatusBadge, RiskBadge, Avatar, EmptyState } from '../../components/ui';
import { Users } from 'lucide-react';

const RISK_OPTIONS = [
  { value: 'normal',   label: 'Normal' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function ContractorsList() {
  const [search,     setSearch]     = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  const filtered = CONTRACTORS.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchRisk = !riskFilter || getRiskLevel(c.overdue, c.outstanding) === riskFilter;
    return matchSearch && matchRisk;
  });

  // Summary Stats
  const totalOutstanding = filtered.reduce((s, c) => s + c.outstanding, 0);
  const totalOverdue     = filtered.reduce((s, c) => s + c.overdue, 0);

  return (
    <div>
      <PageHeader
        title="Contractors"
        description={`${CONTRACTORS.length} contractors — ${formatCurrency(totalOutstanding, true)} outstanding`}
        actions={
          <button className="btn btn-primary btn-sm">
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
            placeholder="Search contractors, contacts, cities..."
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            value={riskFilter}
            onChange={setRiskFilter}
            options={RISK_OPTIONS}
            placeholder="All Risk Levels"
            style={{ width: 160 }}
          />
          {(search || riskFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setRiskFilter(''); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Contractors', value: CONTRACTORS.length, color: 'var(--accent-400)' },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding, true), color: 'var(--warning)' },
          { label: 'Overdue', value: formatCurrency(totalOverdue, true), color: 'var(--danger)' },
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

      {/* Contractors Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">All Contractors</div>
            <div className="table-toolbar-subtitle">Showing {filtered.length} of {CONTRACTORS.length}</div>
          </div>
        </div>

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
                    description="Try adjusting your search or filters."
                  />
                </td>
              </tr>
            ) : (
              filtered.map(c => {
                const risk = getRiskLevel(c.overdue, c.outstanding);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} color={c.avatarColor} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          <div className="td-secondary">{c.contact}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-400)' }}>
                        <Phone size={11} /> {c.phone}
                      </a>
                    </td>
                    <td className="td-secondary">{c.city}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.customers}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(c.totalIssued, true)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {formatCurrency(c.paid, true)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.outstanding > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {c.outstanding > 0 ? formatCurrency(c.outstanding, true) : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.overdue > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {c.overdue > 0 ? formatCurrency(c.overdue, true) : '—'}
                      </span>
                    </td>
                    <td>
                      {c.outstanding > 0
                        ? <RiskBadge level={risk} />
                        : <span className="badge badge-success">Clear</span>}
                    </td>
                    <td className="td-secondary">{formatRelativeDate(c.lastPayment)}</td>
                    <td>
                      <Link to={`/contractors/${c.id}`} className="btn btn-ghost btn-sm" title="View Details">
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="table-footer">
          <span>Total outstanding: {formatCurrency(totalOutstanding, true)}</span>
          <span>{filtered.length} contractors</span>
        </div>
      </div>
    </div>
  );
}
