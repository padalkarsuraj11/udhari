import { useState } from 'react';
import { Plus, Home, ChevronRight, ChevronDown } from 'lucide-react';
import { useCustomers, useContractors } from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { PageHeader, SearchInput, Select, StatusBadge, Avatar, EmptyState, LoadingState, ErrorState } from '../../components/ui';
import { AddCustomerModal } from '../../components/modals';

const TYPE_OPTIONS = [
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial',  label: 'Commercial' },
  { value: 'Society',     label: 'Society' },
];

const STATUS_OPTIONS = [
  { value: 'active',  label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid',    label: 'Paid' },
];

export default function CustomersList() {
  const { data: customers, loading: loadingCustomers, error: errorCustomers, refetch: refetchCustomers } = useCustomers();
  const { data: contractors, loading: loadingContractors, error: errorContractors, refetch: refetchContractors } = useContractors();

  const [search,           setSearch]           = useState('');
  const [typeFilter,       setTypeFilter]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('');
  const [contractorFilter, setContractorFilter] = useState('');
  const [showAddModal,     setShowAddModal]     = useState(false);
  const [selectedConId,    setSelectedConId]    = useState(null);

  const [expandedContractors, setExpandedContractors] = useState({});

  const listCustomers = customers || [];
  const listContractors = contractors || [];

  const contractorOptions = listContractors.map(c => ({ value: c.id, label: c.name }));

  function toggleContractor(id) {
    setExpandedContractors(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Filter customers
  const filteredCustomers = listCustomers.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.address || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.contractorName || '').toLowerCase().includes(search.toLowerCase());
    const matchType       = !typeFilter       || c.type === typeFilter;
    const matchStatus     = !statusFilter     || c.status === statusFilter;
    const matchContractor = !contractorFilter || c.contractorId === contractorFilter;
    return matchSearch && matchType && matchStatus && matchContractor;
  });

  // Group by contractor for hierarchy view
  const groupedByContractor = listContractors.map(contractor => ({
    contractor,
    customers: filteredCustomers.filter(c => c.contractorId === contractor.id),
  })).filter(group => group.customers.length > 0);

  const loading = loadingCustomers || loadingContractors;
  const error = errorCustomers || errorContractors;

  const handleOpenAddModal = (conId = null) => {
    setSelectedConId(conId);
    setShowAddModal(true);
  };

  const handleRefresh = () => {
    refetchCustomers();
    refetchContractors();
  };

  return (
    <div>
      <PageHeader
        title="Customers & Projects"
        description="Projects organized by contractor — the full business hierarchy"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenAddModal(null)}>
            <Plus size={14} /> Add Customer
          </button>
        }
      />

      {/* Hierarchy explanation */}
      <div
        className="card"
        style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-400)' }}>Your Business</span>
          <ChevronRight size={12} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-secondary)' }}>Contractor</span>
          <ChevronRight size={12} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-secondary)' }}>Customer / Project</span>
          <ChevronRight size={12} color="var(--text-muted)" />
          <span style={{ color: 'var(--text-secondary)' }}>Material → Udhari → Payment</span>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div className="filter-bar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search customers, projects, addresses..."
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            value={contractorFilter}
            onChange={setContractorFilter}
            options={contractorOptions}
            placeholder="All Contractors"
            style={{ width: 180 }}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_OPTIONS}
            placeholder="All Types"
            style={{ width: 150 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="All Statuses"
            style={{ width: 130 }}
          />
          {(search || typeFilter || statusFilter || contractorFilter) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setContractorFilter(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results summary */}
      {!loading && !error && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {filteredCustomers.length} of {listCustomers.length} customers across {groupedByContractor.length} contractors
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleRefresh}>
            ↻ Refresh
          </button>
        </div>
      )}

      {/* Hierarchy View */}
      {loading ? (
        <LoadingState message="Loading customers & projects..." />
      ) : error ? (
        <ErrorState message={error} onRetry={handleRefresh} />
      ) : groupedByContractor.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Home}
            title="No customers found"
            description="Try adjusting your search or filters."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groupedByContractor.map(({ contractor, customers }) => {
            const isExpanded = expandedContractors[contractor.id] ?? true;
            const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding || 0), 0);

            return (
              <div key={contractor.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Contractor Header */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'rgba(245,158,11,0.04)',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleContractor(contractor.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={contractor.name} color={contractor.avatarColor} size="sm" />
                    <div>
                      <div style={{ fontWeight: 700 }}>{contractor.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {customers.length} customer{customers.length !== 1 ? 's' : ''} · {contractor.city}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {totalOutstanding > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)' }}>
                        {formatCurrency(totalOutstanding, true)} outstanding
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronDown size={16} color="var(--text-muted)" />
                      : <ChevronRight size={16} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Customers under this contractor */}
                {isExpanded && (
                  <div style={{ padding: '8px 0' }}>
                    {customers.map((customer, idx) => (
                      <div
                        key={customer.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 18px 10px 44px',
                          borderBottom: idx < customers.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'background var(--transition)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Hierarchy connector */}
                          <div style={{ color: 'var(--border)', fontSize: 12 }}>└</div>
                          <div
                            style={{
                              width: 32, height: 32, borderRadius: 'var(--radius-md)',
                              background: 'rgba(148,163,184,0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Home size={14} color="var(--text-secondary)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{customer.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {customer.type} · {customer.address || 'No address'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Issued</div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(customer.totalIssued || 0, true)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Outstanding</div>
                            <div style={{
                              fontWeight: 700, fontSize: 13,
                              color: (customer.outstanding || 0) > 0 ? 'var(--warning)' : 'var(--success)',
                            }}>
                              {(customer.outstanding || 0) > 0 ? formatCurrency(customer.outstanding, true) : 'Cleared'}
                            </div>
                          </div>
                          {(customer.overdue || 0) > 0 && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Overdue</div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--danger)' }}>
                                {formatCurrency(customer.overdue, true)}
                              </div>
                            </div>
                          )}
                          <StatusBadge status={customer.status} />
                          <Link to={`/contractors/${contractor.id}`} className="btn btn-ghost btn-sm">Details</Link>
                        </div>
                      </div>
                    ))}

                    {/* Add customer to this contractor */}
                    <div style={{ padding: '8px 18px 8px 44px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--accent-400)', fontSize: 12 }}
                        onClick={() => handleOpenAddModal(contractor.id)}
                      >
                        <Plus size={12} /> Add customer to {contractor.name}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleRefresh}
        preselectedContractorId={selectedConId}
      />
    </div>
  );
}
