import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Receipt, CreditCard, TrendingDown,
  AlertTriangle, MessageSquare, FileText, Settings, BarChart3,
  Plus, Search, RefreshCw, Calendar, IndianRupee, Eye,
  CheckCircle, ShieldAlert, Clock, Building2, Send, Edit, Save, ArrowRight
} from 'lucide-react';
import {
  useTransactions, usePayments, useContractors, useCustomers,
  useMaterials, createMaterial, useBills, createBill, updateBillStatus,
  useProfile, updateTenantProfile
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, formatRelativeDate, getRiskLevel } from '../utils/format';
import {
  PageHeader, SearchInput, Select, StatusBadge, RiskBadge, Avatar,
  EmptyState, LoadingState, ErrorState, Card, StatCard
} from '../components/ui';
import { IssueMaterialModal, RecordPaymentModal } from '../components/modals';

// ============================================================
// 1. MATERIALS PAGE
// ============================================================
export function MaterialsPage() {
  const { data: materials, loading, error, refetch } = useMaterials();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', unit: 'piece', rate: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const list = materials || [];

  const filtered = list.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.category || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || m.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = Array.from(new Set(list.map(m => m.category).filter(Boolean)));

  async function handleAddMaterial(e) {
    e.preventDefault();
    if (!form.name.trim()) return setFormError('Material name is required');
    if (!form.rate || parseFloat(form.rate) <= 0) return setFormError('Rate must be greater than 0');

    setSaving(true);
    setFormError('');
    try {
      await createMaterial({
        name: form.name.trim(),
        unit: form.unit,
        rate: parseFloat(form.rate),
        category: form.category.trim() || undefined
      });
      setForm({ name: '', unit: 'piece', rate: '', category: '' });
      setShowAddForm(false);
      refetch();
    } catch (err) {
      setFormError(err.message || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Materials Catalog"
        description="Manage your business material items, standard catalog rates, and units"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={14} /> {showAddForm ? 'Close Form' : 'Add Material'}
          </button>
        }
      />

      {showAddForm && (
        <Card style={{ marginBottom: 20, maxWidth: 500 }}>
          <div className="card-header">
            <div className="card-title">Add New Material</div>
          </div>
          <form onSubmit={handleAddMaterial} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {formError && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{formError}</div>}
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Material Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Electrical Wire 2.5mm" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Unit *</label>
                <select className="input select" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                  <option value="piece">per piece</option>
                  <option value="per metre">per metre</option>
                  <option value="per kg">per kg</option>
                  <option value="per bag">per bag</option>
                  <option value="per brass">per brass</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Standard Rate (₹) *</label>
                <input className="input" type="number" min="0" step="0.01" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} placeholder="44.00" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Category</label>
              <input className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Wires, Pipes, Lights" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving...' : 'Save Material'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div className="filter-bar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search material catalog..."
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories.map(c => ({ value: c, label: c }))}
            placeholder="All Categories"
            style={{ width: 180 }}
          />
          {(search || categoryFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setCategoryFilter(''); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">Catalog Items</div>
            <div className="table-toolbar-subtitle">Showing {filtered.length} of {list.length}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={refetch}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading catalog..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No material items found" description="Get started by adding materials to your price list." icon={Package} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Material Name</th>
                <th>Category</th>
                <th>Standard Rate</th>
                <th>Billing Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td><span className="badge badge-neutral">{m.category || 'Uncategorized'}</span></td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(m.rate)}</td>
                  <td className="td-secondary">{m.unit}</td>
                  <td><span className="badge badge-success">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 2. TRANSACTIONS PAGE
// ============================================================
export function TransactionsPage() {
  const [contractorId, setContractorId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data: contractorData } = useContractors();
  const { data, loading, error, refetch } = useTransactions({ contractor_id: contractorId, status });
  const [showIssueModal, setShowIssueModal] = useState(false);

  const transactions = data?.transactions || [];
  const contractors = contractorData || [];

  const filtered = transactions.filter(t => {
    return !search ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.contractorName?.toLowerCase().includes(search.toLowerCase()) ||
      (t.customerName || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        title="Material Transactions Ledger"
        description="Complete audit log of credit material issues and payments"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowIssueModal(true)}>
            <Plus size={14} /> Issue Material
          </button>
        }
      />

      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div className="filter-bar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search transactions..."
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            value={contractorId}
            onChange={setContractorId}
            options={contractors.map(c => ({ value: c.id, label: c.name }))}
            placeholder="All Contractors"
            style={{ width: 200 }}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: 'outstanding', label: 'Outstanding' },
              { value: 'partial', label: 'Partial' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' }
            ]}
            placeholder="All Statuses"
            style={{ width: 150 }}
          />
          {(search || contractorId || status) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setContractorId(''); setStatus(''); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">Transaction Ledger</div>
            <div className="table-toolbar-subtitle">Showing {filtered.length} total entries</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={refetch}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading transactions..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No transactions recorded" description="Issue materials to a contractor on credit to record transactions." icon={Receipt} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Contractor</th>
                <th>Project/Customer</th>
                <th>Description</th>
                <th>Total Value</th>
                <th>Advance paid</th>
                <th>Outstanding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td className="td-secondary">{formatDate(t.date)}</td>
                  <td style={{ fontWeight: 600 }}>{t.contractorName}</td>
                  <td>{t.customerName || '—'}</td>
                  <td className="truncate" style={{ maxWidth: 200 }} title={t.description}>{t.description}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(t.amount)}</td>
                  <td style={{ color: 'var(--success)' }}>{t.advance > 0 ? formatCurrency(t.advance) : '—'}</td>
                  <td style={{ fontWeight: 700, color: t.outstanding > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {t.outstanding > 0 ? formatCurrency(t.outstanding) : 'Cleared'}
                  </td>
                  <td><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <IssueMaterialModal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
}

// ============================================================
// 3. PAYMENTS PAGE
// ============================================================
export function PaymentsPage() {
  const [contractorId, setContractorId] = useState('');
  const [search, setSearch] = useState('');
  const { data: contractorData } = useContractors();
  const { data, loading, error, refetch } = usePayments({ contractor_id: contractorId });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const payments = data?.payments || [];
  const contractors = contractorData || [];

  const filtered = payments.filter(p => {
    return !search ||
      p.contractorName?.toLowerCase().includes(search.toLowerCase()) ||
      (p.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.notes || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <PageHeader
        title="Payments Ledger"
        description="Audit all incoming collections and payments received from contractors"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
            <Plus size={14} /> Record Payment
          </button>
        }
      />

      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div className="filter-bar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search payments..."
            style={{ flex: 1, minWidth: 200 }}
          />
          <Select
            value={contractorId}
            onChange={setContractorId}
            options={contractors.map(c => ({ value: c.id, label: c.name }))}
            placeholder="All Contractors"
            style={{ width: 200 }}
          />
          {(search || contractorId) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setContractorId(''); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">Payment Ledger</div>
            <div className="table-toolbar-subtitle">Showing {filtered.length} payment receipts</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={refetch}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading payment history..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No payments recorded" description="Record a payment receipt when a contractor returns money." icon={CreditCard} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Contractor</th>
                <th>Project/Customer</th>
                <th>Amount Collected</th>
                <th>Method</th>
                <th>Reference No.</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="td-secondary">{formatDate(p.date)}</td>
                  <td style={{ fontWeight: 600 }}>{p.contractorName}</td>
                  <td>{p.customerName || '—'}</td>
                  <td style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(p.amount)}</td>
                  <td><span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{p.method}</span></td>
                  <td className="td-secondary">{p.reference || '—'}</td>
                  <td className="td-secondary" style={{ maxWidth: 180 }}>{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
}

// ============================================================
// 4. BILLS PAGE
// ============================================================
export function BillsPage() {
  const { data: bills, loading, error, refetch } = useBills();
  const { data: contractors } = useContractors();
  const [showGenForm, setShowGenForm] = useState(false);
  const [form, setForm] = useState({ contractor_id: '', customer_id: '', bill_number: '', subtotal: '', tax_rate: '18', notes: '' });
  const [items, setItems] = useState([{ description: '', quantity: '1', unit: 'piece', rate: '' }]);
  const [genSaving, setGenSaving] = useState(false);
  const [genError, setGenError] = useState('');

  const list = bills || [];
  const { data: customers } = useCustomers(form.contractor_id || null);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      return sum + (q * r);
    }, 0);
  };

  useEffect(() => {
    if (showGenForm) {
      setForm(p => ({
        ...p,
        bill_number: 'BILL-' + Math.floor(100000 + Math.random() * 900000)
      }));
    }
  }, [showGenForm]);

  async function handleCreateBill(e) {
    e.preventDefault();
    if (!form.contractor_id) return setGenError('Contractor is required');
    if (!form.bill_number) return setGenError('Bill number is required');
    if (items.some(i => !i.description.trim() || !i.rate)) return setGenError('Please fill all bill items details');

    setGenSaving(true);
    setGenError('');

    const sub = calculateSubtotal();
    const tax = sub * (parseFloat(form.tax_rate) / 100);
    const total = sub + tax;

    try {
      await createBill({
        contractor_id: form.contractor_id,
        customer_id: form.customer_id || undefined,
        bill_number: form.bill_number,
        subtotal: sub,
        tax_amount: tax,
        total_amount: total,
        notes: form.notes || undefined,
        items: items.map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
          rate: parseFloat(i.rate)
        }))
      });
      setShowGenForm(false);
      setItems([{ description: '', quantity: '1', unit: 'piece', rate: '' }]);
      refetch();
    } catch (err) {
      setGenError(err.message || 'Failed to generate bill');
    } finally {
      setGenSaving(false);
    }
  }

  const handleAddItem = () => {
    setItems(p => [...p, { description: '', quantity: '1', unit: 'piece', rate: '' }]);
  };

  const handleRemoveItem = (idx) => {
    if (items.length === 1) return;
    setItems(p => p.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, key, val) => {
    setItems(p => p.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  };

  return (
    <div>
      <PageHeader
        title="Formal Invoices & Bills"
        description="Create formal GST invoices and bills for trade items issued"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowGenForm(!showGenForm)}>
            <Plus size={14} /> {showGenForm ? 'Close Form' : 'Generate Invoice'}
          </button>
        }
      />

      {showGenForm && (
        <Card style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Generate Custom Invoice</div>
          </div>
          <form onSubmit={handleCreateBill}>
            {genError && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{genError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Contractor *</label>
                <select className="input select" value={form.contractor_id} onChange={e => setForm(p => ({ ...p, contractor_id: e.target.value, customer_id: '' }))}>
                  <option value="">— Select Contractor —</option>
                  {(contractors || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Customer / Project</label>
                <select className="input select" value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))} disabled={!form.contractor_id}>
                  <option value="">— Select Site —</option>
                  {(customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Bill Number *</label>
                <input className="input" value={form.bill_number} onChange={e => setForm(p => ({ ...p, bill_number: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 'bold' }}>Line Items</label>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <input style={{ flex: 3 }} className="input" placeholder="Item description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                  <input style={{ flex: 1 }} className="input" type="number" min="0.1" step="any" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  <select style={{ flex: 1.5 }} className="input select" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}>
                    <option value="piece">piece</option>
                    <option value="per metre">metre</option>
                    <option value="per kg">kg</option>
                    <option value="per bag">bag</option>
                  </select>
                  <input style={{ flex: 1.5 }} className="input" type="number" min="0" placeholder="Rate (₹)" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} />
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveItem(idx)}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 6 }} onClick={handleAddItem}>+ Add Line Item</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Invoice Notes</label>
                <textarea className="input" style={{ height: 75, resize: 'none' }} placeholder="Terms and conditions..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subtotal: ₹{calculateSubtotal().toLocaleString('en-IN')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  GST (
                  <select value={form.tax_rate} onChange={e => setForm(p => ({ ...p, tax_rate: e.target.value }))} style={{ border: 'none', background: 'transparent', fontWeight: 'bold', borderBottom: '1px dotted var(--border)' }}>
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                  ): ₹{(calculateSubtotal() * (parseFloat(form.tax_rate) / 100)).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 18, fontWeight: '800', color: 'var(--brand-400)' }}>
                  Total Invoice Amount: ₹{(calculateSubtotal() * (1 + parseFloat(form.tax_rate) / 100)).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowGenForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={genSaving}>
                {genSaving ? 'Generating...' : 'Generate Bill'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="table-container">
        <div className="table-toolbar">
          <div>
            <div className="table-toolbar-title">Issued Invoices</div>
            <div className="table-toolbar-subtitle">Showing {list.length} generated bills</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={refetch}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading bills..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState title="No invoices generated yet" description="Generate a PDF-ready GST invoice by choosing items." icon={FileText} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Date</th>
                <th>Contractor</th>
                <th>Project/Site</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 'bold' }}>{b.billNumber}</td>
                  <td className="td-secondary">{formatDate(b.date)}</td>
                  <td style={{ fontWeight: 600 }}>{b.contractorName}</td>
                  <td className="td-secondary">{b.customerName || 'All Sites'}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(b.totalAmount)}</td>
                  <td><span className="badge badge-success" style={{ textTransform: 'uppercase' }}>{b.status}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      const newStatus = b.status === 'paid' ? 'sent' : 'paid';
                      await updateBillStatus(b.id, newStatus);
                      refetch();
                    }}>
                      Toggle Paid
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 5. UDHARI / OUTSTANDING PAGE
// ============================================================
export function UdhariPage() {
  const { data: contractors, loading, error, refetch } = useContractors();

  const activeContractors = (contractors || []).filter(c => (c.outstanding || 0) > 0);

  const totalOutstanding = activeContractors.reduce((sum, c) => sum + c.outstanding, 0);
  const totalOverdue = activeContractors.reduce((sum, c) => sum + c.overdue, 0);

  return (
    <div>
      <PageHeader
        title="Udhari Ledger — Outstanding Balances"
        description="Detailed ledger of trade credit outstanding across all contractor accounts"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={refetch}>
            ↻ Refresh
          </button>
        }
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Outstanding Udhari', value: formatCurrency(totalOutstanding), color: 'var(--warning)' },
          { label: 'Total Past Due (Overdue)', value: formatCurrency(totalOverdue), color: 'var(--danger)' },
          { label: 'Debtors Count', value: activeContractors.length, color: 'var(--accent-400)' }
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '12px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-title">Active Outstanding Accounts</div>
        </div>

        {loading ? (
          <LoadingState message="Loading udhari ledger..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : activeContractors.length === 0 ? (
          <EmptyState title="All clear! No outstanding balances" description="All contractors have fully paid their invoices. Great job!" icon={CheckCircle} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Contractor</th>
                <th>Contact</th>
                <th>Total Credit Limit</th>
                <th>Total Material Issued</th>
                <th>Outstanding Balance</th>
                <th>Overdue (Past Due)</th>
                <th>Risk Rating</th>
                <th>Last Payment</th>
              </tr>
            </thead>
            <tbody>
              {activeContractors.map(c => {
                const risk = getRiskLevel(c.overdue, c.outstanding);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} />
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                      </div>
                    </td>
                    <td className="td-secondary">{c.phone || '—'}</td>
                    <td>{c.credit_limit > 0 ? formatCurrency(c.credit_limit, true) : 'No Limit'}</td>
                    <td>{formatCurrency(c.totalIssued || 0, true)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(c.outstanding)}</td>
                    <td style={{ fontWeight: 700, color: c.overdue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {c.overdue > 0 ? formatCurrency(c.overdue) : '—'}
                    </td>
                    <td><RiskBadge level={risk} /></td>
                    <td className="td-secondary">{formatRelativeDate(c.lastPayment)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 6. RISK MONITORING PAGE
// ============================================================
export function RiskPage() {
  const { data: contractors, loading, error, refetch } = useContractors();

  const list = contractors || [];

  const normal = list.filter(c => (c.outstanding || 0) === 0 || getRiskLevel(c.overdue, c.outstanding) === 'normal');
  const medium = list.filter(c => getRiskLevel(c.overdue, c.outstanding) === 'medium');
  const high = list.filter(c => getRiskLevel(c.overdue, c.outstanding) === 'high');
  const critical = list.filter(c => getRiskLevel(c.overdue, c.outstanding) === 'critical');

  const totalOutstanding = list.reduce((s, c) => s + (c.outstanding || 0), 0);
  const criticalOutstanding = critical.reduce((s, c) => s + (c.outstanding || 0), 0);

  return (
    <div>
      <PageHeader
        title="Credit Risk Monitoring"
        description="Monitor contractor payment behavior and identify potential default risks"
        actions={
          <button className="btn btn-ghost btn-sm" onClick={refetch}>
            ↻ Refresh
          </button>
        }
      />

      <div className="stats-grid">
        <StatCard label="Critical Risk Accounts" value={critical.length} icon={ShieldAlert} accentColor="#ef4444" iconBg="rgba(239,68,68,0.12)" changeLabel="Default threat" />
        <StatCard label="High Risk Accounts" value={high.length} icon={AlertTriangle} accentColor="#f97316" iconBg="rgba(249,115,22,0.12)" changeLabel="Needs strict follow-up" />
        <StatCard label="Medium Risk Accounts" value={medium.length} icon={Clock} accentColor="#eab308" iconBg="rgba(234,196,8,0.12)" changeLabel="Delayed payments" />
        <StatCard label="Risk Outstanding" value={formatCurrency(criticalOutstanding + high.reduce((s, c) => s + (c.outstanding || 0), 0))} icon={TrendingDown} accentColor="#ef4444" iconBg="rgba(239,68,68,0.12)" changeLabel="Total high-risk debt" />
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <Card>
          <div className="card-header">
            <div className="card-title">Critical & High Risk Ledger</div>
          </div>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : critical.length === 0 && high.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              No critical or high-risk accounts detected. Keep it up!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...critical, ...high].map(c => {
                const isCrit = getRiskLevel(c.overdue, c.outstanding) === 'critical';
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={c.name} />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last Payment: {formatRelativeDate(c.lastPayment)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: isCrit ? 'var(--danger)' : 'var(--warning)', fontSize: 13 }}>
                        {formatCurrency(c.outstanding)}
                      </div>
                      <span className={`badge ${isCrit ? 'risk-critical' : 'risk-high'}`}>
                        {isCrit ? 'Critical' : 'High'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="card-header">
            <div className="card-title">Default Risk Analysis</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span>Clean & Normal Risk</span>
                <span>{normal.length} accounts ({list.length > 0 ? Math.round((normal.length / list.length) * 100) : 0}%)</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${list.length > 0 ? (normal.length / list.length) * 100 : 0}%`, background: '#22c55e' }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span>Medium Risk (Delay Alert)</span>
                <span>{medium.length} accounts ({list.length > 0 ? Math.round((medium.length / list.length) * 100) : 0}%)</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${list.length > 0 ? (medium.length / list.length) * 100 : 0}%`, background: '#eab308' }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                <span>Critical Risk Default Warning</span>
                <span>{critical.length} accounts ({list.length > 0 ? Math.round((critical.length / list.length) * 100) : 0}%)</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${list.length > 0 ? (critical.length / list.length) * 100 : 0}%`, background: '#ef4444' }} /></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// 7. BILL REQUESTS PAGE
// ============================================================
export function BillRequestsPage() {
  const [requests, setRequests] = useState([
    { id: '1', contractor: 'Raj Construction', project: 'Sharma Building', date: '2026-08-24', itemsCount: 4, amount: 22000, status: 'pending' },
    { id: '2', contractor: 'Patil Contractors', project: 'Kapoor Office Complex', date: '2026-08-22', itemsCount: 6, amount: 31500, status: 'pending' },
    { id: '3', contractor: 'Sai Construction', project: 'Residence - Block B', date: '2026-08-20', itemsCount: 2, amount: 9500, status: 'completed' }
  ]);

  const handleAction = (id, newStatus) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return (
    <div>
      <PageHeader
        title="Contractor Bill Requests"
        description="Review and generate formal invoices requested by your credit builders and contractors"
      />

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-title">Active Requests</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date Requested</th>
              <th>Contractor</th>
              <th>Project Site</th>
              <th>No. of Items</th>
              <th>Estimated Value</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id}>
                <td className="td-secondary">{formatDate(r.date)}</td>
                <td style={{ fontWeight: 600 }}>{r.contractor}</td>
                <td>{r.project}</td>
                <td>{r.itemsCount} material types</td>
                <td style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</td>
                <td><StatusBadge status={r.status === 'completed' ? 'paid' : 'pending'} /></td>
                <td>
                  {r.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-xs" onClick={() => handleAction(r.id, 'completed')}>Generate</button>
                      <button className="btn btn-secondary btn-xs" onClick={() => handleAction(r.id, 'rejected')}>Decline</button>
                    </div>
                  ) : (
                    <span className="td-secondary">No Action Needed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// 8. WHATSAPP ACCOUNT PAGE
// ============================================================
export function WhatsAppPage() {
  const [phone, setPhone] = useState('+91 98765 43210');
  const [connected, setConnected] = useState(true);
  const [messages, setMessages] = useState([
    { id: '1', recipient: 'Rajesh Sharma', type: 'Payment Reminder', date: '2026-08-25 10:15', status: 'delivered' },
    { id: '2', recipient: 'Suresh Patel', type: 'Invoice BILL-48201', date: '2026-08-24 15:30', status: 'read' },
    { id: '3', recipient: 'Mahesh Patil', type: 'Daily Outstanding Statement', date: '2026-08-24 09:00', status: 'sent' }
  ]);

  return (
    <div>
      <PageHeader
        title="WhatsApp API Integration"
        description="Send automated invoices, statements, and credit payment reminders on WhatsApp"
      />

      <div className="grid-2">
        <Card>
          <div className="card-header">
            <div className="card-title">Integration Status</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare color="#22c55e" size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 'bold' }}>{connected ? 'Cloud API Connected' : 'Disconnected'}</div>
                <div className="td-secondary" style={{ fontSize: 12 }}>Phone Number: {phone}</div>
              </div>
              <span className={`badge ${connected ? 'badge-success' : 'badge-neutral'}`} style={{ marginLeft: 'auto' }}>
                {connected ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 'bold' }}>Alert Triggers Enabled</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, marginTop: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" defaultChecked /> Auto-send GST Invoice when Bill is generated
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" defaultChecked /> Weekly outstanding statement to high-risk debtors
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" defaultChecked /> Payment confirmation receipts auto-updates
                </label>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-header">
            <div className="card-title">Recent Notification Logs</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{m.recipient}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.type} · {m.date}</div>
                </div>
                <span className="badge badge-neutral" style={{ textTransform: 'uppercase', fontSize: 10 }}>{m.status}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// 9. REPORTS PAGE
// ============================================================
export function ReportsPage() {
  const { data: dashboard } = useProfile();
  const { data: contractorData } = useContractors();

  const list = contractorData || [];
  const totalOutstanding = list.reduce((s, c) => s + (c.outstanding || 0), 0);
  const totalPaid = list.reduce((s, c) => s + (c.totalPaid || 0), 0);
  const totalIssued = list.reduce((s, c) => s + (c.totalIssued || 0), 0);

  const collectionRate = totalIssued > 0 ? Math.round((totalPaid / totalIssued) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Business Analytics & Reports"
        description="Gain deep insights into credit health, aging debts, and collections rates"
      />

      <div className="grid-3" style={{ marginBottom: 20 }}>
        <Card style={{ textAlign: 'center', padding: '24px 10px' }}>
          <div style={{ fontSize: 36, fontWeight: '800', color: '#22c55e' }}>{collectionRate}%</div>
          <div style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-secondary)' }}>Overall Collection Rate</div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Percent of issued materials successfully collected</p>
        </Card>
        <Card style={{ textAlign: 'center', padding: '24px 10px' }}>
          <div style={{ fontSize: 36, fontWeight: '800', color: 'var(--warning)' }}>{formatCurrency(totalOutstanding, true)}</div>
          <div style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-secondary)' }}>Outstanding Credit (Udhari)</div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Total capital currently deployed on market credit</p>
        </Card>
        <Card style={{ textAlign: 'center', padding: '24px 10px' }}>
          <div style={{ fontSize: 36, fontWeight: '800', color: 'var(--brand-400)' }}>{list.length}</div>
          <div style={{ fontSize: 13, fontWeight: '600', color: 'var(--text-secondary)' }}>Active Buyers (Contractors)</div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Total credit account ledger lines active</p>
        </Card>
      </div>

      <Card>
        <div className="card-header">
          <div className="card-title">Top Debtors Risk Breakdown</div>
        </div>
        <div className="table-container" style={{ margin: 0, boxShadow: 'none', border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Contractor</th>
                <th>Total Credit Issued</th>
                <th>Amount Returned</th>
                <th>Outstanding Debt</th>
                <th>Payment Rate</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 5).map(c => {
                const rate = c.totalIssued > 0 ? Math.round((c.totalPaid / c.totalIssued) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{formatCurrency(c.totalIssued || 0)}</td>
                    <td style={{ color: 'var(--success)' }}>{formatCurrency(c.totalPaid || 0)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--warning)' }}>{formatCurrency(c.outstanding || 0)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 'bold', fontSize: 12 }}>{rate}%</span>
                        <div className="progress-bar" style={{ width: 60 }}><div className="progress-fill" style={{ width: `${rate}%`, background: rate > 75 ? '#22c55e' : '#eab308' }} /></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// 10. SETTINGS / PROFILE PAGE
// ============================================================
export function SettingsPage() {
  const { data: profile, loading, error, refetch } = useProfile();
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({ full_name: '', phone: '', business_name: '', email: '', city: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        business_name: profile.tenant?.business_name || '',
        email: profile.tenant?.email || '',
        city: profile.tenant?.city || '',
        address: profile.tenant?.address || ''
      });
    }
  }, [profile]);

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setErr('');
    try {
      await updateTenantProfile(form);
      setSuccess('Settings and Profile updated successfully!');
      refetch();
      refreshProfile(); // Refresh Auth Context state
    } catch (e) {
      setErr(e.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState message="Loading profile settings..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Business Profile & Settings"
        description="Manage your business information, contact profile, and invoice configurations"
      />

      <Card style={{ maxWidth: 640 }}>
        <div className="card-header">
          <div className="card-title">Update Business Settings</div>
        </div>
        <form onSubmit={handleSaveSettings}>
          {success && <div style={{ color: 'var(--success)', padding: '10px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13, fontWeight: 'bold' }}>{success}</div>}
          {err && <div style={{ color: 'var(--danger)', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: 13 }}>{err}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Your Full Name</label>
              <input className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Your Phone Number</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: '700', marginBottom: 10 }}>Business Account Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Business Name</label>
                <input className="input" value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Business Email</label>
                  <input className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: '600' }}>City</label>
                  <input className="input" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: '600' }}>Business Address</label>
                <input className="input" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              <Save size={14} style={{ marginRight: 4 }} />
              {saving ? 'Saving...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
