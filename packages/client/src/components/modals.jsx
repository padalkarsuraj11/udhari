// ============================================================
// MODALS — Add/Edit forms for all business entities
// ============================================================

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { createContractor, createCustomer, createTransaction, recordPayment, useContractors, useCustomers } from '../lib/api';

// ── Shared modal shell ───────────────────────────────────────
function Modal({ isOpen, onClose, title, children, maxWidth = 480 }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)', width: '100%', maxWidth,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.18s ease',
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 16px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Shared form field ────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ModalError({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13, color: 'var(--danger)',
    }}>
      <AlertCircle size={14} /> {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ADD CONTRACTOR MODAL
// ═══════════════════════════════════════════════
export function AddContractorModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', contact_name: '', phone: '', email: '', city: '', credit_limit: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Contractor name is required'); return; }
    setSaving(true); setErr('');
    try {
      const res = await createContractor({
        name:         form.name.trim(),
        contact_name: form.contact_name.trim() || undefined,
        phone:        form.phone.trim()        || undefined,
        email:        form.email.trim()        || undefined,
        city:         form.city.trim()         || undefined,
        credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : 0,
      });
      onSuccess?.(res.contractor);
      onClose();
      setForm({ name: '', contact_name: '', phone: '', email: '', city: '', credit_limit: '' });
    } catch (e) { setErr(e.message || 'Failed to add contractor'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Contractor">
      <form onSubmit={handleSubmit}>
        <ModalError msg={err} />
        <Field label="Business / Contractor Name" required>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Raj Construction" autoFocus />
        </Field>
        <Field label="Contact Person Name">
          <input className="input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="e.g. Rajesh Sharma" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="City">
            <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Ahmedabad" />
          </Field>
        </div>
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contractor@email.com" />
        </Field>
        <Field label="Credit Limit (₹)">
          <input className="input" type="number" min="0" step="1000" value={form.credit_limit} onChange={e => set('credit_limit', e.target.value)} placeholder="0 = unlimited" />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit"  className="btn btn-primary btn-sm"   disabled={saving}>
            {saving ? 'Adding…' : 'Add Contractor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// ADD CUSTOMER MODAL
// ═══════════════════════════════════════════════
export function AddCustomerModal({ isOpen, onClose, onSuccess, preselectedContractorId }) {
  const { data: contractors } = useContractors();
  const [form, setForm] = useState({
    name: '', contractor_id: preselectedContractorId || '', project_type: 'Residential', address: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(p => ({ ...p, contractor_id: preselectedContractorId || '' }));
      setErr('');
    }
  }, [isOpen, preselectedContractorId]);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  const PROJECT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Society', 'Government', 'Other'];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())      { setErr('Project/customer name is required'); return; }
    if (!form.contractor_id)    { setErr('Please select a contractor'); return; }
    setSaving(true); setErr('');
    try {
      const res = await createCustomer({
        name:         form.name.trim(),
        contractor_id:form.contractor_id,
        project_type: form.project_type,
        address:      form.address.trim() || undefined,
      });
      onSuccess?.(res.customer);
      onClose();
      setForm({ name: '', contractor_id: preselectedContractorId || '', project_type: 'Residential', address: '' });
    } catch (e) { setErr(e.message || 'Failed to add customer'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Customer / Project">
      <form onSubmit={handleSubmit}>
        <ModalError msg={err} />
        <Field label="Project / Customer Name" required>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sharma Residence" autoFocus />
        </Field>
        <Field label="Contractor" required>
          <select className="input select" value={form.contractor_id} onChange={e => set('contractor_id', e.target.value)}>
            <option value="">— Select Contractor —</option>
            {(contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Project Type">
          <select className="input select" value={form.project_type} onChange={e => set('project_type', e.target.value)}>
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Site Address">
          <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, Area, City" />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit"  className="btn btn-primary btn-sm"   disabled={saving}>
            {saving ? 'Adding…' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// ISSUE MATERIAL MODAL
// ═══════════════════════════════════════════════
export function IssueMaterialModal({ isOpen, onClose, onSuccess, preselectedContractorId }) {
  const { data: contractors } = useContractors();
  const [form, setForm] = useState({
    contractor_id: preselectedContractorId || '',
    customer_id: '', description: '',
    total_amount: '', advance_amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    due_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const { data: customers } = useCustomers(form.contractor_id || null);

  useEffect(() => {
    if (isOpen) {
      setForm(p => ({ ...p, contractor_id: preselectedContractorId || '', customer_id: '' }));
      setErr('');
    }
  }, [isOpen, preselectedContractorId]);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  const outstanding = Math.max(0, parseFloat(form.total_amount || 0) - parseFloat(form.advance_amount || 0));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.contractor_id)    { setErr('Please select a contractor'); return; }
    if (!form.total_amount || parseFloat(form.total_amount) <= 0) { setErr('Amount must be greater than ₹0'); return; }
    setSaving(true); setErr('');
    try {
      const res = await createTransaction({
        contractor_id:    form.contractor_id,
        customer_id:      form.customer_id   || undefined,
        description:      form.description   || undefined,
        total_amount:     parseFloat(form.total_amount),
        advance_amount:   parseFloat(form.advance_amount || 0),
        transaction_date: form.transaction_date,
        due_date:         form.due_date       || undefined,
        notes:            form.notes          || undefined,
      });
      onSuccess?.(res.transaction);
      onClose();
    } catch (e) { setErr(e.message || 'Failed to record material issue'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Material" maxWidth={540}>
      <form onSubmit={handleSubmit}>
        <ModalError msg={err} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Contractor" required>
            <select className="input select" value={form.contractor_id} onChange={e => set('contractor_id', e.target.value)}>
              <option value="">— Select —</option>
              {(contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Customer / Project">
            <select className="input select" value={form.customer_id} onChange={e => set('customer_id', e.target.value)} disabled={!form.contractor_id}>
              <option value="">— None —</option>
              {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Material description, quantity, etc." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Total Amount (₹)" required>
            <input className="input" type="number" min="1" step="1" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} placeholder="0" />
          </Field>
          <Field label="Advance Received (₹)">
            <input className="input" type="number" min="0" step="1" value={form.advance_amount} onChange={e => set('advance_amount', e.target.value)} placeholder="0" />
          </Field>
        </div>
        {/* Outstanding preview */}
        {form.total_amount && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
            background: outstanding > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
            borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Outstanding after advance:</span>
            <span style={{ fontWeight: 700, color: outstanding > 0 ? 'var(--warning)' : 'var(--success)' }}>
              ₹{outstanding.toLocaleString('en-IN')}
            </span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date">
            <input className="input" type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
          </Field>
          <Field label="Due Date">
            <input className="input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional internal note" />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit"  className="btn btn-primary btn-sm"   disabled={saving}>
            {saving ? 'Saving…' : 'Issue Material'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// RECORD PAYMENT MODAL
// ═══════════════════════════════════════════════
export function RecordPaymentModal({ isOpen, onClose, onSuccess, preselectedContractorId, preselectedTransactionId, outstandingAmount }) {
  const { data: contractors } = useContractors();
  const [form, setForm] = useState({
    contractor_id:  preselectedContractorId  || '',
    transaction_id: preselectedTransactionId || '',
    amount: outstandingAmount ? String(outstandingAmount) : '',
    payment_method: 'cash',
    payment_date:   new Date().toISOString().split('T')[0],
    reference: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const METHODS = [
    { value: 'cash',          label: 'Cash'          },
    { value: 'upi',           label: 'UPI'           },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque',        label: 'Cheque'        },
    { value: 'other',         label: 'Other'         },
  ];

  useEffect(() => {
    if (isOpen) {
      setForm(p => ({
        ...p,
        contractor_id:  preselectedContractorId  || '',
        transaction_id: preselectedTransactionId || '',
        amount: outstandingAmount ? String(outstandingAmount) : '',
      }));
      setErr('');
    }
  }, [isOpen, preselectedContractorId, preselectedTransactionId, outstandingAmount]);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.contractor_id) { setErr('Please select a contractor'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setErr('Payment amount must be greater than ₹0'); return; }
    setSaving(true); setErr('');
    try {
      const res = await recordPayment({
        contractor_id:  form.contractor_id,
        transaction_id: form.transaction_id || undefined,
        amount:         parseFloat(form.amount),
        payment_method: form.payment_method,
        payment_date:   form.payment_date,
        reference:      form.reference || undefined,
        notes:          form.notes     || undefined,
      });
      onSuccess?.(res.payment);
      onClose();
    } catch (e) { setErr(e.message || 'Failed to record payment'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" maxWidth={460}>
      <form onSubmit={handleSubmit}>
        <ModalError msg={err} />
        <Field label="Contractor" required>
          <select className="input select" value={form.contractor_id} onChange={e => set('contractor_id', e.target.value)}>
            <option value="">— Select Contractor —</option>
            {(contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Amount (₹)" required>
            <input className="input" type="number" min="1" step="1" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" autoFocus />
          </Field>
          <Field label="Payment Date">
            <input className="input" type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
          </Field>
        </div>
        <Field label="Payment Method">
          <select className="input select" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Reference / Cheque No.">
          <input className="input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Optional reference number" />
        </Field>
        <Field label="Notes">
          <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional note" />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit"  className="btn btn-primary btn-sm"   disabled={saving}>
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
