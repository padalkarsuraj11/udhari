import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Home, Package, Receipt,
  CreditCard, AlertTriangle, MessageSquare, FileText,
  Settings, ChevronLeft, ChevronRight, Zap, LogOut,
  Building2, TrendingDown
} from 'lucide-react';
import { CURRENT_OWNER } from '../../data/mockData';
import { initials } from '../../utils/format';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    icon: LayoutDashboard, path: '/dashboard' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Contractors',  icon: Users,     path: '/contractors' },
      { label: 'Customers / Projects', icon: Home, path: '/customers' },
      { label: 'Materials',    icon: Package,   path: '/materials' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Transactions', icon: Receipt,   path: '/transactions' },
      { label: 'Payments',     icon: CreditCard, path: '/payments' },
      { label: 'Bills',        icon: FileText,  path: '/bills' },
      { label: 'Udhari / Outstanding', icon: TrendingDown, path: '/udhari', badge: '3' },
    ],
  },
  {
    label: 'Risk & Communication',
    items: [
      { label: 'Risk Monitoring', icon: AlertTriangle, path: '/risk', badge: '2' },
      { label: 'Bill Requests',   icon: FileText,      path: '/bill-requests' },
      { label: 'WhatsApp',        icon: MessageSquare, path: '/whatsapp' },
    ],
  },
  {
    label: 'Reports & Settings',
    items: [
      { label: 'Reports',   icon: Building2, path: '/reports' },
      { label: 'Settings',  icon: Settings,  path: '/settings' },
    ],
  },
];

export default function ClientSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location  = useLocation();
  const navigate  = useNavigate();

  function handleLogout() {
    localStorage.removeItem('client_auth');
    navigate('/login');
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo / Business Name */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <h2>{CURRENT_OWNER.businessName}</h2>
          <span>{CURRENT_OWNER.businessType} Supplier</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                               location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <Icon className="nav-icon" size={18} />
                  <span className="nav-label">{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div className="sidebar-bottom">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-600), var(--accent-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
            }}
          >
            {initials(CURRENT_OWNER.name)}
          </div>
          <div className="sidebar-logo-text" style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {CURRENT_OWNER.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Owner</div>
          </div>
        </div>

        <div
          className="nav-item"
          onClick={handleLogout}
          style={{ color: 'var(--danger)', cursor: 'pointer', margin: '0 0 8px 0' }}
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut className="nav-icon" size={18} />
          <span className="nav-label">Logout</span>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
