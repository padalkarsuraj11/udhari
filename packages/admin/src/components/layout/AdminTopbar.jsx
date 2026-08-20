import { Bell, Search, Shield } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const BREADCRUMB_MAP = {
  '/dashboard':      'Dashboard',
  '/owners':         'Owners',
  '/owner-activity': 'Owner Activity',
  '/analytics':      'Analytics',
  '/integrations':   'Integrations',
  '/notifications':  'Notifications',
  '/settings':       'Settings',
};

export default function AdminTopbar() {
  const location = useLocation();
  const parts    = location.pathname.split('/').filter(Boolean);

  // Build human-readable breadcrumb
  const current = BREADCRUMB_MAP[location.pathname] ||
                  parts[parts.length - 1]?.replace(/-/g, ' ') ||
                  'Dashboard';

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Breadcrumb */}
        <div className="topbar-breadcrumb">
          <span>Platform Admin</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span className="current" style={{ textTransform: 'capitalize' }}>
            {current}
          </span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Notifications */}
        <button className="topbar-icon-btn" title="Notifications">
          <Bell size={17} />
          <span className="notif-dot" />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

        {/* Admin User */}
        <div className="flex-center gap-2">
          <div className="topbar-avatar" title="Platform Admin">
            <Shield size={15} />
          </div>
          <div className="topbar-user" style={{ display: 'none' }}>
            <span>Platform Admin</span>
            <span>admin@udhari.io</span>
          </div>
        </div>
      </div>
    </header>
  );
}
