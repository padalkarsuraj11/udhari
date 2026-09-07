// ============================================================
// BILLS PAGE — Professional Invoice Management
// ============================================================
import { useState, useMemo, useRef } from 'react';
import {
  FileText, Plus, X, Search, AlertTriangle, CheckCircle,
  Clock, Eye, Trash2, Send, Printer, RefreshCw, Home,
  IndianRupee,
} from 'lucide-react';
import {
  useBills, useBill, useContractors, useCustomers,
  createBill, updateBillStatus, useProfile,
} from '../../lib/api';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/format';
import { LoadingState, ErrorState, Select } from '../../components/ui';

// ── Status Config ─────────────────────────────────────────
const STATUS_CFG = {
  draft:     { label: 'Draft',     color: 'var(--text-muted)',  bg: 'rgba(100,116,139,0.15)', icon: FileText    },
  sent:      { label: 'Sent',      color: '#60a5fa',            bg: 'rgba(96,165,250,0.12)',  icon: Send        },
  paid:      { label: 'Paid',      color: 'var(--success)',     bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle },
  overdue:   { label: 'Overdue',   color: 'var(--danger)',      bg: 'rgba(239,68,68,0.12)',   icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'var(--text-muted)',  bg: 'rgba(100,116,139,0.1)', icon: X           },
};
const BILL_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
const TAX_RATES = [0, 5, 12, 18, 28];
const UNITS = ['piece', 'metre', 'kg', 'bag', 'brass', 'set', 'litre', 'box', 'roll', 'sqft'];

function blankItem() {
  return { id: Date.now() + Math.random(), description: '', quantity: '1', unit: 'piece', rate: '' };
}

// Bill is overdue if: not paid, not cancelled, and due date is in the past
function effectiveStatus(b) {
  if (b.status !== 'paid' && b.status !== 'cancelled' && b.dueDate && new Date(b.dueDate) < new Date())
    return 'overdue';
  return b.status;
}

// How much is still left to pay on a bill
function balanceDue(b) {
  return Math.max(0, b.totalAmount - (b.paidAmount || 0));
}

// ── Shared sub-components ─────────────────────────────────
function BillStatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.sent;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

function KpiCard({ label, value, sub, helpText, color, icon: Icon }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, padding: '16px 18px', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '3px solid ' + color,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        {Icon && <Icon size={14} style={{ color, opacity: 0.7 }} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      {helpText && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', fontStyle: 'italic' }}>{helpText}</div>}
    </div>
  );
}

function SectionLabel({ children, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-400)' }}>{children}</div>
      {extra}
    </div>
  );
}

function FormField({ label, required, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 5 }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}

// ── New Bill Drawer ───────────────────────────────────────
function NewBillForm({ contractors, onSuccess, onCancel }) {
  const [contractorId, setContractorId] = useState('');
  const [customerId,   setCustomerId]   = useState('');
  const [billNumber,   setBillNumber]   = useState('');
  const [billDate,     setBillDate]     = useState(new Date().toISOString().split('T')[0]);
  const [dueDate,      setDueDate]      = useState('');
  const [taxRate,      setTaxRate]      = useState(18);
  const [notes,        setNotes]        = useState('');
  const [items,        setItems]        = useState([blankItem()]);
  const [status,       setStatus]       = useState('sent');
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');

  const { data: customers } = useCustomers(contractorId || null);

  // Auto-generate bill number on first render
  useState(() => {
    const yy = String(new Date().getFullYear()).slice(-2);
    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    setBillNumber('BILL-' + yy + mm + '-' + Math.floor(1000 + Math.random() * 9000));
  });

  const subtotal   = items.reduce((s, it) => s + (parseFloat(it.quantity || 0) * parseFloat(it.rate || 0)), 0);
  const taxAmt     = subtotal * (taxRate / 100);
  const totalAmt   = subtotal + taxAmt;
  const validItems = items.filter(it => it.description.trim() && parseFloat(it.rate) > 0);

  function upd(id, k, v)   { setItems(p => p.map(it => it.id === id ? { ...it, [k]: v } : it)); }
  function addItem()        { setItems(p => [...p, blankItem()]); }
  function removeItem(id)   { if (items.length > 1) setItems(p => p.filter(it => it.id !== id)); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!contractorId)      { setErr('Please select a contractor'); return; }
    if (!billNumber.trim()) { setErr('Bill number is required'); return; }
    if (validItems.length === 0) { setErr('Add at least one item with description and rate'); return; }
    setSaving(true); setErr('');
    try {
      await createBill({
        contractor_id: contractorId,
        customer_id:   customerId  || undefined,
        bill_number:   billNumber.trim(),
        bill_date:     billDate,
        due_date:      dueDate     || undefined,
        subtotal, tax_amount: taxAmt, total_amount: totalAmt, status,
        notes: notes.trim() || undefined,
        items: validItems.map(it => ({
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit,
          rate: parseFloat(it.rate),
        })),
      });
      onSuccess();
    } catch (e) { setErr(e.message || 'Failed to create bill'); }
    finally { setSaving(false); }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div style={{ width: '100%', maxWidth: 720, height: '100vh', overflowY: 'auto', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>New Invoice / Bill</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fill in details to generate a formal bill for a contractor</div>
            </div>
          </div>
          <button onClick={onCancel} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 18, fontSize: 13, color: 'var(--danger)' }}>
              <AlertTriangle size={14} /> {err}
            </div>
          )}

          <SectionLabel>Bill To</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <FormField label="Contractor" required>
              <select className="input select" value={contractorId} onChange={e => { setContractorId(e.target.value); setCustomerId(''); }}>
                <option value="">— Select Contractor —</option>
                {(contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Customer / Project" hint="optional">
              <select className="input select" value={customerId} onChange={e => setCustomerId(e.target.value)} disabled={!contractorId}>
                <option value="">— General / All Sites —</option>
                {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
          </div>

          <SectionLabel>Bill Details</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            <FormField label="Bill Number" required>
              <input className="input" value={billNumber} onChange={e => setBillNumber(e.target.value)} />
            </FormField>
            <FormField label="Bill Date">
              <input className="input" type="date" value={billDate} onChange={e => setBillDate(e.target.value)} />
            </FormField>
            <FormField label="Due Date" hint="optional">
              <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </FormField>
            <FormField label="Status">
              <select className="input select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </FormField>
          </div>

          <SectionLabel extra={
            <button type="button" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--accent-400)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={11} /> Add Item
            </button>
          }>
            Line Items (What You're Billing For)
          </SectionLabel>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.2fr 28px', gap: 8, marginBottom: 6, padding: '0 4px' }}>
            {['Description / Item Name', 'Qty', 'Unit', 'Rate (₹)', 'Line Total', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {items.map(item => {
              const lineTotal = parseFloat(item.quantity || 0) * parseFloat(item.rate || 0);
              return (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr 1.2fr 1.2fr 28px', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <input className="input" style={{ margin: 0 }} placeholder="e.g. Cement 53 Grade, Sand, Labour Charges…" value={item.description} onChange={e => upd(item.id, 'description', e.target.value)} />
                  <input className="input" style={{ margin: 0 }} type="number" min="0.01" step="any" placeholder="1" value={item.quantity} onChange={e => upd(item.id, 'quantity', e.target.value)} />
                  <select className="input select" style={{ margin: 0 }} value={item.unit} onChange={e => upd(item.id, 'unit', e.target.value)}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input className="input" style={{ margin: 0 }} type="number" min="0" step="any" placeholder="0" value={item.rate} onChange={e => upd(item.id, 'rate', e.target.value)} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: lineTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'right' }}>{lineTotal > 0 ? formatCurrency(lineTotal) : '—'}</div>
                  <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: items.length === 1 ? 'var(--border)' : 'var(--danger)', cursor: items.length === 1 ? 'default' : 'pointer', padding: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Totals + Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <FormField label="Notes / Payment Terms">
              <textarea className="input" style={{ height: 80, resize: 'none', fontSize: 12 }} placeholder="e.g. Payment due within 15 days. GST applicable." value={notes} onChange={e => setNotes(e.target.value)} />
            </FormField>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Subtotal (before tax)</span><span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>GST Tax</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', padding: '2px 6px', fontSize: 12, cursor: 'pointer' }}>
                    {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(taxAmt)}</span>
                </div>
              </div>
              <div style={{ borderTop: '2px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Grand Total</span>
                <span style={{ fontWeight: 900, fontSize: 20, color: 'var(--accent-400)' }}>{formatCurrency(totalAmt)}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>{validItems.length} item{validItems.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
            <button
              type="submit"
              disabled={saving || validItems.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 'var(--radius-md)',
                background: (saving || validItems.length === 0) ? 'var(--bg-hover)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
                border: 'none',
                color: (saving || validItems.length === 0) ? 'var(--text-muted)' : '#fff',
                fontWeight: 800, fontSize: 14,
                cursor: (saving || validItems.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: (validItems.length > 0 && !saving) ? '0 4px 16px rgba(245,158,11,0.4)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <FileText size={15} />
              {saving ? 'Generating…' : 'Generate Bill' + (totalAmt > 0 ? ' · ' + formatCurrency(totalAmt) : '')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bill Detail Drawer ────────────────────────────────────
function BillDetailDrawer({ billId, onClose, onStatusChange, businessName }) {
  const { data, loading, error, refetch } = useBill(billId);
  const printRef = useRef(null);
  const bill  = data?.bill;
  const items = data?.items || [];

  const isOverdue = bill && bill.status !== 'paid' && bill.status !== 'cancelled'
    && bill.dueDate && new Date(bill.dueDate) < new Date();
  const effStatus = (isOverdue && bill?.status === 'sent') ? 'overdue' : bill?.status;

  // Fix: always compute balance = totalAmount - paidAmount
  const billBalance = bill ? Math.max(0, bill.totalAmount - (bill.paidAmount || 0)) : 0;
  const isFullyPaid = bill?.status === 'paid' || billBalance === 0;

  const NEXT_ACTIONS = {
    draft:     [{ label: '📤 Mark as Sent', status: 'sent',  grad: 'linear-gradient(135deg,#60a5fa,#3b82f6)' }],
    sent:      [{ label: '✅ Mark as Paid', status: 'paid',  grad: 'linear-gradient(135deg,#22c55e,#16a34a)' }],
    paid:      [{ label: '↩ Reopen (Sent)',status: 'sent',  grad: 'var(--bg-hover)'                         }],
    overdue:   [{ label: '✅ Mark as Paid', status: 'paid',  grad: 'linear-gradient(135deg,#22c55e,#16a34a)' }],
    cancelled: [{ label: '↩ Reopen Draft', status: 'draft', grad: 'var(--bg-hover)'                         }],
  };

  function handlePrint() {
    const c = printRef.current; if (!c) return;
    const w = window.open('', '_blank', 'width=820,height=900');
    w.document.write(`<html><head><title>${bill?.billNumber || 'Bill'}</title><style>
      *{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;padding:40px;}
      .logo{font-size:22px;font-weight:800;color:#d97706;}hr{border:none;border-top:1px solid #e2e8f0;margin:18px 0;}
      table{width:100%;border-collapse:collapse;margin:18px 0;}
      th{background:#f8fafc;padding:9px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;text-align:left;}
      th:nth-child(n+5),td:nth-child(n+5){text-align:right;}
      td{padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;}
      .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;}
      .footer{margin-top:40px;text-align:center;font-size:11px;color:#94a3b8;}
    </style></head><body>${c.innerHTML}<div class="footer">Generated by Udhari Platform · ${new Date().toLocaleDateString('en-IN')}</div></body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); w.close(); }, 600);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 660, height: '100vh', overflowY: 'auto', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)' }}>
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={16} style={{ color: 'var(--accent-400)' }} />
            <div style={{ fontWeight: 700, fontSize: 15 }}>{loading ? 'Loading…' : bill?.billNumber || 'Bill Detail'}</div>
            {bill && <BillStatusBadge status={effStatus} />}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {bill && (
              <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Printer size={13} /> Print / PDF
              </button>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {loading ? <LoadingState message="Loading bill details…" /> : error ? <ErrorState message={error} onRetry={refetch} /> : !bill ? <ErrorState message="Bill not found" /> : (
          <div style={{ padding: 24 }}>
            {/* Overdue warning */}
            {isOverdue && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--danger)' }}>
                <AlertTriangle size={14} /> This bill is overdue — it was due on <strong style={{ marginLeft: 4 }}>{formatDate(bill.dueDate)}</strong>. Please collect payment.
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 14px', marginBottom: 20, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Update Status:</span>
              {(NEXT_ACTIONS[bill.status] || []).map(a => (
                <button key={a.status}
                  onClick={() => { onStatusChange(bill.id, a.status); setTimeout(refetch, 400); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: a.grad, color: (a.status === 'paid' || a.status === 'sent') ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: a.status === 'paid' ? '0 3px 10px rgba(34,197,94,0.35)' : a.status === 'sent' ? '0 3px 10px rgba(59,130,246,0.3)' : 'none' }}>
                  {a.label}
                </button>
              ))}
              {bill.status !== 'cancelled' && (
                <button
                  onClick={() => { onStatusChange(bill.id, 'cancelled'); setTimeout(refetch, 400); }}
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <X size={11} /> Cancel Bill
                </button>
              )}
            </div>

            {/* Printable Bill Content */}
            <div ref={printRef}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div className="logo" style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-400)', marginBottom: 4 }}>{businessName || 'Your Business'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supplier & Trade Credit Platform</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{bill.billNumber}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Issued: {formatDate(bill.date)}</div>
                  {bill.dueDate && <div style={{ fontSize: 12, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400, marginTop: 2 }}>Due: {formatDate(bill.dueDate)}{isOverdue ? ' ⚠️' : ''}</div>}
                  <div style={{ marginTop: 6 }}><BillStatusBadge status={effStatus} /></div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', marginBottom: 20 }} />

              {/* Bill To */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Bill To</div>
                <div style={{ display: 'flex', gap: 32 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{bill.contractor?.name || bill.contractorName}</div>
                    {bill.contractor?.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📞 {bill.contractor.phone}</div>}
                    {bill.contractor?.city  && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {bill.contractor.city}</div>}
                  </div>
                  {bill.customerName && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Project / Site</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{bill.customerName}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)' }}>
                      {['#', 'Item / Description', 'Qty', 'Unit', 'Rate per Unit', 'Line Total'].map((h, i) => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: i >= 4 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>No line items recorded</td></tr>
                    ) : items.map((item, idx) => {
                      // Fix: use stored amount, or compute from qty × rate as fallback
                      const lineAmt = item.amount > 0 ? item.amount : (item.quantity * item.rate);
                      return (
                        <tr key={item.id} style={{ borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', width: 30 }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500 }}>{item.description}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>{item.quantity}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{item.unit}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{formatCurrency(lineAmt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals — Fix: show balance correctly */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>Subtotal (before tax)</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(bill.subtotal)}</span>
                  </div>
                  {bill.taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span>GST ({bill.subtotal > 0 ? Math.round((bill.taxAmount / bill.subtotal) * 100) : 0}%)</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(bill.taxAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <span style={{ fontWeight: 700 }}>Grand Total</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(bill.totalAmount)}</span>
                  </div>
                  {bill.paidAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--success)' }}>
                      <span>Amount Paid</span>
                      <span style={{ fontWeight: 600 }}>−{formatCurrency(bill.paidAmount)}</span>
                    </div>
                  )}
                  {/* Fix: "Balance Due" = totalAmount - paidAmount */}
                  <div style={{ borderTop: '2px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>
                      {isFullyPaid ? 'Total Paid' : 'Balance to Collect'}
                    </span>
                    <span style={{ fontWeight: 900, fontSize: 22, color: isFullyPaid ? 'var(--success)' : 'var(--accent-400)' }}>
                      {formatCurrency(isFullyPaid ? bill.totalAmount : billBalance)}
                    </span>
                  </div>
                  {isFullyPaid && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 'var(--radius-md)', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
                      <CheckCircle size={14} /> FULLY PAID — Nothing Pending
                    </div>
                  )}
                </div>
              </div>

              {bill.notes && (
                <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes / Terms</div>
                  {bill.notes}
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Created {formatRelativeDate(bill.createdAt)} · ID: {bill.id?.slice(0, 8)}…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════
export default function BillsPage() {
  const { data: bills, loading, error, refetch } = useBills();
  const { data: contractors }  = useContractors();
  const { data: profileData }  = useProfile();
  const businessName = profileData?.business_name || profileData?.name || 'Your Business';

  const [showNewForm,   setShowNewForm]   = useState(false);
  const [viewingBillId, setViewingBillId] = useState(null);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [conFilter,     setConFilter]     = useState('');

  const list = bills || [];

  const filtered = useMemo(() => list.filter(b => {
    const eff = effectiveStatus(b);
    const matchSearch  = !search       || b.billNumber?.toLowerCase().includes(search.toLowerCase()) || b.contractorName?.toLowerCase().includes(search.toLowerCase()) || (b.customerName || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus  = !statusFilter || eff === statusFilter;
    const matchCon     = !conFilter    || b.contractorId === conFilter;
    return matchSearch && matchStatus && matchCon;
  }), [list, search, statusFilter, conFilter]);

  // Fix: accurate KPI calculations
  const kpis = useMemo(() => {
    // Total invoiced = sum of all bill totals (regardless of status)
    const totalInvoiced = list.reduce((s, b) => s + b.totalAmount, 0);

    // Collected = sum of paidAmount across all bills (what was actually received)
    const collected = list.reduce((s, b) => s + (b.paidAmount || 0), 0);

    // Pending = sum of balance due on all non-paid, non-cancelled bills
    const pendingBills = list.filter(b => !['paid', 'cancelled'].includes(effectiveStatus(b)));
    const pending = pendingBills.reduce((s, b) => s + balanceDue(b), 0);

    // Overdue = bills past due date that aren't paid/cancelled
    const overdueBills = list.filter(b => effectiveStatus(b) === 'overdue');
    const overdueAmt = overdueBills.reduce((s, b) => s + balanceDue(b), 0);

    return {
      totalInvoiced,
      collected,
      pending,
      overdueAmt,
      overdueCount: overdueBills.length,
      pendingCount: pendingBills.length,
    };
  }, [list]);

  async function handleStatusChange(id, newStatus) {
    try { await updateBillStatus(id, newStatus); refetch(); }
    catch (e) { console.error('Status update failed:', e); }
  }

  const NEXT_ROW = {
    draft:     [{ label: '📤 Mark Sent', status: 'sent'      }, { label: '❌ Cancel', status: 'cancelled' }],
    sent:      [{ label: '✅ Mark Paid', status: 'paid'      }, { label: '❌ Cancel', status: 'cancelled' }],
    paid:      [{ label: '↩ Reopen',    status: 'sent'      }],
    overdue:   [{ label: '✅ Mark Paid', status: 'paid'      }, { label: '❌ Cancel', status: 'cancelled' }],
    cancelled: [{ label: '↩ Reopen',    status: 'draft'     }],
  };

  const statusOptions = BILL_STATUSES.map(s => ({ value: s, label: STATUS_CFG[s]?.label || s }));
  const conOptions    = (contractors || []).map(c => ({ value: c.id, label: c.name }));

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Invoices & Bills</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${list.length} bill${list.length !== 1 ? 's' : ''} · ${formatCurrency(kpis.totalInvoiced)} total invoiced`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={refetch} title="Refresh"><RefreshCw size={13} /></button>
          <button
            onClick={() => setShowNewForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 3px 12px rgba(245,158,11,0.4)', transition: 'all 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(245,158,11,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = '0 3px 12px rgba(245,158,11,0.4)'; }}
          >
            <Plus size={14} /> Generate Invoice
          </button>
        </div>
      </div>

      {/* KPI Row — Fix: all accurate now */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard
            label="Total Invoiced"
            value={formatCurrency(kpis.totalInvoiced, true)}
            sub={`${list.length} bill${list.length !== 1 ? 's' : ''} created`}
            helpText="Sum of all bills regardless of payment status"
            color="#6366f1"
            icon={FileText}
          />
          <KpiCard
            label="Amount Collected"
            value={formatCurrency(kpis.collected, true)}
            sub={`${list.filter(b => b.status === 'paid').length} fully paid`}
            helpText="Actual amount received from all bills"
            color="var(--success)"
            icon={CheckCircle}
          />
          <KpiCard
            label="Pending to Collect"
            value={formatCurrency(kpis.pending, true)}
            sub={`${kpis.pendingCount} open bill${kpis.pendingCount !== 1 ? 's' : ''}`}
            helpText="Balance left to collect from sent/open bills"
            color="var(--warning)"
            icon={IndianRupee}
          />
          <KpiCard
            label="Overdue Bills"
            value={formatCurrency(kpis.overdueAmt, true)}
            sub={kpis.overdueCount > 0 ? `${kpis.overdueCount} past due date — urgent` : 'None overdue ✓'}
            helpText="Bills whose due date has already passed"
            color={kpis.overdueCount > 0 ? 'var(--danger)' : 'var(--success)'}
            icon={kpis.overdueCount > 0 ? AlertTriangle : CheckCircle}
          />
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrapper" style={{ flex: 1, minWidth: 200 }}>
            <Search size={14} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
            <input type="text" className="input search-input" placeholder="Search bill number, contractor, project…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions} placeholder="All Statuses"    style={{ width: 150 }} />
          <Select value={conFilter}    onChange={setConFilter}    options={conOptions}    placeholder="All Contractors" style={{ width: 180 }} />
          {(search || statusFilter || conFilter) && <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); setConFilter(''); }}>Clear</button>}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>Showing {filtered.length} of {list.length}</div>
        </div>
      </div>

      {/* Status Quick-Filter Pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[{ value: '', label: 'All (' + list.length + ')' }, ...BILL_STATUSES.map(s => {
          const count = list.filter(b => effectiveStatus(b) === s).length;
          return { value: s, label: `${STATUS_CFG[s]?.label} (${count})` };
        })].map(opt => {
          const isActive = statusFilter === opt.value;
          const cfg = opt.value ? STATUS_CFG[opt.value] : null;
          return (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)} style={{ padding: '4px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all var(--transition)', background: isActive ? (cfg?.bg || 'var(--accent-600)') : 'transparent', borderColor: isActive ? (cfg?.color || 'var(--accent-400)') : 'var(--border)', color: isActive ? (cfg?.color || '#fff') : 'var(--text-muted)' }}>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Bills Table */}
      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">All Invoices</div>
            <div className="table-toolbar-subtitle">Click "View" to see full details, print a PDF, or update payment status</div>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading invoices…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <FileText size={40} style={{ marginBottom: 16, opacity: 0.15 }} />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{list.length === 0 ? 'No invoices yet' : 'No bills match your filters'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{list.length === 0 ? 'Click "Generate Invoice" to create your first formal bill.' : 'Try adjusting your search or filter criteria.'}</div>
            {list.length === 0 && (
              <button onClick={() => setShowNewForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 3px 10px rgba(245,158,11,0.35)' }}>
                <Plus size={14} /> Generate First Invoice
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Contractor / Project</th>
                <th style={{ textAlign: 'right' }}>Bill Amount</th>
                <th style={{ textAlign: 'right' }}>Balance to Collect</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const eff     = effectiveStatus(b);
                const isOver  = eff === 'overdue';
                const bal     = balanceDue(b);
                const actions = NEXT_ROW[b.status] || [];
                return (
                  <tr key={b.id} style={{ cursor: 'pointer', transition: 'background var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td onClick={() => setViewingBillId(b.id)}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-400)' }}>{b.billNumber}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{formatRelativeDate(b.date)}</div>
                    </td>
                    <td onClick={() => setViewingBillId(b.id)}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{b.contractorName}</div>
                      {b.customerName && <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}><Home size={9} />{b.customerName}</div>}
                    </td>
                    <td onClick={() => setViewingBillId(b.id)} style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{formatCurrency(b.totalAmount)}</div>
                      {b.taxAmount > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>incl. {formatCurrency(b.taxAmount)} GST</div>}
                    </td>
                    <td onClick={() => setViewingBillId(b.id)} style={{ textAlign: 'right' }}>
                      {b.status === 'paid' ? (
                        <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 13 }}>✓ Collected</span>
                      ) : b.status === 'cancelled' ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 700, color: isOver ? 'var(--danger)' : 'var(--warning)' }}>{formatCurrency(bal)}</div>
                          {b.paidAmount > 0 && <div style={{ fontSize: 10, color: 'var(--success)' }}>{formatCurrency(b.paidAmount)} paid</div>}
                        </div>
                      )}
                    </td>
                    <td onClick={() => setViewingBillId(b.id)}>
                      <div>{formatDate(b.date)}</div>
                      {b.dueDate && <div style={{ fontSize: 10, color: isOver ? 'var(--danger)' : 'var(--text-muted)', marginTop: 1 }}>Due: {formatDate(b.dueDate)}{isOver ? ' ⚠' : ''}</div>}
                    </td>
                    <td onClick={() => setViewingBillId(b.id)}><BillStatusBadge status={eff} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button onClick={() => setViewingBillId(b.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          <Eye size={11} /> View
                        </button>
                        {actions.map(a => (
                          <button key={a.status} onClick={() => handleStatusChange(b.id, a.status)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                            background: a.status === 'paid' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : a.status === 'sent' ? 'linear-gradient(135deg,#60a5fa,#3b82f6)' : a.status === 'cancelled' ? 'rgba(239,68,68,0.12)' : 'var(--bg-hover)',
                            color: (a.status === 'paid' || a.status === 'sent') ? '#fff' : a.status === 'cancelled' ? 'var(--danger)' : 'var(--text-secondary)',
                            boxShadow: a.status === 'paid' ? '0 2px 8px rgba(34,197,94,0.3)' : a.status === 'sent' ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
                          }}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="table-footer">
            <span>Balance to collect from filtered bills: <strong style={{ color: 'var(--warning)' }}>{formatCurrency(filtered.filter(b => !['paid','cancelled'].includes(effectiveStatus(b))).reduce((s, b) => s + balanceDue(b), 0))}</strong></span>
            <span>{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* New Bill Drawer */}
      {showNewForm && (
        <NewBillForm
          contractors={contractors}
          onSuccess={() => { setShowNewForm(false); refetch(); }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {/* Bill Detail Drawer */}
      {viewingBillId && (
        <BillDetailDrawer
          billId={viewingBillId}
          businessName={businessName}
          onClose={() => setViewingBillId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}