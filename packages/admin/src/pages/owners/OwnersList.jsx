import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, UserCheck, UserX, Filter, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import CreateOwnerModal from '../../components/CreateOwnerModal';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../../utils/format';
import {
  PageHeader, SearchInput, Select, StatusBadge, RiskBadge, Avatar,
  EmptyState, ConfirmDialog
} from '../../components/ui';
import { Users } from 'lucide-react';

const BUSINESS_TYPES = [
  { value: 'Electrical',        label: 'Electrical' },
  { value: 'Plumbing',          label: 'Plumbing' },
  { value: 'Construction',      label: 'Construction' },
  { value: 'Paint',             label: 'Paint' },
  { value: 'Hardware',          label: 'Hardware' },
  { value: 'Building Materials',label: 'Building Materials' },
];

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function OwnersList() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch owners from API
  useEffect(() => {
    fetchOwners();
  }, []);

  async function fetchOwners() {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/admin/owners`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setOwners(result.data || []);
      }
    } catch (err) {
      console.warn('Fetch owners error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter logic
  const filtered = owners.filter(o => {
    const matchSearch = !search ||
      o.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || o.business_type === typeFilter;
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  function handleToggleStatus(id, action) {
    setConfirm({ id, action });
  }

  async function doToggle() {
    const { id, action } = confirm;
    const newStatus = action === 'activate' ? 'active' : 'inactive';

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiUrl}/admin/owners/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Update local state
      setOwners(prev => prev.map(o =>
        o.id === id ? { ...o, status: newStatus } : o
      ));
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setConfirm(null);
    }
  }

  function handleOwnerCreated(newOwner) {
    fetchOwners(); // Refresh the list
  }

  function clearFilters() {
    setSearch(''); setTypeFilter(''); setStatusFilter('');
  }

  return (
    <div>
      <PageHeader
        title="Owner Management"
        description={`${owners.filter(o => o.status === 'active').length} active of ${owners.length} total registered owners`}
        actions={
          <>
            <button className="btn btn-secondary btn-sm">
              <Download size={14} />
              Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} />
              Add Owner
            </button>
          </>
        }
      />

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div className="filter-bar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search owners, businesses, emails..."
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={BUSINESS_TYPES}
            placeholder="All Business Types"
            style={{ width: 180 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="All Statuses"
            style={{ width: 140 }}
          />
          {(search || typeFilter || statusFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">Registered Owners</div>
            <div className="table-toolbar-subtitle">
              Showing {filtered.length} of {owners.length} owners
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Owner / Business</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Contractors</th>
              <th>Outstanding</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }} />
                  <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading owners...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    icon={Users}
                    title="No owners found"
                    description="Try adjusting your search or filters to find what you are looking for."
                  />
                </td>
              </tr>
            ) : (
              filtered.map(owner => {
                const risk = getRiskLevel(owner.overdue || 0, owner.outstanding || 0);
                const avatarColor = ['#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6'][
                  owner.business_name?.charCodeAt(0) % 6
                ];
                return (
                  <tr key={owner.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={owner.owner_name} color={avatarColor} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{owner.business_name}</div>
                          <div className="td-secondary">{owner.owner_name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{owner.business_type}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{owner.email}</div>
                      <div className="td-secondary">{owner.phone || '—'}</div>
                    </td>
                    <td style={{ fontWeight: 600, textAlign: 'center' }}>{owner.contractors || 0}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{formatCurrency(owner.outstanding || 0, true)}</div>
                    </td>
                    <td><RiskBadge level={risk} /></td>
                    <td><StatusBadge status={owner.status} /></td>
                    <td className="td-secondary">{formatDate(owner.created_at)}</td>
                    <td className="td-secondary">{owner.lastLogin ? formatRelativeDate(owner.lastLogin) : 'Never'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link
                          to={`/owners/${owner.id}`}
                          className="btn btn-ghost btn-sm"
                          title="View Details"
                        >
                          <Eye size={13} />
                        </Link>
                        <button className="btn btn-ghost btn-sm" title="Edit">
                          <Edit size={13} />
                        </button>
                        {owner.status === 'active' ? (
                          <button
                            className="btn btn-danger btn-sm"
                            title="Deactivate"
                            onClick={() => handleToggleStatus(owner.id, 'deactivate')}
                          >
                            <UserX size={13} />
                          </button>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Activate"
                            onClick={() => handleToggleStatus(owner.id, 'activate')}
                            style={{ color: 'var(--success)' }}
                          >
                            <UserCheck size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="table-footer">
          <span>Total outstanding: {formatCurrency(filtered.reduce((s, o) => s + o.outstanding, 0), true)}</span>
          <span>{filtered.length} owners shown</span>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.action === 'activate' ? 'Activate Owner?' : 'Deactivate Owner?'}
        message={
          confirm?.action === 'activate'
            ? 'This will restore login access and platform features for this owner.'
            : 'This will suspend the owner\'s access to the platform immediately.'
        }
        confirmLabel={confirm?.action === 'activate' ? 'Activate' : 'Deactivate'}
        variant={confirm?.action === 'activate' ? 'secondary' : 'danger'}
        onConfirm={doToggle}
        onCancel={() => setConfirm(null)}
      />

      {/* Create Owner Modal */}
      <CreateOwnerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleOwnerCreated}
      />
    </div>
  );
}
