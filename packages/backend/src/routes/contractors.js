// ============================================================
// CONTRACTORS ROUTES — Tenant-scoped contractor management
//
// Route: /api/contractors/*
// Middleware: requireAuth + attachTenantContext + requireOwner
// ============================================================

const router  = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth, attachTenantContext, requireOwner } = require('../middleware/auth');

router.use(requireAuth, attachTenantContext, requireOwner);

// ── Helper: compute contractor financials from transactions ──
async function getContractorFinancials(tenantId, contractorId) {
  const { data } = await supabase
    .from('material_transactions')
    .select('total_amount, advance_amount, outstanding_amount, status, due_date')
    .eq('tenant_id', tenantId)
    .eq('contractor_id', contractorId);

  let totalIssued = 0, totalPaid = 0, outstanding = 0, overdue = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const t of (data || [])) {
    const amt  = parseFloat(t.total_amount || 0);
    const adv  = parseFloat(t.advance_amount || 0);
    const os   = parseFloat(t.outstanding_amount || 0);
    totalIssued += amt;
    totalPaid   += adv;
    if (['outstanding', 'partial', 'overdue'].includes(t.status)) outstanding += os;
    if (t.status === 'paid') totalPaid += (amt - adv);
    if (t.status === 'overdue') overdue += os;
    // auto-mark overdue based on date
    if (['outstanding', 'partial'].includes(t.status) && t.due_date && t.due_date < today) {
      overdue += os;
    }
  }
  return { totalIssued, totalPaid, outstanding, overdue };
}

// ─────────────────────────────────────────────
// GET /api/contractors  — List all contractors
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    if (!supabase || !tenantId) {
      return res.json({ contractors: [], total: 0 });
    }

    const { data: contractors, error } = await supabase
      .from('contractors')
      .select(`
        id,
        name,
        contact_name,
        phone,
        email,
        city,
        status,
        credit_limit,
        created_at,
        risk_profiles (risk_level, risk_score)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get latest payment date per contractor from payments table
    const { data: payments } = await supabase
      .from('payments')
      .select('contractor_id, payment_date')
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: false });

    const lastPaymentMap = {};
    for (const p of (payments || [])) {
      if (!lastPaymentMap[p.contractor_id]) {
        lastPaymentMap[p.contractor_id] = p.payment_date;
      }
    }

    // Customer counts
    const { data: custCounts } = await supabase
      .from('customers')
      .select('contractor_id')
      .eq('tenant_id', tenantId);

    const custCountMap = {};
    for (const c of (custCounts || [])) {
      custCountMap[c.contractor_id] = (custCountMap[c.contractor_id] || 0) + 1;
    }

    // Transaction financials per contractor
    const { data: txns } = await supabase
      .from('material_transactions')
      .select('contractor_id, total_amount, advance_amount, outstanding_amount, status, due_date')
      .eq('tenant_id', tenantId);

    const today = new Date().toISOString().split('T')[0];
    const financialsMap = {};
    for (const t of (txns || [])) {
      const cid = t.contractor_id;
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

    const result = (contractors || []).map(c => ({
      id:           c.id,
      name:         c.name,
      contact:      c.contact_name || c.name,
      contact_name: c.contact_name,
      phone:        c.phone,
      email:        c.email,
      city:         c.city,
      status:       c.status,
      credit_limit: parseFloat(c.credit_limit || 0),
      joinedAt:     c.created_at,
      customers:    custCountMap[c.id] || 0,
      lastPayment:  lastPaymentMap[c.id] || null,
      riskLevel:    c.risk_profiles?.[0]?.risk_level || 'normal',
      riskScore:    c.risk_profiles?.[0]?.risk_score || 0,
      ...(financialsMap[c.id] || { totalIssued: 0, totalPaid: 0, outstanding: 0, overdue: 0 }),
    }));

    res.json({ contractors: result, total: result.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/contractors/:id  — Contractor detail
// ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;

    if (!supabase || !tenantId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Contractor not found' });
    }

    const { data: contractor, error } = await supabase
      .from('contractors')
      .select(`
        id, name, contact_name, phone, email, city, address, status,
        credit_limit, notes, created_at, updated_at,
        risk_profiles (risk_level, risk_score, avg_days_overdue, overdue_ratio, last_payment_days, computed_at)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error || !contractor) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Contractor not found' });
    }

    // Customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, project_type, address, status, created_at')
      .eq('tenant_id', tenantId)
      .eq('contractor_id', id)
      .order('created_at', { ascending: false });

    // Transactions
    const { data: transactions } = await supabase
      .from('material_transactions')
      .select(`
        id, transaction_date, description, total_amount, advance_amount,
        outstanding_amount, status, due_date, notes,
        customers(id, name)
      `)
      .eq('tenant_id', tenantId)
      .eq('contractor_id', id)
      .order('transaction_date', { ascending: false })
      .limit(50);

    // Payments
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        id, payment_date, amount, payment_method, reference, notes,
        customers(id, name)
      `)
      .eq('tenant_id', tenantId)
      .eq('contractor_id', id)
      .order('payment_date', { ascending: false })
      .limit(50);

    // Compute financials
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

    // Customer financials
    const customersWithFinancials = await Promise.all(
      (customers || []).map(async (cus) => {
        const { data: cusTxns } = await supabase
          .from('material_transactions')
          .select('total_amount, outstanding_amount, status, due_date')
          .eq('tenant_id', tenantId)
          .eq('customer_id', cus.id);

        let cusIssued = 0, cusOutstanding = 0, cusOverdue = 0;
        for (const t of (cusTxns || [])) {
          cusIssued += parseFloat(t.total_amount || 0);
          if (['outstanding', 'partial', 'overdue'].includes(t.status)) {
            cusOutstanding += parseFloat(t.outstanding_amount || 0);
          }
          if (t.status === 'overdue') cusOverdue += parseFloat(t.outstanding_amount || 0);
          if (['outstanding', 'partial'].includes(t.status) && t.due_date && t.due_date < today) {
            cusOverdue += parseFloat(t.outstanding_amount || 0);
          }
        }
        return {
          id:           cus.id,
          name:         cus.name,
          type:         cus.project_type,
          address:      cus.address,
          status:       cusOutstanding > 0 ? (cusOverdue > 0 ? 'overdue' : 'active') : 'paid',
          totalIssued:  cusIssued,
          outstanding:  cusOutstanding,
          overdue:      cusOverdue,
          createdAt:    cus.created_at,
        };
      })
    );

    const lastPayment = payments?.[0]?.payment_date || null;

    res.json({
      contractor: {
        id:           contractor.id,
        name:         contractor.name,
        contact:      contractor.contact_name || contractor.name,
        contact_name: contractor.contact_name,
        phone:        contractor.phone,
        email:        contractor.email,
        city:         contractor.city,
        address:      contractor.address,
        status:       contractor.status,
        credit_limit: parseFloat(contractor.credit_limit || 0),
        notes:        contractor.notes,
        joinedAt:     contractor.created_at,
        lastPayment,
        riskLevel:    contractor.risk_profiles?.[0]?.risk_level || 'normal',
        riskScore:    contractor.risk_profiles?.[0]?.risk_score || 0,
        totalIssued,
        totalPaid,
        outstanding,
        overdue,
      },
      customers:    customersWithFinancials,
      transactions: (transactions || []).map(t => ({
        id:           t.id,
        date:         t.transaction_date,
        description:  t.description,
        amount:       parseFloat(t.total_amount || 0),
        advance:      parseFloat(t.advance_amount || 0),
        outstanding:  parseFloat(t.outstanding_amount || 0),
        status:       t.status,
        dueDate:      t.due_date,
        notes:        t.notes,
        customerName: t.customers?.name || null,
        customerId:   t.customers?.id   || null,
      })),
      payments: (payments || []).map(p => ({
        id:            p.id,
        date:          p.payment_date,
        amount:        parseFloat(p.amount || 0),
        method:        p.payment_method,
        reference:     p.reference,
        notes:         p.notes,
        customerName:  p.customers?.name || null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/contractors  — Create contractor
// ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { name, contact_name, phone, email, city, address, credit_limit, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Contractor name is required' });
    }

    if (!supabase || !tenantId) {
      return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('contractors')
      .insert({
        tenant_id:    tenantId,
        name:         name.trim(),
        contact_name: contact_name?.trim() || null,
        phone:        phone?.trim()        || null,
        email:        email?.trim()        || null,
        city:         city?.trim()         || null,
        address:      address?.trim()      || null,
        credit_limit: credit_limit         || 0,
        notes:        notes?.trim()        || null,
        status:       'active',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ contractor: data, message: 'Contractor created successfully' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// PUT /api/contractors/:id  — Update contractor
// ─────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;
    const { name, contact_name, phone, email, city, address, credit_limit, notes, status } = req.body;

    if (!supabase || !tenantId) {
      return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });
    }

    const updates = {};
    if (name         !== undefined) updates.name         = name.trim();
    if (contact_name !== undefined) updates.contact_name = contact_name?.trim() || null;
    if (phone        !== undefined) updates.phone        = phone?.trim() || null;
    if (email        !== undefined) updates.email        = email?.trim() || null;
    if (city         !== undefined) updates.city         = city?.trim()  || null;
    if (address      !== undefined) updates.address      = address?.trim() || null;
    if (credit_limit !== undefined) updates.credit_limit = credit_limit;
    if (notes        !== undefined) updates.notes        = notes?.trim() || null;
    if (status       !== undefined) updates.status       = status;

    const { data, error } = await supabase
      .from('contractors')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ contractor: data, message: 'Contractor updated' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// DELETE /api/contractors/:id
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;

    if (!supabase || !tenantId) {
      return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });
    }

    // Soft delete — set status to inactive
    const { error } = await supabase
      .from('contractors')
      .update({ status: 'inactive' })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Contractor deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
