// ============================================================
// SHARED UI COMPONENTS — Admin Package
// ============================================================

import { Search, AlertCircle, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { initials, getRiskLabel } from '../../utils/format';

// ---- Badge ----
export function Badge({ variant = 'neutral', children, dot = false }) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

// ---- Status Badge ----
export function StatusBadge({ status }) {
  const map = {
    active:   { label: 'Active',   cls: 'status-active'   },
    inactive: { label: 'Inactive', cls: 'status-inactive' },
    pending:  { label: 'Pending',  cls: 'status-pending'  },
    overdue:  { label: 'Overdue',  cls: 'status-overdue'  },
    paid:     { label: 'Paid',     cls: 'status-paid'     },
    partial:  { label: 'Partial',  cls: 'status-partial'  },
  };
  const entry = map[status] || map.inactive;
  return (
    <span className={`badge ${entry.cls}`}>
      <span className="badge-dot" />
      {entry.label}
    </span>
  );
}

// ---- Risk Badge ----
export function RiskBadge({ level }) {
  const map = {
    normal:   { label: 'Normal',   cls: 'risk-normal'   },
    medium:   { label: 'Medium',   cls: 'risk-medium'   },
    high:     { label: 'High',     cls: 'risk-high'     },
    critical: { label: 'Critical', cls: 'risk-critical' },
  };
  const entry = map[level] || map.normal;
  return <span className={`badge ${entry.cls}`}>{entry.label}</span>;
}

// ---- Avatar ----
export function Avatar({ name, color, size = 'md' }) {
  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ background: color || 'var(--brand-600)', color: 'white' }}
    >
      {initials(name)}
    </div>
  );
}

// ---- Search Input ----
export function SearchInput({ value, onChange, placeholder = 'Search...', style }) {
  return (
    <div className="search-wrapper" style={style}>
      <Search size={15} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
      <input
        type="text"
        className="input search-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ---- Select ----
export function Select({ value, onChange, options, placeholder, style }) {
  return (
    <select
      className="input select"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={style}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ---- Empty State ----
export function EmptyState({ title, description, action, icon: Icon = Package }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// ---- Loading State ----
export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{message}</span>
    </div>
  );
}

// ---- Error State ----
export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="error-state">
      <AlertCircle size={32} />
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

// ---- Stat Card ----
export function StatCard({ label, value, change, changeLabel, icon: Icon, accentColor, iconBg }) {
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;

  return (
    <div
      className="stat-card"
      style={{ '--stat-accent': accentColor, '--stat-icon-bg': iconBg }}
    >
      {Icon && (
        <div className="stat-card-icon">
          <Icon size={20} />
        </div>
      )}
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {changeLabel && (
        <div className={`stat-card-change ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
          {isPositive && <TrendingUp size={12} />}
          {isNegative && <TrendingDown size={12} />}
          <span>{changeLabel}</span>
        </div>
      )}
    </div>
  );
}

// ---- Page Header ----
export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && (
        <div className="page-header-actions">{actions}</div>
      )}
    </div>
  );
}

// ---- Card ----
export function Card({ children, style, className = '' }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

// ---- Confirm Dialog ----
export function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, variant = 'danger' }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card" style={{ maxWidth: 380, width: '90%' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button className={`btn btn-${variant} btn-sm`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
