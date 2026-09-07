// ============================================================
// MODALS — Add/Edit forms for all business entities
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Plus, Trash2, Package, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import {
  createContractor, createCustomer, createTransaction, deleteTransaction,
  recordPayment, useContractors, useCustomers, useMaterials,
} from '../lib/api';

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
          maxHeight: '92vh', overflow: 'auto',
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
function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function SectionLabel({ children, extra }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
      color: 'var(--accent-400)', marginBottom: 10, marginTop: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span>{children}</span>
      {extra}
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

function ModalSuccess({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13, color: 'var(--success)',
    }}>
      ✓ {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ADD CONTRACTOR MODAL  (with optional inline sub-customer)
// ═══════════════════════════════════════════════
export function AddContractorModal({ isOpen, onClose, onSuccess }) {
  const BLANK_CON = { name: '', contact_name: '', phone: '', email: '', city: '', credit_limit: '' };
  const BLANK_CUS = { name: '', project_type: 'Residential', address: '', city: '' };

  const [form,       setForm]       = useState(BLANK_CON);
  const [addCus,     setAddCus]     = useState(false);   // toggle sub-customer section
  const [cusForm,    setCusForm]    = useState(BLANK_CUS);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const PROJECT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Society', 'Government', 'Renovation', 'Other'];

  useEffect(() => {
    if (isOpen) {
      setForm(BLANK_CON); setCusForm(BLANK_CUS);
      setAddCus(false); setErr(''); setSuccessMsg('');
    }
  }, [isOpen]);

  function set(key, val)    { setForm(p => ({ ...p, [key]: val })); }
  function setC(key, val)   { setCusForm(p => ({ ...p, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Contractor name is required'); return; }
    if (addCus && !cusForm.name.trim()) { setErr('Customer / project name is required'); return; }

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

      const contractor = res.contractor;

      // Optionally create sub-customer
      if (addCus && cusForm.name.trim() && contractor?.id) {
        await createCustomer({
          name:          cusForm.name.trim(),
          contractor_id: contractor.id,
          project_type:  cusForm.project_type,
          address: [cusForm.address.trim(), cusForm.city.trim()].filter(Boolean).join(', ') || undefined,
        });
      }

      onSuccess?.(contractor);
      onClose();
    } catch (e) { setErr(e.message || 'Failed to add contractor'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Contractor" maxWidth={540}>
      <form onSubmit={handleSubmit}>
        <ModalError msg={err} />

        <SectionLabel>Contractor Details</SectionLabel>

        <Field label="Business / Contractor Name" required>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. Raj Construction" autoFocus />
        </Field>
        <Field label="Contact Person Name">
          <input className="input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
            placeholder="e.g. Rajesh Sharma" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+91 98765 43210" />
          </Field>
          <Field label="City">
            <input className="input" value={form.city} onChange={e => set('city', e.target.value)}
              placeholder="Ahmedabad" />
          </Field>
        </div>
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="contractor@email.com" />
        </Field>
        <Field label="Credit Limit (₹)">
          <input className="input" type="number" min="0" step="1000" value={form.credit_limit}
            onChange={e => set('credit_limit', e.target.value)} placeholder="0 = unlimited" />
        </Field>

        {/* ── Optional: Add first sub-customer inline ── */}
        <div style={{
          border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
          marginBottom: 16, overflow: 'hidden',
        }}>
          <button
            type="button"
            onClick={() => setAddCus(p => !p)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: addCus ? 'rgba(99,102,241,0.07)' : 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--accent-400)', fontSize: 13, fontWeight: 600,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserPlus size={14} />
              Also add first customer / project
            </span>
            {addCus ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {addCus && (
            <div style={{ padding: '12px 14px 4px', borderTop: '1px solid var(--border)' }}>
              <Field label="Customer / Project Name" required>
                <input className="input" value={cusForm.name} onChange={e => setC('name', e.target.value)}
                  placeholder="e.g. Sharma House, Tower B – Flat 5" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Project Type">
                  <select className="input select" value={cusForm.project_type} onChange={e => setC('project_type', e.target.value)}>
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="City / Village">
                  <input className="input" value={cusForm.city} onChange={e => setC('city', e.target.value)}
                    placeholder="e.g. Kolhapur" />
                </Field>
              </div>
              <Field label="Site Address">
                <input className="input" value={cusForm.address} onChange={e => setC('address', e.target.value)}
                  placeholder="Plot No., Area, Landmark…" />
              </Field>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Adding…' : addCus ? 'Add Contractor + Customer' : 'Add Contractor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// ADD CUSTOMER MODAL — full detail form
// ═══════════════════════════════════════════════
export function AddCustomerModal({ isOpen, onClose, onSuccess, preselectedContractorId }) {
  const { data: contractors } = useContractors();

  const [form, setForm] = useState({
    name:          '',
    contractor_id: preselectedContractorId || '',
    project_type:  'Residential',
    address:       '',
    city:          '',
    contact_name:  '',
    contact_phone: '',
    contact_email: '',
    credit_limit:  '',
    notes:         '',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const PROJECT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Society', 'Government', 'Renovation', 'Other'];

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: '', contractor_id: preselectedContractorId || '',
        project_type: 'Residential',
        address: '', city: '',
        contact_name: '', contact_phone: '', contact_email: '',
        credit_limit: '', notes: '',
      });
      setErr('');
    }
  }, [isOpen, preselectedContractorId]);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  const isContractorLocked = Boolean(preselectedContractorId);
  const selectedContractor = (contractors || []).find(c => c.id === form.contractor_id);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())   { setErr('Project / customer name is required'); return; }
    if (!form.contractor_id) { setErr('Please select a contractor'); return; }
    setSaving(true); setErr('');
    try {
      const res = await createCustomer({
        name:          form.name.trim(),
        contractor_id: form.contractor_id,
        project_type:  form.project_type,
        address: [form.address.trim(), form.city.trim()].filter(Boolean).join(', ') || undefined,
        notes: [
          form.contact_name  ? `Contact: ${form.contact_name}`       : '',
          form.contact_phone ? `Phone: ${form.contact_phone}`         : '',
          form.contact_email ? `Email: ${form.contact_email}`         : '',
          form.credit_limit  ? `Credit Limit: ₹${form.credit_limit}` : '',
          form.notes.trim()  ? `Notes: ${form.notes.trim()}`          : '',
        ].filter(Boolean).join(' | ') || undefined,
      });
      onSuccess?.(res.customer);
      onClose();
    } catch (e) { setErr(e.message || 'Failed to add customer'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Customer / Project" maxWidth={560}>
      <form onSubmit={handleSubmit}>
        <ModalError msg={err} />

        <SectionLabel>Project Details</SectionLabel>

        <Field label="Project / Customer Name" required>
          <input
            className="input"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Sharma House, Tower B – 5th Floor"
            autoFocus
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Contractor — locked if pre-selected */}
          <Field label="Contractor" required>
            {isContractorLocked ? (
              <div style={{
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                background: 'rgba(99,102,241,0.07)',
                border: '1px solid rgba(99,102,241,0.25)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 11, color: 'var(--accent-400)' }}>🔒</span>
                {selectedContractor?.name || '…'}
              </div>
            ) : (
              <select
                className="input select"
                value={form.contractor_id}
                onChange={e => set('contractor_id', e.target.value)}
              >
                <option value="">— Select Contractor —</option>
                {(contractors || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Project Type">
            <select
              className="input select"
              value={form.project_type}
              onChange={e => set('project_type', e.target.value)}
            >
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <SectionLabel>Site Location</SectionLabel>

        <Field label="Street / Plot / Area">
          <input
            className="input"
            value={form.address}
            onChange={e => set('address', e.target.value)}
            placeholder="e.g. Plot 12, Sai Nagar, Near Bus Stand"
          />
        </Field>
        <Field label="City / Village">
          <input
            className="input"
            value={form.city}
            onChange={e => set('city', e.target.value)}
            placeholder="e.g. Kolhapur"
          />
        </Field>

        <SectionLabel>
          Site / Owner Contact <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Contact Person Name">
            <input className="input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
              placeholder="e.g. Sunil Padalkar" />
          </Field>
          <Field label="Contact Phone">
            <input className="input" type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
              placeholder="+91 98765 43210" />
          </Field>
        </div>
        <Field label="Contact Email">
          <input className="input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
            placeholder="owner@email.com" />
        </Field>

        <SectionLabel>Finance</SectionLabel>

        <Field label="Credit Limit (₹)">
          <input className="input" type="number" min="0" step="1000" value={form.credit_limit}
            onChange={e => set('credit_limit', e.target.value)} placeholder="0 = no limit set" />
        </Field>
        <Field label="Internal Notes">
          <textarea
            className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Any special terms, access instructions, or reminders…"
            style={{ height: 'auto', paddingTop: 8, paddingBottom: 8, resize: 'vertical' }}
          />
        </Field>

        {/* Preview banner */}
        {(form.name || selectedContractor) && (
          <div style={{
            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14,
            fontSize: 12, color: 'var(--text-secondary)',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
              {form.name || 'New Customer'}{' '}
              <span className="badge badge-neutral" style={{ verticalAlign: 'middle' }}>{form.project_type}</span>
            </div>
            {selectedContractor && (
              <div>Under contractor: <strong>{selectedContractor.name}</strong></div>
            )}
            {(form.address || form.city) && (
              <div>📍 {[form.address, form.city].filter(Boolean).join(', ')}</div>
            )}
            {form.contact_name && (
              <div>👤 {form.contact_name}{form.contact_phone ? ` · ${form.contact_phone}` : ''}</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !form.name.trim() || !form.contractor_id}>
            {saving ? 'Adding…' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// ═══════════════════════════════════════════════
// MATERIAL COMBOBOX — dropdown + free typing + keyboard support (Enter, Arrows)
// ═══════════════════════════════════════════════
function MaterialCombobox({ value, onChange, materials, placeholder = 'Search or type material name…' }) {
  const [query,          setQuery]          = useState(value || '');
  const [open,           setOpen]           = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = (materials || []).filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10);

  const hasExact = filtered.some(m => m.name.toLowerCase() === query.trim().toLowerCase());
  const showCustomOption = Boolean(query.trim() && !hasExact);
  const totalItems = filtered.length + (showCustomOption ? 1 : 0);

  // Reset highlight index when query changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  function select(mat) {
    setQuery(mat.name);
    onChange({ name: mat.name, unit: mat.unit || 'piece', rate: parseFloat(mat.rate || 0) });
    setOpen(false);
  }

  function selectCustom(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setQuery(trimmed);
    onChange({ name: trimmed, unit: '', rate: 0 });
    setOpen(false);
  }

  function handleInput(e) {
    const v = e.target.value;
    setQuery(v);
    onChange({ name: v, unit: '', rate: 0 });
    setOpen(true);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (totalItems > 0) {
        setHighlightIndex(prev => (prev + 1 < totalItems ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (totalItems > 0) {
        setHighlightIndex(prev => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault(); // Stop modal form submit!
      if (open && totalItems > 0) {
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          select(filtered[highlightIndex]);
        } else {
          selectCustom(query);
        }
      } else if (query.trim()) {
        selectCustom(query);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="input"
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => { setOpen(true); setHighlightIndex(0); }}
        placeholder={placeholder}
        autoComplete="off"
        style={{ paddingRight: 30 }}
      />
      <span style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-muted)', fontSize: 10, pointerEvents: 'none',
      }}>▼</span>

      {open && (filtered.length > 0 || showCustomOption) && (
        <div ref={listRef} style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', marginTop: 2,
          boxShadow: 'var(--shadow-lg)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map((m, idx) => {
            const isHighlighted = highlightIndex === idx;
            return (
              <div
                key={m.id}
                onMouseDown={() => select(m)}
                onMouseEnter={() => setHighlightIndex(idx)}
                style={{
                  padding: '8px 12px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  background: isHighlighted ? 'var(--bg-hover)' : 'transparent',
                  transition: 'background var(--transition)',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isHighlighted ? 'var(--accent-400)' : 'inherit' }}>
                    {m.name}
                  </div>
                  {m.category && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.category}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  {m.rate > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-400)' }}>
                      ₹{m.rate}/{m.unit || 'pc'}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.unit || 'piece'}</div>
                </div>
              </div>
            );
          })}

          {/* "Use as typed" option */}
          {showCustomOption && (
            <div
              onMouseDown={() => selectCustom(query)}
              onMouseEnter={() => setHighlightIndex(filtered.length)}
              style={{
                padding: '9px 12px', cursor: 'pointer',
                color: 'var(--accent-400)', fontSize: 12, fontWeight: 600,
                background: highlightIndex === filtered.length ? 'rgba(99,102,241,0.15)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>＋ Use "{query.trim()}" as new material</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, opacity: 0.8 }}>
                ↵ Press Enter to fill
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// UNIT COMBOBOX — searchable unit picker
// Type "ba" → Bag, Bundle | "kg" → Kilogram | "sq" → Sq.Feet/Sq.Metre
// ═══════════════════════════════════════════════════════
const ALL_UNITS = [
  // Count
  { value: 'piece',    label: 'Piece',          short: 'pcs',  keywords: ['piece', 'pcs', 'number', 'no', 'nos', 'count', 'unit'] },
  { value: 'set',      label: 'Set',            short: 'set',  keywords: ['set'] },
  { value: 'pair',     label: 'Pair',           short: 'pr',   keywords: ['pair'] },
  // Weight
  { value: 'kg',       label: 'Kilogram',       short: 'kg',   keywords: ['kg', 'kilo', 'kilogram'] },
  { value: 'ton',      label: 'Ton',            short: 'ton',  keywords: ['ton', 'tonne', 'mt'] },
  { value: 'quintal',  label: 'Quintal',        short: 'qtl',  keywords: ['quintal', 'qtl', 'q'] },
  { value: 'gram',     label: 'Gram',           short: 'g',    keywords: ['gram', 'gm', 'g'] },
  // Bag / Volume
  { value: 'bag',      label: 'Bag',            short: 'bag',  keywords: ['bag', 'bori', 'bora'] },
  { value: 'sack',     label: 'Sack',           short: 'sack', keywords: ['sack'] },
  { value: 'litre',    label: 'Litre',          short: 'L',    keywords: ['litre', 'liter', 'l'] },
  { value: 'cubic_m',  label: 'Cubic Metre',    short: 'm³',   keywords: ['cubic metre', 'cum', 'm3', 'cubic m'] },
  { value: 'cubic_ft', label: 'Cubic Feet',     short: 'ft³',  keywords: ['cubic feet', 'cft', 'ft3', 'cubic f'] },
  // Length
  { value: 'metre',    label: 'Metre',          short: 'm',    keywords: ['metre', 'meter', 'm', 'rmt', 'rmt'] },
  { value: 'feet',     label: 'Feet',           short: 'ft',   keywords: ['feet', 'foot', 'ft'] },
  { value: 'inch',     label: 'Inch',           short: 'in',   keywords: ['inch', 'in', '"'] },
  { value: 'rod',      label: 'Rod / Bar',      short: 'rod',  keywords: ['rod', 'bar', 'sariya', 'rebar'] },
  // Area
  { value: 'sqft',     label: 'Sq. Feet',       short: 'ft²',  keywords: ['sqft', 'sq feet', 'sq ft', 'square feet'] },
  { value: 'sqm',      label: 'Sq. Metre',      short: 'm²',   keywords: ['sqm', 'sq metre', 'sq m', 'square metre'] },
  // Packaging
  { value: 'bundle',   label: 'Bundle',         short: 'bdl',  keywords: ['bundle', 'bdl', 'gatthi'] },
  { value: 'roll',     label: 'Roll',           short: 'roll', keywords: ['roll', 'reel'] },
  { value: 'box',      label: 'Box',            short: 'box',  keywords: ['box', 'carton', 'ctn'] },
  { value: 'truck',    label: 'Truck Load',     short: 'trk',  keywords: ['truck', 'trk', 'load', 'gaadi'] },
  { value: 'brass',    label: 'Brass',          short: 'brass',keywords: ['brass', 'sand', 'ret'] },
];

function UnitCombobox({ value, onChange }) {
  const [query,          setQuery]          = useState('');
  const [open,           setOpen]           = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapRef = useRef(null);

  // Display the short code of the selected value
  const selected = ALL_UNITS.find(u => u.value === value);

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? ALL_UNITS.filter(u => {
        const q = query.toLowerCase();
        return (
          u.label.toLowerCase().includes(q) ||
          u.short.toLowerCase().includes(q) ||
          u.keywords.some(k => k.includes(q))
        );
      })
    : ALL_UNITS;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  function select(unit) {
    onChange(unit.value);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length > 0) {
        setHighlightIndex(prev => (prev + 1 < filtered.length ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        setHighlightIndex(prev => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault(); // Stop modal form submit
      if (filtered.length > 0 && filtered[highlightIndex]) {
        select(filtered[highlightIndex]);
      } else {
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Trigger — shows selected unit or search input */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 36, padding: '0 8px 0 10px',
          border: open ? '1px solid var(--accent-400)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-surface)',
          cursor: 'pointer',
          gap: 6,
          transition: 'border-color 0.15s ease',
          boxSizing: 'border-box',
        }}
        onClick={() => setOpen(p => !p)}
      >
        {open ? (
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); }}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
            placeholder="Type to search…"
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 12, color: 'var(--text-primary)', width: '100%',
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            {selected ? (
              <>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {selected.label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
                  ({selected.short})
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unit…</span>
            )}
          </div>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 9, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, zIndex: 9999,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              No match for "{query}" — try kg, bag, feet…
            </div>
          ) : (
            filtered.map((u, idx) => {
              const isHighlighted = highlightIndex === idx;
              return (
                <div
                  key={u.value}
                  onMouseDown={e => { e.preventDefault(); select(u); }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: isHighlighted ? 'var(--bg-hover)' : value === u.value ? 'rgba(99,102,241,0.1)' : 'transparent',
                    transition: 'background 0.12s',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isHighlighted ? 'var(--accent-400)' : value === u.value ? 'var(--accent-400)' : 'var(--text-primary)' }}>
                      {u.label}
                    </span>
                    {/* Highlight matched keywords */}
                    {query.trim() && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
                        {u.keywords.filter(k => k.includes(query.toLowerCase())).slice(0,2).join(', ')}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    background: 'var(--bg-hover)', padding: '2px 6px',
                    borderRadius: 'var(--radius-full)',
                    fontFamily: 'monospace',
                  }}>
                    {u.short}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Blank line item factory ──────────────────────────
function blankItem() {
  return { id: Date.now() + Math.random(), name: '', qty: '', unit: 'bag', rate: '', lineTotal: 0 };
}

// ── Single line item row ─────────────────────────────
function LineItem({ item, materials, onUpdate, onRemove, canRemove }) {
  function update(field, val) {
    const updated = { ...item, [field]: val };
    const qty  = parseFloat(updated.qty  || 0);
    const rate = parseFloat(updated.rate || 0);
    updated.lineTotal = qty * rate;
    onUpdate(updated);
  }

  function handleMaterialSelect({ name, unit, rate }) {
    const updated = {
      ...item,
      name,
      unit: unit || item.unit,
      rate: rate > 0 ? String(rate) : item.rate,
    };
    const qty = parseFloat(updated.qty || 0);
    updated.lineTotal = qty * parseFloat(updated.rate || 0);
    onUpdate(updated);
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 80px 130px 100px 90px 28px',
      gap: 6, alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Material Name */}
      <MaterialCombobox
        value={item.name}
        materials={materials}
        onChange={handleMaterialSelect}
        placeholder="Material name…"
      />

      {/* Qty — clearly "how many" */}
      <input
        className="input" type="number" min="0.001" step="any"
        value={item.qty} onChange={e => update('qty', e.target.value)}
        placeholder="0"
        title="How many units?"
        style={{ textAlign: 'center', fontWeight: 600 }}
      />

      {/* Unit — searchable combobox */}
      <UnitCombobox
        value={item.unit}
        onChange={val => update('unit', val)}
      />

      {/* Rate */}
      <input
        className="input" type="number" min="0" step="0.01"
        value={item.rate} onChange={e => update('rate', e.target.value)}
        placeholder="₹ Rate"
        title="Rate per unit in ₹"
        style={{ textAlign: 'right' }}
      />

      {/* Line Total */}
      <div style={{
        fontSize: 13, fontWeight: 700,
        color: item.lineTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
        textAlign: 'right', whiteSpace: 'nowrap',
      }}>
        {item.lineTotal > 0 ? `₹${item.lineTotal.toLocaleString('en-IN')}` : '—'}
      </div>

      {/* Remove button */}
      <button
        type="button" onClick={onRemove} disabled={!canRemove}
        style={{
          background: 'none', border: 'none', cursor: canRemove ? 'pointer' : 'default',
          color: canRemove ? 'var(--danger)' : 'var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, width: 24, height: 24,
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}


// ── Mini inline customer creation form ───────────────
function InlineNewCustomer({ contractorId, onCreated, onCancel }) {
  const PROJECT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Society', 'Government', 'Renovation', 'Other'];
  const [form,   setForm]   = useState({ name: '', project_type: 'Residential', city: '' });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Name is required'); return; }
    setSaving(true); setErr('');
    try {
      const res = await createCustomer({
        name:          form.name.trim(),
        contractor_id: contractorId,
        project_type:  form.project_type,
        address:       form.city.trim() || undefined,
      });
      onCreated(res.customer);
    } catch (e) { setErr(e.message || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{
      background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: 'var(--radius-md)', padding: '12px 14px', marginTop: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-400)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        New Customer / Project
      </div>
      {err && <ModalError msg={err} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8, marginBottom: 8 }}>
        <input
          className="input"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="Customer / project name *"
          autoFocus
        />
        <select
          className="input select"
          value={form.project_type}
          onChange={e => setForm(p => ({ ...p, project_type: e.target.value }))}
        >
          {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <input
        className="input"
        value={form.city}
        onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
        placeholder="City / village (optional)"
        style={{ marginBottom: 10 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate} disabled={saving || !form.name.trim()}>
          {saving ? 'Adding…' : 'Add Customer'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ISSUE MATERIAL MODAL
// ═══════════════════════════════════════════════
export function IssueMaterialModal({ isOpen, onClose, onSuccess, preselectedContractorId }) {
  const { data: contractors }       = useContractors();
  const { data: materialCatalog }   = useMaterials();

  const [contractorId,    setContractorId]    = useState(preselectedContractorId || '');
  const [customerId,      setCustomerId]      = useState('');
  const [items,           setItems]           = useState([blankItem()]);
  const [advance,         setAdvance]         = useState('');
  const [paymentMethod,   setPaymentMethod]   = useState('cash');
  const [paymentRef,      setPaymentRef]      = useState('');
  const [txnDate,         setTxnDate]         = useState(new Date().toISOString().split('T')[0]);
  const [dueDate,         setDueDate]         = useState('');
  const [notes,           setNotes]           = useState('');
  const [saving,          setSaving]          = useState(false);
  const [err,             setErr]             = useState('');
  const [showNewCus,      setShowNewCus]      = useState(false);

  const effectiveContractorId = contractorId || null;
  const { data: customers, refetch: refetchCustomers } = useCustomers(effectiveContractorId);
  const catalog = materialCatalog || [];

  useEffect(() => {
    if (isOpen) {
      setContractorId(preselectedContractorId || '');
      setCustomerId('');
      setItems([blankItem()]);
      setAdvance('');
      setPaymentMethod('cash');
      setPaymentRef('');
      setTxnDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setNotes('');
      setErr('');
      setShowNewCus(false);
    }
  }, [isOpen, preselectedContractorId]);

  const grandTotal  = items.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const advanceAmt  = parseFloat(advance || 0);
  const outstanding = Math.max(0, grandTotal - advanceAmt);

  function addItem()            { setItems(p => [...p, blankItem()]); }
  function updateItem(updated)  { setItems(p => p.map(it => it.id === updated.id ? updated : it)); }
  function removeItem(id)       { setItems(p => p.filter(it => it.id !== id)); }

  function handleNewCustomerCreated(newCus) {
    setShowNewCus(false);
    refetchCustomers();
    setCustomerId(newCus.id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!contractorId) { setErr('Please select a contractor'); return; }

    const validItems = items.filter(it => it.name.trim() && parseFloat(it.qty) > 0 && parseFloat(it.rate) >= 0);
    if (validItems.length === 0) {
      setErr('Add at least one material with name, quantity, and rate');
      return;
    }
    if (grandTotal <= 0) { setErr('Total amount must be greater than ₹0'); return; }

    const descLines = validItems.map(it =>
      `${it.name} × ${it.qty} ${it.unit} @ ₹${parseFloat(it.rate).toLocaleString('en-IN')} = ₹${it.lineTotal.toLocaleString('en-IN')}`
    );
    const description = descLines.join('\n');

    setSaving(true); setErr('');
    try {
      const res = await createTransaction({
        contractor_id:     contractorId,
        customer_id:       customerId   || undefined,
        description,
        total_amount:      grandTotal,
        advance_amount:    advanceAmt,
        payment_method:    advanceAmt > 0 ? paymentMethod : undefined,
        payment_reference: advanceAmt > 0 ? paymentRef.trim() : undefined,
        transaction_date:  txnDate,
        due_date:          dueDate      || undefined,
        notes:             notes.trim() || undefined,
      });
      onSuccess?.(res.transaction);
      onClose();
    } catch (e) { setErr(e.message || 'Failed to record material issue'); }
    finally { setSaving(false); }
  }

  const isContractorLocked = Boolean(preselectedContractorId);
  const selectedContractorName = (contractors || []).find(c => c.id === contractorId)?.name;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Material to Contractor" maxWidth={720}>
      <form onSubmit={handleSubmit}>
        <ModalError msg={err} />

        {/* ── Party Selection ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {/* Contractor */}
          <Field label="Contractor" required>
            {isContractorLocked ? (
              <div style={{
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                background: 'rgba(99,102,241,0.07)',
                border: '1px solid rgba(99,102,241,0.25)',
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 11, color: 'var(--accent-400)' }}>🔒</span>
                {selectedContractorName || '…'}
              </div>
            ) : (
              <select
                className="input select"
                value={contractorId}
                onChange={e => { setContractorId(e.target.value); setCustomerId(''); setShowNewCus(false); }}
              >
                <option value="">— Select Contractor —</option>
                {(contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </Field>

          {/* Customer / Project */}
          <Field label="Customer / Project" hint="(optional)">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                className="input select"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                disabled={!contractorId}
                style={{ flex: 1 }}
              >
                <option value="">— Select Project —</option>
                {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {contractorId && !showNewCus && (
                <button
                  type="button"
                  title="Add new customer"
                  onClick={() => setShowNewCus(true)}
                  style={{
                    flexShrink: 0, width: 34, height: 34,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--accent-400)',
                    background: 'transparent', cursor: 'pointer',
                    color: 'var(--accent-400)',
                  }}
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </Field>
        </div>

        {showNewCus && contractorId && (
          <InlineNewCustomer
            contractorId={contractorId}
            onCreated={handleNewCustomerCreated}
            onCancel={() => setShowNewCus(false)}
          />
        )}

        <SectionLabel>Material Items</SectionLabel>
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', padding: '12px 14px', marginBottom: 14,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 130px 100px 90px 28px',
            gap: 6, marginBottom: 6,
          }}>
            {[
              { h: 'Material Name',    align: 'left'   },
              { h: 'Qty',              align: 'center', hint: 'How many?' },
              { h: 'Unit',             align: 'left',   hint: 'Type to search: bag, kg, feet…' },
              { h: 'Rate per Unit (₹)', align: 'right'  },
              { h: 'Total',            align: 'right'  },
              { h: '',                align: 'right'  },
            ].map(({ h, align, hint }, i) => (
              <div key={i} style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-muted)',
                textAlign: align,
              }} title={hint}>
                {h}{hint && <span style={{ color: 'var(--accent-400)', marginLeft: 2 }}>*</span>}
              </div>
            ))}
          </div>

          {items.map(item => (
            <LineItem
              key={item.id}
              item={item}
              materials={catalog}
              onUpdate={updateItem}
              onRemove={() => removeItem(item.id)}
              canRemove={items.length > 1}
            />
          ))}

          <button
            type="button" onClick={addItem}
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 8, color: 'var(--accent-400)' }}
          >
            <Plus size={13} /> Add Another Item
          </button>
        </div>

        <div style={{
          background: grandTotal > 0 ? 'rgba(99,102,241,0.06)' : 'transparent',
          border: grandTotal > 0 ? '1px solid rgba(99,102,241,0.15)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Grand Total ({items.filter(it => it.lineTotal > 0).length} item{items.filter(it => it.lineTotal > 0).length !== 1 ? 's' : ''})
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#818cf8' }}>
              {grandTotal > 0 ? `₹${grandTotal.toLocaleString('en-IN')}` : '₹0'}
            </span>
          </div>
        </div>

        <SectionLabel>Payment at Counter</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Advance Collected (₹)">
            <input
              className="input" type="number" min="0" step="1"
              value={advance} onChange={e => setAdvance(e.target.value)}
              placeholder="0 — if nothing collected"
            />
          </Field>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
            }}>
              Outstanding (Balance Due)
            </div>
            <div style={{
              height: 38, display: 'flex', alignItems: 'center', padding: '0 12px',
              background: outstanding > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
              border: `1px solid ${outstanding > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
              borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: 16,
              color: outstanding > 0 ? 'var(--warning)' : 'var(--success)',
            }}>
              ₹{outstanding.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Payment Method when Advance is paid */}
        {advanceAmt > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8, animation: 'slideUp 0.15s ease' }}>
            <Field label="Payment Method">
              <select className="input select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
                <option value="cheque">📄 Cheque</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Reference (optional)">
              <input className="input" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="e.g. UPI ref, cheque no." />
            </Field>
          </div>
        )}

        {/* ── Dates ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          <Field label="Issue Date" required>
            <input className="input" type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)} />
          </Field>
          <Field label="Payment Due Date">
            <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional internal note" />
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {grandTotal > 0 && (
              <span>
                Total: <strong style={{ color: '#818cf8' }}>₹{grandTotal.toLocaleString('en-IN')}</strong>
                {advanceAmt > 0 && (
                  <> · Advance: <strong style={{ color: 'var(--success)' }}>₹{advanceAmt.toLocaleString('en-IN')}</strong></>
                )}
                {outstanding > 0 && (
                  <> · Due: <strong style={{ color: 'var(--warning)' }}>₹{outstanding.toLocaleString('en-IN')}</strong></>
                )}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !contractorId}>
              {saving ? 'Issuing…' : 'Issue Material'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// RECORD PAYMENT MODAL
// ═══════════════════════════════════════════════
export function RecordPaymentModal({
  isOpen, onClose, onSuccess,
  preselectedContractorId,
  preselectedTransactionId,
  preselectedCustomerId,
  preselectedCustomerName,
  outstandingAmount,
}) {
  const { data: contractors }       = useContractors();
  const [contractorId,  setContractorId]  = useState(preselectedContractorId || '');
  const [customerId,    setCustomerId]    = useState(preselectedCustomerId || '');
  const [amount,        setAmount]        = useState(outstandingAmount ? String(outstandingAmount) : '');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate,   setPaymentDate]   = useState(new Date().toISOString().split('T')[0]);
  const [reference,     setReference]     = useState('');
  const [notes,         setNotes]         = useState('');
  const [saving,        setSaving]        = useState(false);
  const [err,           setErr]           = useState('');

  // Load customers for selected contractor
  const { data: customers } = useCustomers(contractorId || null);

  const currentContractor = (contractors || []).find(c => c.id === contractorId);
  // If a specific customer is pre-selected, use their outstanding; else contractor total
  const totalOutstanding = outstandingAmount ?? currentContractor?.outstanding ?? 0;

  const METHODS = [
    { value: 'cash',          label: '💵 Cash'          },
    { value: 'upi',           label: '📱 UPI'           },
    { value: 'bank_transfer', label: '🏦 Bank Transfer' },
    { value: 'cheque',        label: '📄 Cheque'        },
    { value: 'other',         label: 'Other'            },
  ];

  useEffect(() => {
    if (isOpen) {
      setContractorId(preselectedContractorId || '');
      setCustomerId(preselectedCustomerId || '');
      setAmount(outstandingAmount ? String(outstandingAmount) : '');
      setPaymentMethod('cash');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReference('');
      setNotes('');
      setErr('');
    }
  }, [isOpen, preselectedContractorId, preselectedCustomerId, outstandingAmount]);

  const isContractorLocked = Boolean(preselectedContractorId);
  const isCustomerLocked   = Boolean(preselectedCustomerId);
  const selectedContractorName = (contractors || []).find(c => c.id === contractorId)?.name;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!contractorId) { setErr('Please select a contractor'); return; }
    if (!amount || parseFloat(amount) <= 0) { setErr('Payment amount must be greater than ₹0'); return; }
    setSaving(true); setErr('');
    try {
      const res = await recordPayment({
        contractor_id:  contractorId,
        customer_id:    customerId    || preselectedCustomerId || undefined,
        transaction_id: preselectedTransactionId || undefined,
        amount:         parseFloat(amount),
        payment_method: paymentMethod,
        payment_date:   paymentDate,
        reference:      reference     || undefined,
        notes:          notes         || undefined,
      });
      onSuccess?.(res.payment);
      onClose();
    } catch (e) { setErr(e.message || 'Failed to record payment'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" maxWidth={500}>
      <form onSubmit={handleSubmit}>
        <ModalError msg={err} />

        <SectionLabel>Payment From</SectionLabel>

        {/* Contractor */}
        <Field label="Contractor" required>
          {isContractorLocked ? (
            <div style={{
              padding: '9px 12px', borderRadius: 'var(--radius-md)',
              background: 'rgba(99,102,241,0.07)',
              border: '1px solid rgba(99,102,241,0.25)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 11, color: 'var(--accent-400)' }}>🔒</span>
              {selectedContractorName || '…'}
            </div>
          ) : (
            <select
              className="input select"
              value={contractorId}
              onChange={e => {
                const newId = e.target.value;
                setContractorId(newId);
                setCustomerId('');
                const con = (contractors || []).find(c => c.id === newId);
                if (con?.outstanding > 0) setAmount(String(con.outstanding));
              }}
            >
              <option value="">— Select Contractor —</option>
              {(contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </Field>

        {/* Customer — locked when pre-selected, else optional dropdown */}
        <Field label="Customer / Project" hint={isCustomerLocked ? undefined : "(optional – link to specific project)"}>
          {isCustomerLocked ? (
            <div style={{
              padding: '9px 12px', borderRadius: 'var(--radius-md)',
              background: 'rgba(34,197,94,0.07)',
              border: '1px solid rgba(34,197,94,0.25)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 11, color: 'var(--success)' }}>🏠</span>
              {preselectedCustomerName || '…'}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>Customer Payment</span>
            </div>
          ) : (
            <select
              className="input select"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              disabled={!contractorId}
            >
              <option value="">— All Projects / General Account Payment —</option>
              {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </Field>

        {/* Contractor Outstanding Banner */}
        {totalOutstanding > 0 && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Total Pending Debt
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--warning)', marginTop: 1 }}>
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setAmount(String(totalOutstanding))}
                style={{
                  fontSize: 11, padding: '5px 12px', borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.12)',
                  color: 'var(--success)', cursor: 'pointer', fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                Clear Full Balance (₹{totalOutstanding.toLocaleString('en-IN')})
              </button>
            </div>
          </div>
        )}

        <SectionLabel>Payment Details</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
          <Field label="How much was paid? (₹)" hint="Enter any amount" required>
            <input
              className="input" type="number" min="1" step="1"
              value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 500, 1000, 5000…" autoFocus
              style={{ fontWeight: 700, fontSize: 16 }}
            />
          </Field>
          <Field label="Payment Date">
            <input className="input" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </Field>
        </div>

        {/* Live Balance preview */}
        {parseFloat(amount || 0) > 0 && totalOutstanding > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: parseFloat(amount) >= totalOutstanding ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${parseFloat(amount) >= totalOutstanding ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
            borderRadius: 'var(--radius-md)', padding: '9px 14px', marginBottom: 14, fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Paying <strong style={{ color: 'var(--text-primary)' }}>₹{parseFloat(amount).toLocaleString('en-IN')}</strong>:
            </span>
            <strong style={{ fontSize: 13, color: parseFloat(amount) >= totalOutstanding ? 'var(--success)' : 'var(--warning)' }}>
              {parseFloat(amount) >= totalOutstanding
                ? '✓ Clears entire bill (₹0 remaining)'
                : `₹${Math.max(0, totalOutstanding - parseFloat(amount)).toLocaleString('en-IN')} will remain`}
            </strong>
          </div>
        )}

        <Field label="Payment Method">
          <select className="input select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>

        <Field label="Reference / Cheque No.">
          <input className="input" value={reference} onChange={e => setReference(e.target.value)}
            placeholder="Optional reference number" />
        </Field>

        <Field label="Notes">
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional note" />
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════
// ASSIGN MATERIAL TO CUSTOMER MODAL
// One-stop form: Customer locked → Add materials → Payment → Submit
// Designed to be ultra-simple — even non-tech owners can use it
// ═══════════════════════════════════════════════
export function AssignMaterialToCustomerModal({ isOpen, onClose, onSuccess, customer }) {
  // customer = { id, name, contractorId, contractorName }
  const { data: materialCatalog } = useMaterials();
  const catalog = materialCatalog || [];

  const [items,   setItems]   = useState([blankItem()]);
  const [advance, setAdvance] = useState('');
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes,   setNotes]   = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef,    setPaymentRef]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [success, setSuccess] = useState('');

  // Reset every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setItems([blankItem()]);
      setAdvance('');
      setPaymentMethod('cash');
      setPaymentRef('');
      setTxnDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setNotes('');
      setErr('');
      setSuccess('');
    }
  }, [isOpen]);

  // Live totals
  const grandTotal  = items.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const advanceAmt  = parseFloat(advance || 0);
  const outstanding = Math.max(0, grandTotal - advanceAmt);
  const validItems  = items.filter(it => it.name.trim() && parseFloat(it.qty) > 0 && parseFloat(it.rate) >= 0);
  const isPaid      = advanceAmt >= grandTotal && grandTotal > 0;
  const isPartial   = advanceAmt > 0 && advanceAmt < grandTotal;

  function addItem()           { setItems(p => [...p, blankItem()]); }
  function updateItem(updated) { setItems(p => p.map(it => it.id === updated.id ? updated : it)); }
  function removeItem(id)      { setItems(p => p.filter(it => it.id !== id)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customer?.id)           { setErr('No customer selected'); return; }
    if (!customer?.contractorId) { setErr('Customer has no contractor linked'); return; }
    if (validItems.length === 0) {
      setErr('Add at least one material with name, quantity, and rate');
      return;
    }
    if (grandTotal <= 0) { setErr('Total must be greater than ₹0'); return; }

    const description = validItems.map(it =>
      `${it.name} × ${it.qty} ${it.unit} @ ₹${parseFloat(it.rate).toLocaleString('en-IN')} = ₹${it.lineTotal.toLocaleString('en-IN')}`
    ).join('\n');

    setSaving(true); setErr('');
    try {
      const res = await createTransaction({
        contractor_id:     customer.contractorId,
        customer_id:       customer.id,
        description,
        total_amount:      grandTotal,
        advance_amount:    advanceAmt,
        payment_method:    advanceAmt > 0 ? paymentMethod : undefined,
        payment_reference: advanceAmt > 0 ? paymentRef.trim() : undefined,
        transaction_date:  txnDate,
        due_date:          dueDate || undefined,
        notes:             notes.trim() || undefined,
      });
      setSuccess('Materials issued successfully! ✅');
      setTimeout(() => {
        onSuccess?.(res.transaction);
        onClose();
      }, 900);
    } catch (e) {
      setErr(e.message || 'Failed to issue materials');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 Assign Materials to Customer" maxWidth={740}>
      <form onSubmit={handleSubmit}>
        <ModalError   msg={err}     />
        <ModalSuccess msg={success} />

        {/* ── SECTION 1: CUSTOMER (LOCKED) ── */}
        <SectionLabel>👤 Customer</SectionLabel>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px', marginBottom: 20,
        }}>
          {/* Avatar */}
          <div style={{
            width: 46, height: 46, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {(customer?.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              {customer?.name || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Contractor: <strong style={{ color: 'var(--accent-400)' }}>{customer?.contractorName || '—'}</strong>
            </div>
          </div>
          <div style={{
            marginLeft: 'auto',
            fontSize: 10, color: 'var(--accent-500)',
            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 'var(--radius-full)', padding: '3px 10px', fontWeight: 700,
          }}>
            🔒 LOCKED
          </div>
        </div>

        {/* ── SECTION 2: MATERIALS ── */}
        <SectionLabel
          extra={
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0 }}>
              Add as many items as needed
            </span>
          }
        >
          📦 Materials
        </SectionLabel>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: 14,
        }}>
          {/* Column headers aligned to LineItem */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 130px 100px 90px 28px',
            gap: 6, marginBottom: 8, paddingBottom: 8,
            borderBottom: '1px solid var(--border)',
          }}>
            {[
              { h: 'Material Name',    align: 'left' },
              { h: 'Qty',              align: 'center', hint: 'How many?' },
              { h: 'Unit',             align: 'left',   hint: 'Type to search: bag, kg, feet…' },
              { h: 'Rate per Unit (₹)', align: 'right' },
              { h: 'Total',            align: 'right' },
              { h: '',                align: 'right' },
            ].map(({ h, align, hint }, i) => (
              <div key={i} style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-muted)',
                textAlign: align,
              }} title={hint}>
                {h}{hint && <span style={{ color: 'var(--accent-400)', marginLeft: 2 }}>*</span>}
              </div>
            ))}
          </div>

          {/* Material rows */}
          {items.map(item => (
            <LineItem
              key={item.id}
              item={item}
              materials={catalog}
              onUpdate={updateItem}
              onRemove={() => removeItem(item.id)}
              canRemove={items.length > 1}
            />
          ))}

          {/* Add row */}
          <button
            type="button"
            onClick={addItem}
            style={{
              marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(251,191,36,0.08)',
              border: '1px dashed rgba(251,191,36,0.35)',
              borderRadius: 'var(--radius-md)', padding: '9px 14px',
              color: 'var(--accent-400)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', width: '100%', justifyContent: 'center',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.08)'; }}
          >
            <Plus size={14} /> Add Another Material
          </button>
        </div>

        {/* Grand Total Banner */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: grandTotal > 0 ? 'rgba(99,102,241,0.07)' : 'var(--bg-surface)',
          border: `1px solid ${grandTotal > 0 ? 'rgba(99,102,241,0.2)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20,
          transition: 'all 0.2s ease',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Grand Total
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              {validItems.length > 0
                ? validItems.map(it => `${it.name || '—'} ×${it.qty || 0}`).join(' · ')
                : 'No items added yet'}
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: grandTotal > 0 ? '#818cf8' : 'var(--text-muted)' }}>
            {grandTotal > 0 ? `₹${grandTotal.toLocaleString('en-IN')}` : '₹0'}
          </div>
        </div>

        {/* ── SECTION 3: PAYMENT ── */}
        <SectionLabel>💰 Payment at Counter</SectionLabel>

        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '16px 16px 14px', marginBottom: 14,
        }}>
          {/* Advance + Outstanding */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Advance input */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
                marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Advance Paid (₹)
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>optional</span>
              </label>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={advance}
                onChange={e => setAdvance(e.target.value)}
                placeholder="0 — if nothing collected"
                style={{ fontSize: 15, fontWeight: 600 }}
              />
              {isPartial && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ Partial payment recorded</div>}
              {isPaid    && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ Fully paid at counter</div>}
            </div>

            {/* Outstanding live badge */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)',
                marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Outstanding (Balance Due)
              </label>
              <div style={{
                height: 42, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '0 14px', borderRadius: 'var(--radius-md)',
                background: isPaid
                  ? 'rgba(34,197,94,0.1)'
                  : outstanding > 0 ? 'rgba(245,158,11,0.1)' : 'var(--bg-input)',
                border: `1.5px solid ${isPaid ? 'rgba(34,197,94,0.4)' : outstanding > 0 ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                fontWeight: 900, fontSize: 20,
                color: isPaid ? 'var(--success)' : outstanding > 0 ? 'var(--warning)' : 'var(--text-muted)',
                transition: 'all 0.25s ease',
              }}>
                {isPaid ? '✓ CLEAR' : `₹${outstanding.toLocaleString('en-IN')}`}
              </div>
            </div>
          </div>

          {/* Payment Method when Advance is paid */}
          {advanceAmt > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14, animation: 'slideUp 0.15s ease' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Payment Method
                </label>
                <select className="input select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="cash">💵 Cash</option>
                  <option value="upi">📱 UPI</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="cheque">📄 Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>
                  Payment Reference (optional)
                </label>
                <input className="input" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="e.g. UPI ref, cheque no." />
              </div>
            </div>
          )}

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Issue Date <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                className="input"
                type="date"
                value={txnDate}
                onChange={e => setTxnDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Payment Due Date
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>optional</span>
              </label>
              <input
                className="input"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <Field label="Notes" hint="(optional — e.g. 1st floor delivery, site visit done…)">
          <input
            className="input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any extra info about this material issue…"
          />
        </Field>

        {/* Live summary strip */}
        {grandTotal > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)',
            borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 4, fontSize: 13,
          }}>
            <span>Total: <strong style={{ color: '#818cf8' }}>₹{grandTotal.toLocaleString('en-IN')}</strong></span>
            {advanceAmt > 0 && (
              <span>Advance: <strong style={{ color: 'var(--success)' }}>₹{advanceAmt.toLocaleString('en-IN')}</strong></span>
            )}
            {outstanding > 0 && (
              <span>Due: <strong style={{ color: 'var(--warning)' }}>₹{outstanding.toLocaleString('en-IN')}</strong></span>
            )}
            {isPaid && (
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ Fully Paid</span>
            )}
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center',
          paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 10,
        }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || validItems.length === 0 || grandTotal <= 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 'var(--radius-md)',
              background: (saving || validItems.length === 0 || grandTotal <= 0)
                ? 'var(--bg-hover)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              cursor: (saving || validItems.length === 0 || grandTotal <= 0) ? 'not-allowed' : 'pointer',
              color: (saving || validItems.length === 0 || grandTotal <= 0) ? 'var(--text-muted)' : '#fff',
              fontSize: 14, fontWeight: 700,
              boxShadow: (validItems.length > 0 && grandTotal > 0 && !saving)
                ? '0 4px 14px rgba(245,158,11,0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Package size={15} />
            {saving
              ? 'Saving…'
              : `Submit & Issue Material${validItems.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
