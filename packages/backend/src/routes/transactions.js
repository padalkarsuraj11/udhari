// ============================================================
// TRANSACTIONS ROUTES — Material issue transactions
//
// Route: /api/transactions/*
// Middleware: requireAuth + attachTenantContext + requireOwner
// ============================================================

const router  = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth, attachTenantContext, requireOwner } = require('../middleware/auth');

router.use(requireAuth, attachTenantContext, requireOwner);

// ─────────────────────────────────────────────
// GET /api/transactions  — List transactions
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { contractor_id, customer_id, status, limit = 100, offset = 0 } = req.query;

    if (!supabase || !tenantId) {
      return res.json({ transactions: [], total: 0 });
    }

    let query = supabase
      .from('material_transactions')
      .select(`
        id, transaction_date, description, total_amount, advance_amount,
        outstanding_amount, status, due_date, notes, created_at,
        contractor_id, customer_id,
        contractors(id, name, phone),
        customers(id, name)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('transaction_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (contractor_id) query = query.eq('contractor_id', contractor_id);
    if (customer_id)   query = query.eq('customer_id', customer_id);
    if (status)        query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const transactions = (data || []).map(t => ({
      id:             t.id,
      date:           t.transaction_date,
      description:    t.description,
      amount:         parseFloat(t.total_amount || 0),
      advance:        parseFloat(t.advance_amount || 0),
      outstanding:    parseFloat(t.outstanding_amount || 0),
      status:         (t.status !== 'overdue' && t.status !== 'paid' && t.due_date && t.due_date < today)
                        ? 'overdue' : t.status,
      dueDate:        t.due_date,
      notes:          t.notes,
      createdAt:      t.created_at,
      contractorId:   t.contractor_id,
      contractorName: t.contractors?.name || 'Unknown',
      contractorPhone:t.contractors?.phone,
      customerId:     t.customer_id,
      customerName:   t.customers?.name || null,
    }));

    res.json({ transactions, total: count || transactions.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// GET /api/transactions/:id  — Transaction detail
// ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;

    if (!supabase || !tenantId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found' });
    }

    const { data: txn, error } = await supabase
      .from('material_transactions')
      .select(`
        id, transaction_date, description, total_amount, advance_amount,
        outstanding_amount, status, due_date, notes, created_at,
        contractors(id, name, phone),
        customers(id, name)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error || !txn) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found' });
    }

    // Related payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id, payment_date, amount, payment_method, reference, notes')
      .eq('tenant_id', tenantId)
      .eq('transaction_id', id)
      .order('payment_date', { ascending: false });

    res.json({
      transaction: {
        id:             txn.id,
        date:           txn.transaction_date,
        description:    txn.description,
        amount:         parseFloat(txn.total_amount || 0),
        advance:        parseFloat(txn.advance_amount || 0),
        outstanding:    parseFloat(txn.outstanding_amount || 0),
        status:         txn.status,
        dueDate:        txn.due_date,
        notes:          txn.notes,
        createdAt:      txn.created_at,
        contractorName: txn.contractors?.name,
        customerName:   txn.customers?.name,
      },
      payments: (payments || []).map(p => ({
        id: p.id, date: p.payment_date, amount: parseFloat(p.amount || 0),
        method: p.payment_method, reference: p.reference, notes: p.notes,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/transactions  — Issue material (create transaction)
// ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const {
      contractor_id, customer_id, description,
      total_amount, advance_amount = 0,
      transaction_date, due_date, notes,
    } = req.body;

    if (!contractor_id)  return res.status(400).json({ error: 'VALIDATION', message: 'Contractor is required' });
    if (!total_amount || parseFloat(total_amount) <= 0) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Amount must be greater than 0' });
    }

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

    if (!con) return res.status(400).json({ error: 'VALIDATION', message: 'Contractor not found' });

    const total   = parseFloat(total_amount);
    const advance = parseFloat(advance_amount) || 0;
    const outstandingAmt = Math.max(0, total - advance);

    let status = 'outstanding';
    if (advance >= total)  status = 'paid';
    else if (advance > 0)  status = 'partial';

    const { data, error } = await supabase
      .from('material_transactions')
      .insert({
        tenant_id:          tenantId,
        contractor_id,
        customer_id:        customer_id || null,
        description:        description?.trim() || null,
        total_amount:       total,
        advance_amount:     advance,
        // outstanding_amount is a generated column — computed by DB automatically
        transaction_date:   transaction_date || new Date().toISOString().split('T')[0],
        due_date:           due_date || null,
        status,
        notes:              notes?.trim() || null,
      })
      .select(`
        id, transaction_date, description, total_amount, advance_amount,
        outstanding_amount, status, due_date, notes,
        contractors(name), customers(name)
      `)
      .single();

    if (error) throw error;

    // If advance payment was collected, record it in payments table
    if (advance > 0 && data?.id) {
      try {
        await supabase
          .from('payments')
          .insert({
            tenant_id:      tenantId,
            contractor_id,
            customer_id:    customer_id || null,
            transaction_id: data.id,
            amount:         advance,
            payment_method: req.body.payment_method || 'cash',
            payment_date:   transaction_date || new Date().toISOString().split('T')[0],
            reference:      req.body.payment_reference?.trim() || null,
            notes:          'Advance payment at issue',
          });
      } catch (payErr) {
        console.warn('Non-fatal: failed to record advance payment entry:', payErr);
      }
    }

    res.status(201).json({
      transaction: {
        id:             data.id,
        date:           data.transaction_date,
        description:    data.description,
        amount:         parseFloat(data.total_amount),
        advance:        parseFloat(data.advance_amount),
        outstanding:    parseFloat(data.outstanding_amount),
        status:         data.status,
        dueDate:        data.due_date,
        notes:          data.notes,
        contractorName: data.contractors?.name,
        customerName:   data.customers?.name,
      },
      message: 'Material issued successfully',
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// PUT /api/transactions/:id  — Update transaction
// ─────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;
    const { status, due_date, notes } = req.body;

    if (!supabase || !tenantId) {
      return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });
    }

    const updates = {};
    if (status   !== undefined) updates.status   = status;
    if (due_date !== undefined) updates.due_date  = due_date;
    if (notes    !== undefined) updates.notes     = notes?.trim() || null;

    const { data, error } = await supabase
      .from('material_transactions')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ transaction: data, message: 'Transaction updated' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// DELETE /api/transactions/:id  — Cancel transaction (soft delete)
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;

    if (!supabase || !tenantId) {
      return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('material_transactions')
      .update({ status: 'cancelled' })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found' });

    res.json({ message: 'Transaction cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
