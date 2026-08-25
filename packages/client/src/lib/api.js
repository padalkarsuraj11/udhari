// ============================================================
// API SERVICE LAYER — Authenticated fetch hooks for all pages
//
// Usage:
//   const { data, loading, error, refetch } = useContractors();
//   const { data, loading, error, refetch } = useContractor(id);
//   etc.
//
// All hooks auto-inject the Bearer token from localStorage/session.
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// ── Get token from storage ──────────────────
function getToken() {
  return localStorage.getItem('client_token') || null;
}

// ── Core authenticated fetch ────────────────
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.code   = json.error;
    throw err;
  }
  return json;
}

// ── Generic data hook ───────────────────────
function useApiData(fetchFn, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

// ═══════════════════════════════════════════
// CONTRACTORS
// ═══════════════════════════════════════════

export function useContractors() {
  return useApiData(
    () => apiFetch('/contractors').then(r => r.contractors || []),
    []
  );
}

export function useContractor(id) {
  return useApiData(
    () => apiFetch(`/contractors/${id}`),
    [id]
  );
}

export async function createContractor(payload) {
  return apiFetch('/contractors', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateContractor(id, payload) {
  return apiFetch(`/contractors/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

// ═══════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════

export function useCustomers(contractorId = null) {
  return useApiData(
    () => {
      const qs = contractorId ? `?contractor_id=${contractorId}` : '';
      return apiFetch(`/customers${qs}`).then(r => r.customers || []);
    },
    [contractorId]
  );
}

export async function createCustomer(payload) {
  return apiFetch('/customers', { method: 'POST', body: JSON.stringify(payload) });
}

// ═══════════════════════════════════════════
// TRANSACTIONS
// ═══════════════════════════════════════════

export function useTransactions(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  return useApiData(
    () => apiFetch(`/transactions${qs ? '?' + qs : ''}`).then(r => ({ transactions: r.transactions || [], total: r.total || 0 })),
    [qs]
  );
}

export async function createTransaction(payload) {
  return apiFetch('/transactions', { method: 'POST', body: JSON.stringify(payload) });
}

// ═══════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════

export function usePayments(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  ).toString();
  return useApiData(
    () => apiFetch(`/payments${qs ? '?' + qs : ''}`).then(r => ({ payments: r.payments || [], total: r.total || 0 })),
    [qs]
  );
}

export async function recordPayment(payload) {
  return apiFetch('/payments', { method: 'POST', body: JSON.stringify(payload) });
}

// ═══════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════

export function useMaterials() {
  return useApiData(
    () => apiFetch('/materials').then(r => r.materials || []),
    []
  );
}

export async function createMaterial(payload) {
  return apiFetch('/materials', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateMaterial(id, payload) {
  return apiFetch(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════

export function useDashboard() {
  return useApiData(
    () => apiFetch('/owner/dashboard'),
    []
  );
}

// ═══════════════════════════════════════════
// SETTINGS (tenant profile)
// ═══════════════════════════════════════════

export function useProfile() {
  return useApiData(
    () => apiFetch('/owner/profile'),
    []
  );
}

// ═══════════════════════════════════════════
// BILLS
// ═══════════════════════════════════════════

export function useBills() {
  return useApiData(
    () => apiFetch('/bills').then(r => r.bills || []),
    []
  );
}

export function useBill(id) {
  return useApiData(
    () => apiFetch(`/bills/${id}`),
    [id]
  );
}

export async function createBill(payload) {
  return apiFetch('/bills', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateBillStatus(id, status) {
  return apiFetch(`/bills/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
}

export async function updateTenantProfile(payload) {
  // Let's create an endpoint in owner/profile for updating if needed,
  // or use the admin route or tenant update. Wait, do we have PUT /api/owner/profile?
  // Let's check owner.js.
  // Oh, wait, in owner.js: we only have GET /profile and GET /dashboard.
  // Let's see if we need a PUT /profile or we can just mock the update success/alert,
  // or implement a quick PUT /profile in owner.js backend so SettingsPage works for real!
  // Let's do a real PUT /profile.
  return apiFetch('/owner/profile', { method: 'PUT', body: JSON.stringify(payload) });
}

