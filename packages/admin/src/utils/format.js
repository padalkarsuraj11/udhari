// ============================================================
// FORMAT UTILITIES — Shared across admin and client
// ============================================================

export function formatCurrency(amount, compact = false) {
  if (compact && amount >= 100000) {
    return '₹' + (amount / 100000).toFixed(1) + 'L';
  }
  if (compact && amount >= 1000) {
    return '₹' + (amount / 1000).toFixed(0) + 'K';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n) {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30)  return `${diff} days ago`;
  if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
  return `${Math.floor(diff / 365)} years ago`;
}

export function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export function getRiskLevel(overdue, outstanding) {
  if (!outstanding) return 'normal';
  const ratio = overdue / outstanding;
  if (ratio === 0)   return 'normal';
  if (ratio < 0.2)   return 'medium';
  if (ratio < 0.5)   return 'high';
  return 'critical';
}

export function getRiskLabel(level) {
  const map = { normal: 'Normal', medium: 'Medium', high: 'High', critical: 'Critical' };
  return map[level] || 'Normal';
}
