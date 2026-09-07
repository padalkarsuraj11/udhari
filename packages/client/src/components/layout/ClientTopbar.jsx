import { Bell, HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { initials } from '../../utils/format';

const BREADCRUMB_MAP = {
  '/dashboard':    'Dashboard',
  '/contractors':  'Contractors',
  '/customers':    'Customers & Projects',
  '/materials':    'Materials',
  '/transactions': 'Transactions',
  '/payments':     'Payments',
  '/bills':        'Bills',
  '/udhari':       'Udhari / Outstanding',
  '/risk':         'Risk Monitoring',
  '/bill-requests':'Bill Requests',
  '/whatsapp':     'WhatsApp',
  '/reports':      'Reports',
  '/settings':     'Settings',
};

export default function ClientTopbar() {
  const location = useLocation();
  const { user, userProfile, businessName } = useAuth();

  const parts   = location.pathname.split('/').filter(Boolean);
  const current = BREADCRUMB_MAP['/' + parts[0]] || parts[parts.length - 1] || 'Dashboard';

  const displayName     = userProfile?.full_name || user?.full_name || user?.name || user?.email || 'Owner';
  const displayBusiness = businessName || 'Business';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <span>{displayBusiness}</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span className="current">{current}</span>
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-icon-btn" title="Notifications">
          <Bell size={17} />
          <span className="notif-dot" />
        </button>
        <button className="topbar-icon-btn" title="Help">
          <HelpCircle size={17} />
        </button>
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        <div className="topbar-avatar" title={displayName}>
          {initials(displayName)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Owner</span>
        </div>
      </div>
    </header>
  );
}
