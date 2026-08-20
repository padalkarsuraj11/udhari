import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, UserCheck, UserX, UserPlus, Briefcase,
  Home, ArrowUpRight, AlertTriangle, Puzzle, TrendingUp,
  Activity, DollarSign
} from 'lucide-react';
import { formatCurrency, formatNumber, formatRelativeDate } from '../../utils/format';
import { StatCard, PageHeader, StatusBadge, Avatar, Card } from '../../components/ui';

export default function AdminDashboard() {
  const { session } = useAuth();
  const [stats, setStats] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

      // Fetch stats
      const statsResponse = await fetch(`${apiUrl}/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch recent owners
      const ownersResponse = await fetch(`${apiUrl}/admin/owners?limit=5`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (ownersResponse.ok) {
        const ownersData = await ownersResponse.json();
        setOwners(ownersData.data || []);
      }
    } catch (err) {
      console.warn('Dashboard fetch error, using defaults:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        description="Real-time overview of all owners and platform-wide activity"
        actions={
          <div className="flex-center gap-2">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Last updated: just now
            </span>
            <span className="badge badge-success">
              <span className="badge-dot" />
              Live
            </span>
          </div>
        }
      />

      {/* Primary KPI Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <StatCard
          label="Total Owners"
          value={formatNumber(stats?.totalOwners || 0)}
          icon={Users}
          accentColor="#6366f1"
          iconBg="rgba(99,102,241,0.12)"
          changeLabel={`+${stats?.newOwnersThisMonth || 0} this month`}
          change={1}
        />
        <StatCard
          label="Active Owners"
          value={formatNumber(stats?.activeOwners || 0)}
          icon={UserCheck}
          accentColor="#22c55e"
          iconBg="rgba(34,197,94,0.12)"
          changeLabel={stats?.totalOwners > 0 ? `${Math.round((stats.activeOwners / stats.totalOwners) * 100)}% of total` : '0%'}
          change={0}
        />
        <StatCard
          label="Inactive Owners"
          value={formatNumber(stats?.inactiveOwners || 0)}
          icon={UserX}
          accentColor="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          changeLabel={stats?.inactiveOwners > 0 ? "Needs attention" : "All active"}
          change={stats?.inactiveOwners > 0 ? -1 : 0}
        />
        <StatCard
          label="New This Month"
          value={formatNumber(stats?.newOwnersThisMonth || 0)}
          icon={UserPlus}
          accentColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          changeLabel="New registrations"
          change={1}
        />
        <StatCard
          label="Total Contractors"
          value={formatNumber(stats?.totalContractors || 0)}
          icon={Briefcase}
          accentColor="#0ea5e9"
          iconBg="rgba(14,165,233,0.12)"
          changeLabel="Across all owners"
          change={0}
        />
        <StatCard
          label="Total Customers"
          value={formatNumber(stats?.totalCustomers || 0)}
          icon={Home}
          accentColor="#8b5cf6"
          iconBg="rgba(139,92,246,0.12)"
          changeLabel="Projects & sites"
          change={0}
        />
        <StatCard
          label="Total Outstanding"
          value={formatCurrency(stats?.totalOutstanding || 0, true)}
          icon={DollarSign}
          accentColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          changeLabel="Platform-wide credit"
          change={0}
        />
        <StatCard
          label="Total Overdue"
          value={formatCurrency(stats?.totalOverdue || 0, true)}
          icon={AlertTriangle}
          accentColor="#ef4444"
          iconBg="rgba(239,68,68,0.12)"
          changeLabel={stats?.totalOverdue > 0 ? "Requires follow-up" : "No overdue"}
          change={stats?.totalOverdue > 0 ? -1 : 0}
        />
      </div>

      {/* Second Row: Platform Health */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Platform Health</div>
              <div className="card-subtitle">Key operational metrics</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MetricRow
              label="Owner Activation Rate"
              value={stats?.totalOwners > 0 ? `${Math.round((stats.activeOwners / stats.totalOwners) * 100)}%` : '0%'}
              progress={stats?.totalOwners > 0 ? (stats.activeOwners / stats.totalOwners) * 100 : 0}
              color="#0ea5e9"
            />
            <MetricRow
              label="Total Transactions"
              value={formatNumber(stats?.totalTransactions || 0)}
              progress={Math.min((stats?.totalTransactions || 0) / 100, 100)}
              color="#f59e0b"
            />
            <MetricRow
              label="Total Contractors"
              value={formatNumber(stats?.totalContractors || 0)}
              progress={Math.min((stats?.totalContractors || 0) / 5, 100)}
              color="#6366f1"
            />
          </div>
        </Card>

        <Card>
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest platform events</div>
            </div>
            <Activity size={16} color="var(--text-muted)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 200 }}>
            {owners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 13 }}>No recent activity</p>
              </div>
            ) : (
              owners.slice(0, 5).map(owner => (
                <div
                  key={owner.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(99,102,241,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <UserPlus size={14} color="#6366f1" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      New owner: {owner.business_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatRelativeDate(owner.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Owners Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">Recent Owners</div>
            <div className="table-toolbar-subtitle">Last {owners.length} registered business accounts</div>
          </div>
          <a href="/owners" className="btn btn-secondary btn-sm">
            View All Owners
            <ArrowUpRight size={13} />
          </a>
        </div>

        <table>
          <thead>
            <tr>
              <th>Owner / Business</th>
              <th>Type</th>
              <th>Plan</th>
              <th>Contractors</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {owners.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No owners registered yet
                </td>
              </tr>
            ) : (
              owners.map(owner => {
                const avatarColor = ['#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6'][
                  owner.business_name?.charCodeAt(0) % 6
                ];
                return (
                  <tr key={owner.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={owner.owner_name} color={avatarColor} size="sm" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{owner.business_name}</div>
                          <div className="td-secondary">{owner.owner_name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{owner.business_type}</span>
                    </td>
                    <td>
                      <span className={`badge ${owner.plan === 'Enterprise' ? 'badge-brand' : owner.plan === 'Professional' ? 'badge-info' : 'badge-neutral'}`}>
                        {owner.plan}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{owner.contractors || 0}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(owner.outstanding || 0, true)}</td>
                    <td><StatusBadge status={owner.status} /></td>
                    <td className="td-secondary">{formatRelativeDate(owner.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Helper sub-components ----
function MetricRow({ label, value, progress, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(progress, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}
