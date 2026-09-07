// ============================================================
// PAYMENTS ROUTES — Payment receipt management
//
// Route: /api/payments/*
// Middleware: requireAuth + attachTenantContext + requireOwner
// ============================================================

const router  = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth, attachTenantContext, requireOwner } = require('../middleware/auth');

router.use(requireAuth, attachTenantContext, requireOwner);

// ─────────────────────────────────────────────
// GET /api/payments  — List all payments
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { contractor_id, customer_id, limit = 100, offset = 0 } = req.query;

    if (!supabase || !tenantId) {
      return res.json({ payments: [], total: 0 });
    }

    let query = supabase
      .from('payments')
      .select(`
        id, payment_date, amount, payment_method, reference, notes, created_at,
        contractor_id, customer_id, transaction_id,
        contractors(id, name, phone),
        customers(id, name),
        material_transactions(id, description, total_amount)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (contractor_id) query = query.eq('contractor_id', contractor_id);
    if (customer_id)   query = query.eq('customer_id', customer_id);

    const { data, count, error } = await query;
    if (error) throw error;

    const payments = (data || []).map(p => ({
      id:              p.id,
      date:            p.payment_date,
      amount:          parseFloat(p.amount || 0),
      method:          p.payment_method,
      reference:       p.reference,
      notes:           p.notes,
      createdAt:       p.created_at,
      contractorId:    p.contractor_id,
      contractorName:  p.contractors?.name || 'Unknown',
      contractorPhone: p.contractors?.phone,
      customerId:      p.customer_id,
      customerName:    p.customers?.name || null,
      transactionId:   p.transaction_id,
      transactionDesc: p.material_transactions?.description || null,
    }));

    res.json({ payments, total: count || payments.length });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/payments  — Record a payment
// ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const {
      contractor_id, customer_id, transaction_id,
      amount, payment_method = 'cash',
      payment_date, reference, notes,
    } = req.body;

    if (!contractor_id) return res.status(400).json({ error: 'VALIDATION', message: 'Contractor is required' });
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'VALIDATION', message: 'Payment amount must be greater than 0' });
    }

    if (!supabase || !tenantId) {
      return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });
    }

    const paymentAmt = parseFloat(amount);

    // Insert payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        tenant_id:      tenantId,
        contractor_id,
        customer_id:    customer_id    || null,
        transaction_id: transaction_id || null,
        amount:         paymentAmt,
        payment_method,
        payment_date:   payment_date || new Date().toISOString().split('T')[0],
        reference:      reference?.trim() || null,
        notes:          notes?.trim()     || null,
      })
      .select()
      .single();

    if (payErr) throw payErr;

    // Update material_transactions
    let remainingPayment = paymentAmt;

    // 1. If linked to a specific transaction, apply to it first
    if (transaction_id) {
      const { data: txn } = await supabase
        .from('material_transactions')
        .select('id, total_amount, advance_amount, status')
        .eq('tenant_id', tenantId)
        .eq('id', transaction_id)
        .single();

      if (txn) {
        const total      = parseFloat(txn.total_amount || 0);
        const currentAdv = parseFloat(txn.advance_amount || 0);
        const needed     = Math.max(0, total - currentAdv);
        const toApply    = Math.min(remainingPayment, needed > 0 ? needed : remainingPayment);

        const newAdvance     = currentAdv + toApply;
        const newOutstanding = Math.max(0, total - newAdvance);
        let   newStatus      = 'outstanding';
        if (newAdvance >= total)  newStatus = 'paid';
        else if (newAdvance > 0)  newStatus = 'partial';

        await supabase
          .from('material_transactions')
          .update({
            advance_amount:      newAdvance,
            outstanding_amount:  newOutstanding,
            status:              newStatus,
          })
          .eq('tenant_id', tenantId)
          .eq('id', transaction_id);

        remainingPayment -= toApply;
      }
    }

    // 2. If there is remaining payment (or no transaction_id was given),
    // allocate to open transactions for this contractor/customer (FIFO: oldest first)
    if (remainingPayment > 0 && contractor_id) {
      let query = supabase
        .from('material_transactions')
        .select('id, total_amount, advance_amount, status, transaction_date')
        .eq('tenant_id', tenantId)
        .eq('contractor_id', contractor_id)
        .in('status', ['outstanding', 'partial', 'overdue'])
        .order('transaction_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }
      if (transaction_id) {
        query = query.neq('id', transaction_id);
      }

      const { data: openTxns } = await query;

      for (const txn of (openTxns || [])) {
        if (remainingPayment <= 0) break;
        const total      = parseFloat(txn.total_amount || 0);
        const currentAdv = parseFloat(txn.advance_amount || 0);
        const needed     = Math.max(0, total - currentAdv);
        if (needed <= 0) continue;

        const toApply        = Math.min(remainingPayment, needed);
        const newAdvance     = currentAdv + toApply;
        const newOutstanding = Math.max(0, total - newAdvance);
        let   newStatus      = 'outstanding';
        if (newAdvance >= total)  newStatus = 'paid';
        else if (newAdvance > 0)  newStatus = 'partial';

        await supabase
          .from('material_transactions')
          .update({
            advance_amount:     newAdvance,
            outstanding_amount: newOutstanding,
            status:             newStatus,
          })
          .eq('tenant_id', tenantId)
          .eq('id', txn.id);

        remainingPayment -= toApply;
      }
    }

    res.status(201).json({
      payment: {
        id:        payment.id,
        date:      payment.payment_date,
        amount:    parseFloat(payment.amount),
        method:    payment.payment_method,
        reference: payment.reference,
        notes:     payment.notes,
      },
      message: 'Payment recorded successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
