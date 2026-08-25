// ============================================================
// CUSTOMERS ROUTES — Tenant-scoped customer/project management
//
// Route: /api/customers/*
// Middleware: requireAuth + attachTenantContext + requireOwner
// ============================================================

const router  = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth, attachTenantContext, requireOwner } = require('../middleware/auth');

router.use(requireAuth, attachTenantContext, requireOwner);

// ─────────────────────────────────────────────
// GET /api/customers  — List all customers
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { contractor_id } = req.query;

    if (!supabase || !tenantId) {
      return res.json({ customers: [], total: 0 });
    }

    let query = supabase
      .from('customers')
      .select(`
        id, name, project_type, address, status, notes, created_at,
        contractor_id,
        contractors(id, name, phone, city)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (contractor_id) query = query.eq('contractor_id', contractor_id);

    const { data: customers, error } = await query;
    if (error) throw error;

    // Get financials per customer from material_transactions
    const { data: txns } = await supabase
      .from('material_transactions')
      .select('customer_id, total_amount, advance_amount, outstanding_amount, status, due_date')
      .eq('tenant_id', tenantId);

    const today = new Date().toISOString().split('T')[0];
    const financialsMap = {};
    for (const t of (txns || [])) {
      const cid = t.customer_id;
      if (!cid) continue;
      if (!financialsMap[cid]) financialsMap[cid] = { totalIssued: 0, totalPaid: 0, outstanding: 0, overdue: 0 };
      const f   = financialsMap[cid];
      const amt = parseFloat(t.total_amount || 0);
      const adv = parseFloat(t.advance_amount || 0);
      const os  = parseFloat(t.outstanding_amount || 0);
      f.totalIssued += amt;
      if (t.status === 'paid') f.totalPaid += amt;
      else f.totalPaid += adv;
      if (['outstanding', 'partial', 'overdue'].includes(t.status)) f.outstanding += os;
      if (t.status === 'overdue') f.overdue += os;
      if (['outstanding', 'partial'].includes(t.status) && t.due_date && t.due_date < today) {
        f.overdue += os;
      }
    }

    const result = (customers || []).map(c => {
      const fin = financialsMap[c.id] || { totalIssued: 0, totalPaid: 0, outstanding: 0, overdue: 0 };
      const derivedStatus = fin.overdue > 0 ? 'overdue' : fin.outstanding > 0 ? 'active' : 'paid';
      return {
        id:             c.id,
        name:           c.name,
        type:           c.project_type,
        address:        c.address,
        status:         derivedStatus,
        notes:          c.notes,
        createdAt:      c.created_at,
        contractorId:   c.contractor_id,
        contractorName: c.contractors?.name || 'Unknown',
        contractorPhone:c.contractors?.phone,
        contractorCity: c.contractors?.city,
        ...fin,
      };
    });

    res.json({ customers: result, total: result.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/customers/:id  — Customer detail
// ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;

    if (!supabase || !tenantId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found' });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        id, name, project_type, address, status, notes, created_at,
        contractor_id,
        contractors(id, name, phone, email, city)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error || !customer) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found' });
    }

    // Transactions for this customer
    const { data: transactions } = await supabase
      .from('material_transactions')
      .select('id, transaction_date, description, total_amount, advance_amount, outstanding_amount, status, due_date, notes')
      .eq('tenant_id', tenantId)
      .eq('customer_id', id)
      .order('transaction_date', { ascending: false });

    // Payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id, payment_date, amount, payment_method, reference, notes')
      .eq('tenant_id', tenantId)
      .eq('customer_id', id)
      .order('payment_date', { ascending: false });

    const today = new Date().toISOString().split('T')[0];
    let totalIssued = 0, totalPaid = 0, outstanding = 0, overdue = 0;
    for (const t of (transactions || [])) {
      const amt = parseFloat(t.total_amount || 0);
      const adv = parseFloat(t.advance_amount || 0);
      const os  = parseFloat(t.outstanding_amount || 0);
      totalIssued += amt;
      if (t.status === 'paid') totalPaid += amt;
      else totalPaid += adv;
      if (['outstanding', 'partial', 'overdue'].includes(t.status)) outstanding += os;
      if (t.status === 'overdue') overdue += os;
      if (['outstanding', 'partial'].includes(t.status) && t.due_date && t.due_date < today) overdue += os;
    }

    res.json({
      customer: {
        id:             customer.id,
        name:           customer.name,
        type:           customer.project_type,
        address:        customer.address,
        status:         overdue > 0 ? 'overdue' : outstanding > 0 ? 'active' : 'paid',
        notes:          customer.notes,
        createdAt:      customer.created_at,
        contractorId:   customer.contractor_id,
        contractorName: customer.contractors?.name,
        contractorPhone:customer.contractors?.phone,
        totalIssued,
        totalPaid,
        outstanding,
        overdue,
      },
      transactions: (transactions || []).map(t => ({
        id:          t.id,
        date:        t.transaction_date,
        description: t.description,
        amount:      parseFloat(t.total_amount || 0),
        advance:     parseFloat(t.advance_amount || 0),
        outstanding: parseFloat(t.outstanding_amount || 0),
        status:      t.status,
        dueDate:     t.due_date,
        notes:       t.notes,
      })),
      payments: (payments || []).map(p => ({
        id:        p.id,
        date:      p.payment_date,
        amount:    parseFloat(p.amount || 0),
        method:    p.payment_method,
        reference: p.reference,
        notes:     p.notes,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/customers  — Create customer/project
// ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { name, contractor_id, project_type, address, notes } = req.body;

    if (!name?.trim())        return res.status(400).json({ error: 'VALIDATION', message: 'Customer name is required' });
    if (!contractor_id)       return res.status(400).json({ error: 'VALIDATION', message: 'Contractor is required' });

    if (!supabase || !tenantId) {
      return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });
    }

    // Verify contractor belongs to this tenant
    const { data: con } = await supabase
      .from('contractors')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', contractor_id)
      .single();

    if (!con) return res.status(400).json({ error: 'VALIDATION', message: 'Contractor not found in your account' });

    const { data, error } = await supabase
      .from('customers')
      .insert({
        tenant_id:    tenantId,
        contractor_id,
        name:         name.trim(),
        project_type: project_type || 'Residential',
        address:      address?.trim() || null,
        notes:        notes?.trim()   || null,
        status:       'active',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ customer: data, message: 'Customer created successfully' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// PUT /api/customers/:id  — Update customer
// ─────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;
    const { name, project_type, address, notes, status } = req.body;

    if (!supabase || !tenantId) {
      return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });
    }

    const updates = {};
    if (name         !== undefined) updates.name         = name.trim();
    if (project_type !== undefined) updates.project_type = project_type;
    if (address      !== undefined) updates.address      = address?.trim() || null;
    if (notes        !== undefined) updates.notes        = notes?.trim()   || null;
    if (status       !== undefined) updates.status       = status;

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ customer: data, message: 'Customer updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
