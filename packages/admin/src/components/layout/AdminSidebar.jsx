import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity, BarChart3, Puzzle,
  Bell, Settings, ChevronLeft, ChevronRight, Shield,
  LogOut, HelpCircle, Zap
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',       icon: LayoutDashboard, path: '/dashboard' },
    ],
  },
  {
    label: 'Client Management',
    items: [
      { label: 'Owners',          icon: Users,           path: '/owners' },
      { label: 'Owner Activity',  icon: Activity,        path: '/owner-activity', badge: '3' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Analytics',       icon: BarChart3,       path: '/analytics' },
      { label: 'Integrations',    icon: Puzzle,          path: '/integrations' },
      { label: 'Notifications',   icon: Bell,            path: '/notifications', badge: '5' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Settings',        icon: Settings,        path: '/settings' },
    ],
  },
];

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate  = useNavigate();

  function handleLogout() {
    localStorage.removeItem('admin_auth');
    navigate('/login');
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <h2>Udhari Admin</h2>
          <span>Platform Console</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(item => {
              const Icon    = item.icon;
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

      {/* Bottom Actions */}
      <div className="sidebar-bottom">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
          <div
            className="nav-item"
            title={collapsed ? 'Help' : ''}
          >
            <HelpCircle className="nav-icon" size={18} />
            <span className="nav-label">Help & Support</span>
          </div>
          <div
            className="nav-item"
            onClick={handleLogout}
            style={{ color: 'var(--danger)', cursor: 'pointer' }}
            title={collapsed ? 'Logout' : ''}
          >
            <LogOut className="nav-icon" size={18} />
            <span className="nav-label">Logout</span>
          </div>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
