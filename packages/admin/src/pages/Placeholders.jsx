import { Activity, BarChart3, Puzzle, Bell, Settings } from 'lucide-react';

function ComingSoon({ title, description, icon: Icon }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{description}</p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 'var(--radius-xl)',
          background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Icon size={28} color="var(--brand-400)" />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Coming in Next Phase</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto' }}>
          This section is planned and will be built in the next development phase.
          The foundation and navigation are in place.
        </p>
      </div>
    </div>
  );
}

export function OwnerActivity() {
  return (
    <ComingSoon
      title="Owner Activity"
      description="Track owner login sessions, feature usage, and engagement"
      icon={Activity}
    />
  );
}

export function Analytics() {
  return (
    <ComingSoon
      title="Platform Analytics"
      description="Platform-wide transaction trends, growth metrics, and reporting"
      icon={BarChart3}
    />
  );
}

export function Integrations() {
  return (
    <ComingSoon
      title="Integrations"
      description="Manage WhatsApp, SMS, email, and third-party integrations"
      icon={Puzzle}
    />
  );
}

export function Notifications() {
  return (
    <ComingSoon
      title="Notifications"
      description="Configure platform alerts, owner notifications, and system messages"
      icon={Bell}
    />
  );
}

export function AdminSettings() {
  return (
    <ComingSoon
      title="Platform Settings"
      description="Configure plans, subscription limits, and platform-level parameters"
      icon={Settings}
    />
  );
}
