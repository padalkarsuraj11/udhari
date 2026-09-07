// ============================================================
// CUSTOMER LEDGER — Full transaction/payment drill-down
// Route: /contractors/:contractorId/customers/:customerId
//
// UX: Action-first, no confusing tabs, clear flow.
// Owner can: Pay Total Outstanding | Add Materials | See full history
// ============================================================

import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Clock, IndianRupee,
  Package, CreditCard, AlertTriangle, Plus,
  CheckCircle, ChevronDown, ChevronUp, History,
  Zap,
} from 'lucide-react';
import { useCustomer, recordPayment } from '../../lib/api';
import { formatCurrency, formatDate, formatRelativeDate } from '../../utils/format';
import { StatusBadge, LoadingState, ErrorState } from '../../components/ui';
import { AssignMaterialToCustomerModal } from '../../components/modals';

// ── Breadcrumb ────────────────────────────────────────────
function Breadcrumb({ contractorId, contractorName, customerName }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      fontSize: 12, color: 'var(--text-muted)', marginBottom: 16,
    }}>
      <Link to="/contractors" style={{ color: 'var(--text-muted)' }}>Contractors</Link>
      <ChevronRight size={12} />
      <Link to={`/contractors/${contractorId}`} style={{ color: 'var(--accent-400)', fontWeight: 600 }}>
        {contractorName || 'Contractor'}
      </Link>
      <ChevronRight size={12} />
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{customerName}</span>
      <ChevronRight size={12} />
      <span>Ledger</span>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────
function KpiCard({ label, value, color, icon: Icon, sub, helpText }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
        {Icon && <Icon size={14} style={{ color, opacity: 0.7 }} />}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      {helpText && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', fontStyle: 'italic' }}>
          {helpText}
        </div>
      )}
    </div>
  );
}

// ── Quick Pay All Panel ── pays total outstanding without needing a specific transaction
function QuickPayAllPanel({ customer, contractorId, onSuccess, onCancel }) {
  const totalOutstanding = customer.outstanding || 0;
  const [amount,  setAmount]  = useState(String(totalOutstanding));
  const [method,  setMethod]  = useState('cash');
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [ref,     setRef]     = useState('');
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const amt = parseFloat(amount || 0);
  const remaining = Math.max(0, totalOutstanding - amt);
  const isFullPayment = amt >= totalOutstanding && amt > 0;

  const METHODS = [
    { value: 'cash',          label: '💵 Cash'          },
    { value: 'upi',           label: '📱 UPI'           },
    { value: 'bank_transfer', label: '🏦 Bank Transfer' },
    { value: 'cheque',        label: '📄 Cheque'        },
    { value: 'other',         label: 'Other'            },
  ];

  async function handlePay(e) {
    e.preventDefault();
    if (!amt || amt <= 0) { setErr('Enter a valid amount'); return; }
    if (amt > totalOutstanding + 0.01) { setErr(`Amount cannot exceed outstanding ₹${totalOutstanding.toLocaleString('en-IN')}`); return; }
    setSaving(true); setErr('');
    try {
      // Send payment without transaction_id → applies to the whole customer account
      await recordPayment({
        contractor_id:  contractorId,
        customer_id:    customer.id,
        amount:         amt,
        payment_method: method,
        payment_date:   date,
        reference:      ref.trim()   || undefined,
        notes:          notes.trim() || undefined,
      });
      onSuccess();
    } catch (e) {
      setErr(e.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: 'rgba(34,197,94,0.05)',
      border: '2px solid rgba(34,197,94,0.25)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
      marginBottom: 20,
      animation: 'slideUp 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Zap size={15} style={{ color: 'var(--success)' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Quick Pay — Full Account Settlement
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          Total outstanding: <strong style={{ color: 'var(--warning)' }}>₹{totalOutstanding.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {err && (
        <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 12 }}>
          ⚠ {err}
        </div>
      )}

      <form onSubmit={handlePay}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Amount */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              How much was paid? (₹) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              className="input"
              type="number"
              min="1"
              max={totalOutstanding}
              step="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 500, 1000, 5000…"
              autoFocus
              style={{ fontWeight: 700, fontSize: 16 }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
              <button type="button" onClick={() => setAmount(String(totalOutstanding))}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', cursor: 'pointer', fontWeight: 600 }}>
                Clear Full (₹{totalOutstanding.toLocaleString('en-IN')})
              </button>
            </div>
          </div>

          {/* Method */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Payment Method
            </label>
            <select className="input select" value={method} onChange={e => setMethod(e.target.value)}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Payment Date
            </label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Reference / Cheque No. (optional)</label>
            <input className="input" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. UPI ref, cheque no." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Notes (optional)</label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Final settlement" />
          </div>
        </div>

        {/* Balance preview */}
        {amt > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: isFullPayment ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isFullPayment ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
            borderRadius: 'var(--radius-md)', padding: '8px 14px', marginBottom: 14, fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Balance after this payment:</span>
            <strong style={{ fontSize: 16, color: isFullPayment ? 'var(--success)' : 'var(--warning)' }}>
              {isFullPayment ? '✓ FULLY CLEARED' : `₹${remaining.toLocaleString('en-IN')} remaining`}
            </strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !amt || amt <= 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 22px', borderRadius: 'var(--radius-md)',
              background: saving || !amt || amt <= 0 ? 'var(--bg-hover)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              cursor: saving || !amt || amt <= 0 ? 'not-allowed' : 'pointer',
              color: saving || !amt || amt <= 0 ? 'var(--text-muted)' : '#fff',
              fontWeight: 700, fontSize: 14,
              boxShadow: amt > 0 && !saving ? '0 4px 14px rgba(34,197,94,0.4)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <CheckCircle size={15} />
            {saving ? 'Saving…' : `Record ₹${amt > 0 ? amt.toLocaleString('en-IN') : '0'} Payment`}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Inline Pay Panel — appears below each transaction row ─
function InlinePayPanel({ txn, customer, contractorId, onSuccess, onCancel }) {
  const [amount,  setAmount]  = useState(String(txn.outstanding || ''));
  const [method,  setMethod]  = useState('cash');
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [ref,     setRef]     = useState('');
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const amt = parseFloat(amount || 0);
  const remaining = Math.max(0, (txn.outstanding || 0) - amt);
  const isFullPayment = amt >= (txn.outstanding || 0) && amt > 0;

  const METHODS = [
    { value: 'cash',          label: '💵 Cash'          },
    { value: 'upi',           label: '📱 UPI'           },
    { value: 'bank_transfer', label: '🏦 Bank Transfer' },
    { value: 'cheque',        label: '📄 Cheque'        },
    { value: 'other',         label: 'Other'            },
  ];

  async function handlePay(e) {
    e.preventDefault();
    if (!amt || amt <= 0) { setErr('Enter a valid amount'); return; }
    if (amt > (txn.outstanding || 0) + 1) { setErr(`Amount cannot exceed outstanding ₹${(txn.outstanding || 0).toLocaleString('en-IN')}`); return; }
    setSaving(true); setErr('');
    try {
      await recordPayment({
        contractor_id:  contractorId,
        customer_id:    customer.id,
        transaction_id: txn.id,
        amount:         amt,
        payment_method: method,
        payment_date:   date,
        reference:      ref.trim() || undefined,
        notes:          notes.trim() || undefined,
      });
      onSuccess();
    } catch (e) {
      setErr(e.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: 'rgba(34,197,94,0.05)',
      border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 18px',
      marginTop: 8,
      animation: 'slideUp 0.15s ease',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        💰 Record Payment — {txn.description?.split('\n')[0] || 'Material Issued'}
      </div>
      {err && (
        <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 10 }}>
          ⚠ {err}
        </div>
      )}
      <form onSubmit={handlePay}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Amount (₹) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              className="input"
              type="number"
              min="1"
              max={txn.outstanding}
              step="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Max ₹${(txn.outstanding || 0).toLocaleString('en-IN')}`}
              autoFocus
              style={{ fontWeight: 700, fontSize: 15 }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
              <button type="button" onClick={() => setAmount(String(txn.outstanding))}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', cursor: 'pointer', fontWeight: 600 }}>
                Full ₹{(txn.outstanding || 0).toLocaleString('en-IN')}
              </button>
              {txn.outstanding > 1000 && (
                <button type="button" onClick={() => setAmount(String(Math.round((txn.outstanding || 0) / 2)))}
                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
                  Half
                </button>
              )}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Payment Method
            </label>
            <select className="input select" value={method} onChange={e => setMethod(e.target.value)}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Payment Date
            </label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Reference / Cheque No. (optional)</label>
            <input className="input" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. UPI ref, cheque no." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>Notes (optional)</label>
            <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 2nd installment" />
          </div>
        </div>

        {amt > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: isFullPayment ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isFullPayment ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
            borderRadius: 'var(--radius-md)', padding: '8px 14px', marginBottom: 12, fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Balance after this payment:</span>
            <strong style={{ fontSize: 16, color: isFullPayment ? 'var(--success)' : 'var(--warning)' }}>
              {isFullPayment ? '✓ FULLY CLEARED' : `₹${remaining.toLocaleString('en-IN')} remaining`}
            </strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
          <button
            type="submit"
            disabled={saving || !amt || amt <= 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 'var(--radius-md)',
              background: saving || !amt || amt <= 0 ? 'var(--bg-hover)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              cursor: saving || !amt || amt <= 0 ? 'not-allowed' : 'pointer',
              color: saving || !amt || amt <= 0 ? 'var(--text-muted)' : '#fff',
              fontWeight: 700, fontSize: 13,
              boxShadow: amt > 0 && !saving ? '0 3px 10px rgba(34,197,94,0.35)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <CheckCircle size={14} />
            {saving ? 'Saving…' : `Record ₹${amt > 0 ? amt.toLocaleString('en-IN') : '0'} Payment`}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Transaction Card — one entry with inline Pay button ───
function TransactionCard({ txn, customer, contractorId, onPaymentSuccess }) {
  const [showPay,     setShowPay]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const isOverdue = txn.status === 'overdue' || (
    ['outstanding', 'partial'].includes(txn.status) &&
    txn.dueDate && new Date(txn.dueDate) < new Date()
  );
  const isPaid    = txn.outstanding === 0;
  const daysDue   = txn.dueDate ? Math.max(0, Math.floor((new Date() - new Date(txn.dueDate)) / 86400000)) : 0;

  const lines = (txn.description || '').split('\n').filter(Boolean);

  const statusColor = isPaid ? 'var(--success)' : isOverdue ? 'var(--danger)' : 'var(--warning)';
  const leftBorder  = isPaid ? 'rgba(34,197,94,0.5)' : isOverdue ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)';

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${leftBorder}`,
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-card)',
      marginBottom: 10,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s ease',
    }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {/* Left: date + materials summary */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{formatDate(txn.date)}</span>
              <StatusBadge status={isOverdue && !isPaid ? 'overdue' : txn.status} />
              {isOverdue && daysDue > 0 && !isPaid && (
                <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={9} /> {daysDue}d overdue
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {lines.length === 0 && <span>Material Issued</span>}
              {lines.length === 1 && <span style={{ fontWeight: 500 }}>{lines[0]}</span>}
              {lines.length > 1 && (
                <>
                  <span style={{ fontWeight: 500 }}>{lines[0]}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>
                    +{lines.length - 1} more item{lines.length > 2 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
            {txn.notes && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>📝 {txn.notes}</div>
            )}
          </div>

          {/* Right: amounts + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatCurrency(txn.amount)}
              </div>
            </div>
            {txn.advance > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Advance</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>
                  {formatCurrency(txn.advance)}
                </div>
              </div>
            )}
            <div style={{ textAlign: 'right', minWidth: 90 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isPaid ? 'Status' : 'Balance Due'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: statusColor }}>
                {isPaid ? '✓ Paid' : formatCurrency(txn.outstanding)}
              </div>
              {txn.dueDate && !isPaid && (
                <div style={{ fontSize: 10, color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', marginTop: 2 }}>
                  Due: {formatDate(txn.dueDate)}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              {!isPaid && !showPay && (
                <button
                  onClick={() => setShowPay(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none', color: '#fff', fontWeight: 700, fontSize: 12,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(34,197,94,0.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(34,197,94,0.35)'; }}
                >
                  <CreditCard size={13} /> Record Payment
                </button>
              )}
              {showPay && (
                <button
                  onClick={() => setShowPay(false)}
                  style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '5px 10px', cursor: 'pointer' }}
                >
                  ✕ Cancel
                </button>
              )}
              <button
                onClick={() => setShowHistory(p => !p)}
                style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: 0 }}
              >
                <History size={11} />
                {showHistory ? 'Hide' : 'Show'} details
                {showHistory ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Pay Panel */}
      {showPay && (
        <div style={{ padding: '0 16px 16px' }}>
          <InlinePayPanel
            txn={txn}
            customer={customer}
            contractorId={contractorId}
            onSuccess={() => { setShowPay(false); onPaymentSuccess(); }}
            onCancel={() => setShowPay(false)}
          />
        </div>
      )}

      {/* Detail expand */}
      {showHistory && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 16px',
          background: 'var(--bg-surface)',
        }}>
          {lines.length > 0 ? (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Materials Issued
              </div>
              {lines.map((line, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '3px 0', borderBottom: i < lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {line}
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 24, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>Issued: <strong style={{ color: 'var(--text-secondary)' }}>{formatDate(txn.date)}</strong></span>
            {txn.dueDate && <span>Due: <strong style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>{formatDate(txn.dueDate)}</strong></span>}
            <span>Total: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(txn.amount)}</strong></span>
            {txn.advance > 0 && <span>Advance: <strong style={{ color: 'var(--success)' }}>{formatCurrency(txn.advance)}</strong></span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payment History Row ───────────────────────────────────
function PaymentHistoryItem({ p }) {
  const METHOD_ICONS   = { cash: '💵', upi: '📱', bank_transfer: '🏦', cheque: '📄' };
  const METHOD_LABELS  = { cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque', other: 'Other' };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(34,197,94,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
          {METHOD_ICONS[p.method] || '💰'}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--success)' }}>
            +{formatCurrency(p.amount)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            {formatDate(p.date)} · Paid via {METHOD_LABELS[p.method] || 'Cash'}
            {p.reference && ` · Ref: ${p.reference}`}
          </div>
        </div>
      </div>
      {p.notes && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, textAlign: 'right' }}>{p.notes}</div>
      )}
    </div>
  );
}

// ── Outstanding Banner — with "Pay Total" CTA ─────────────
function OutstandingBanner({ outstanding, overdue, onPayAll, showingPayAll }) {
  if (outstanding <= 0) {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: 'var(--radius-md)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
      }}>
        <span style={{ fontSize: 22 }}>✅</span>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>All Clear — No Outstanding Balance</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>All material charges have been fully settled.</div>
        </div>
      </div>
    );
  }

  const isOverdue = overdue > 0;
  return (
    <div style={{
      background: isOverdue ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
      border: `2px solid ${isOverdue ? 'rgba(239,68,68,0.35)' : 'rgba(234,179,8,0.35)'}`,
      borderRadius: 'var(--radius-md)', padding: '14px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 14, marginBottom: showingPayAll ? 0 : 20,
      borderBottomLeftRadius: showingPayAll ? 0 : undefined,
      borderBottomRightRadius: showingPayAll ? 0 : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isOverdue
            ? <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            : <Clock size={22} style={{ color: 'var(--warning)' }} />}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: isOverdue ? 'var(--danger)' : 'var(--warning)' }}>
            {isOverdue ? '⚠ Overdue Payment' : '⏳ Payment Pending'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {isOverdue
              ? `₹${overdue.toLocaleString('en-IN')} is overdue · Total outstanding: ₹${outstanding.toLocaleString('en-IN')}`
              : `₹${outstanding.toLocaleString('en-IN')} pending — pay full or partial below`}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: isOverdue ? 'var(--danger)' : 'var(--warning)', lineHeight: 1 }}>
            {formatCurrency(outstanding)}
          </div>
        </div>

        {/* THE NEW PAY TOTAL BUTTON */}
        <button
          onClick={onPayAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '11px 20px', borderRadius: 'var(--radius-md)',
            background: showingPayAll ? 'var(--bg-hover)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: showingPayAll ? '1px solid var(--border)' : 'none',
            color: showingPayAll ? 'var(--text-secondary)' : '#fff',
            fontWeight: 700, fontSize: 13,
            cursor: 'pointer',
            boxShadow: showingPayAll ? 'none' : '0 4px 16px rgba(34,197,94,0.4)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!showingPayAll) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(34,197,94,0.5)'; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = showingPayAll ? 'none' : '0 4px 16px rgba(34,197,94,0.4)'; }}
        >
          {showingPayAll ? (
            <><ChevronUp size={14} /> Hide Payment</>
          ) : (
            <><Zap size={14} /> Pay ₹{outstanding.toLocaleString('en-IN')} Now</>
          )}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════
export default function CustomerLedger() {
  const { contractorId, customerId } = useParams();
  const { data, loading, error, refetch } = useCustomer(customerId);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPayments,    setShowPayments]    = useState(false);
  const [showQuickPayAll, setShowQuickPayAll] = useState(false);

  // ── All hooks MUST come before any conditional return ──
  const customer     = data?.customer;
  const transactions = data?.transactions || [];
  const payments     = data?.payments     || [];

  const enrichedTxns = useMemo(() =>
    transactions.map(t => ({
      ...t,
      paid: Math.max(0, t.amount - (t.advance || 0) - (t.outstanding || 0)),
    })),
  [transactions]);

  const totalPaymentsAmount = payments.reduce((s, p) => s + p.amount, 0);
  const pendingTxns  = enrichedTxns.filter(t => t.outstanding > 0);
  const settledTxns  = enrichedTxns.filter(t => t.outstanding === 0);

  // ── Early returns AFTER hooks ──
  if (loading) return <LoadingState message="Loading customer ledger…" />;
  if (error)   return <ErrorState  message={error} onRetry={refetch} />;

  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2 style={{ marginBottom: 8 }}>Customer Not Found</h2>
        <Link to={`/contractors/${contractorId}`} className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>
    );
  }

  function handlePayAllSuccess() {
    setShowQuickPayAll(false);
    refetch();
  }

  return (
    <div>
      <Breadcrumb
        contractorId={contractorId}
        contractorName={customer.contractorName}
        customerName={customer.name}
      />

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 5 }}>{customer.name}</h1>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap', alignItems: 'center' }}>
              {customer.type && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(148,163,184,0.12)', color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {customer.type}
                </span>
              )}
              {customer.address && <span>📍 {customer.address}</span>}
              <span>Under: <strong style={{ color: 'var(--accent-400)' }}>{customer.contractorName}</strong></span>
              <span>Added {formatRelativeDate(customer.createdAt)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={`/contractors/${contractorId}`} className="btn btn-ghost btn-sm">
              <ArrowLeft size={13} /> Back
            </Link>
            <button
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none', color: '#fff', fontWeight: 700,
                boxShadow: '0 3px 10px rgba(245,158,11,0.35)',
              }}
              onClick={() => setShowAssignModal(true)}
            >
              <Package size={13} /> Add Materials
            </button>
          </div>
        </div>
      </div>

      {/* ── Outstanding Banner with Pay Now ── */}
      <OutstandingBanner
        outstanding={customer.outstanding || 0}
        overdue={customer.overdue || 0}
        onPayAll={() => setShowQuickPayAll(p => !p)}
        showingPayAll={showQuickPayAll}
      />

      {/* ── Quick Pay All Panel (slides in below banner) ── */}
      {showQuickPayAll && customer.outstanding > 0 && (
        <div style={{
          border: '2px solid rgba(34,197,94,0.25)',
          borderTop: 'none',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          padding: '0 0 4px 0',
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '0 20px 16px' }}>
            <QuickPayAllPanel
              customer={customer}
              contractorId={contractorId}
              onSuccess={handlePayAllSuccess}
              onCancel={() => setShowQuickPayAll(false)}
            />
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <KpiCard
          label="Total Goods Given"
          value={formatCurrency(customer.totalIssued || 0)}
          color="#6366f1"
          icon={Package}
          sub={`${transactions.length} entry${transactions.length !== 1 ? 's' : ''}`}
          helpText="Total value of all materials issued to this customer"
        />
        <KpiCard
          label="Total Collected"
          value={formatCurrency(totalPaymentsAmount)}
          color="#22c55e"
          icon={CreditCard}
          sub={`${payments.length} payment${payments.length !== 1 ? 's' : ''} received`}
          helpText="Actual cash/UPI/cheque received from this customer"
        />
        <KpiCard
          label="Balance Pending"
          value={formatCurrency(customer.outstanding || 0)}
          color={customer.outstanding > 0 ? '#f59e0b' : '#22c55e'}
          icon={IndianRupee}
          sub={customer.outstanding > 0 ? `${pendingTxns.length} unpaid bill${pendingTxns.length !== 1 ? 's' : ''}` : 'Fully settled ✓'}
          helpText="Amount still left to collect from this customer"
        />
        <KpiCard
          label="Overdue Amount"
          value={formatCurrency(customer.overdue || 0)}
          color={customer.overdue > 0 ? '#ef4444' : '#22c55e'}
          icon={customer.overdue > 0 ? AlertTriangle : CheckCircle}
          sub={customer.overdue > 0 ? 'Past due date — urgent' : 'Nothing overdue ✓'}
          helpText="Bills whose due date has already passed"
        />
      </div>

      {/* ── PENDING BILLS — Most important, shown first ── */}
      {pendingTxns.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
            fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(245,158,11,0.15)', color: 'var(--warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
            }}>
              {pendingTxns.length}
            </span>
            Pending Bills
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
              — click <span style={{ color: 'var(--success)', fontWeight: 600 }}>Record Payment</span> on a bill, or use <span style={{ color: 'var(--success)', fontWeight: 600 }}>Pay Now</span> above to settle all at once
            </span>
          </div>

          {pendingTxns.map(txn => (
            <TransactionCard
              key={txn.id}
              txn={txn}
              customer={customer}
              contractorId={contractorId}
              onPaymentSuccess={refetch}
            />
          ))}
        </div>
      )}

      {/* Empty state — no transactions at all */}
      {transactions.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-card)', border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)', marginBottom: 24,
        }}>
          <Package size={40} style={{ marginBottom: 16, opacity: 0.2 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No materials issued yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Click "Add Materials" above to issue the first batch to {customer.name}
          </div>
          <button
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none', color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', boxShadow: '0 3px 10px rgba(245,158,11,0.35)',
            }}
            onClick={() => setShowAssignModal(true)}
          >
            <Package size={14} /> Add Materials Now
          </button>
        </div>
      )}

      {/* ── SETTLED BILLS — collapsed by default ── */}
      {settledTxns.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowPayments(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              width: '100%', marginBottom: showPayments ? 12 : 0,
              transition: 'background var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <CheckCircle size={14} style={{ color: 'var(--success)' }} />
            {settledTxns.length} Settled Bills
            <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
              {showPayments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {showPayments && settledTxns.map(txn => (
            <TransactionCard
              key={txn.id}
              txn={txn}
              customer={customer}
              contractorId={contractorId}
              onPaymentSuccess={refetch}
            />
          ))}
        </div>
      )}

      {/* ── PAYMENT HISTORY ── */}
      {payments.length > 0 && (
        <div className="table-container" style={{ marginBottom: 24 }}>
          <div className="table-toolbar">
            <div>
              <div className="table-toolbar-title">Payment History</div>
              <div className="table-toolbar-subtitle">
                {payments.length} payment{payments.length !== 1 ? 's' : ''} · Total collected: <strong style={{ color: 'var(--success)' }}>{formatCurrency(totalPaymentsAmount)}</strong>
              </div>
            </div>
          </div>
          {payments.map(p => <PaymentHistoryItem key={p.id} p={p} />)}
        </div>
      )}

      {/* ── ASSIGN MATERIAL MODAL ── */}
      <AssignMaterialToCustomerModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={() => { setShowAssignModal(false); refetch(); }}
        customer={{
          id:             customer.id,
          name:           customer.name,
          contractorId:   customer.contractorId,
          contractorName: customer.contractorName,
        }}
      />
    </div>
  );
}
