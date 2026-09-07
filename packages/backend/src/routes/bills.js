// ============================================================
// BILLS ROUTES — Tenant-scoped billing management
//
// Route: /api/bills/*
// Middleware: requireAuth + attachTenantContext + requireOwner
// ============================================================

const router  = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth, attachTenantContext, requireOwner } = require('../middleware/auth');

router.use(requireAuth, attachTenantContext, requireOwner);

// ─────────────────────────────────────────────
// GET /api/bills  — List all bills
// ─────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!supabase || !tenantId) return res.json({ bills: [] });

    const { data, error } = await supabase
      .from('bills')
      .select(`
        id, bill_number, bill_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status, notes, created_at,
        contractors(id, name, phone),
        customers(id, name)
      `)
      .eq('tenant_id', tenantId)
      .order('bill_date', { ascending: false });

    if (error) throw error;

    const bills = (data || []).map(b => ({
      id:             b.id,
      billNumber:     b.bill_number,
      date:           b.bill_date,
      dueDate:        b.due_date,
      subtotal:       parseFloat(b.subtotal || 0),
      taxAmount:      parseFloat(b.tax_amount || 0),
      totalAmount:    parseFloat(b.total_amount || 0),
      paidAmount:     parseFloat(b.paid_amount || 0),
      status:         b.status,
      notes:          b.notes,
      contractorId:   b.contractors?.id,
      contractorName: b.contractors?.name || 'Unknown',
      customerId:     b.customers?.id,
      customerName:   b.customers?.name || null,
      createdAt:      b.created_at,
    }));

    res.json({ bills });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// GET /api/bills/:id  — Bill detail with items
// ─────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { id }   = req.params;
    if (!supabase || !tenantId) return res.status(404).json({ error: 'NOT_FOUND', message: 'Bill not found' });

    const { data: bill, error: billErr } = await supabase
      .from('bills')
      .select(`
        id, bill_number, bill_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status, notes, created_at,
        contractors(id, name, phone, email, city, address),
        customers(id, name)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (billErr || !bill) return res.status(404).json({ error: 'NOT_FOUND', message: 'Bill not found' });

    const { data: items, error: itemsErr } = await supabase
      .from('bill_items')
      .select('id, description, quantity, unit, rate, amount')
      .eq('bill_id', id);

    if (itemsErr) throw itemsErr;

    res.json({
      bill: {
        id:             bill.id,
        billNumber:     bill.bill_number,
        date:           bill.bill_date,
        dueDate:        bill.due_date,
        subtotal:       parseFloat(bill.subtotal || 0),
        taxAmount:      parseFloat(bill.tax_amount || 0),
        totalAmount:    parseFloat(bill.total_amount || 0),
        paidAmount:     parseFloat(bill.paid_amount || 0),
        status:         bill.status,
        notes:          bill.notes,
        contractor:     bill.contractors,
        customerName:   bill.customers?.name || null,
        createdAt:      bill.created_at,
      },
      items: (items || []).map(i => ({
        id:          i.id,
        description: i.description,
        quantity:    parseFloat(i.quantity || 0),
        unit:        i.unit,
        rate:        parseFloat(i.rate || 0),
        amount:      parseFloat(i.amount || 0),
      })),
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// POST /api/bills  — Create new bill
// ─────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { contractor_id, customer_id, bill_number, bill_date, due_date, subtotal, tax_amount, total_amount, notes, items } = req.body;

    if (!contractor_id) return res.status(400).json({ error: 'VALIDATION', message: 'Contractor is required' });
    if (!bill_number)    return res.status(400).json({ error: 'VALIDATION', message: 'Bill number is required' });
    if (!items || !items.length) return res.status(400).json({ error: 'VALIDATION', message: 'At least one bill item is required' });

    if (!supabase || !tenantId) return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });

    // Insert bill
    const { data: bill, error: billErr } = await supabase
      .from('bills')
      .insert({
        tenant_id:     tenantId,
        contractor_id,
        customer_id:   customer_id || null,
        bill_number,
        bill_date:     bill_date || new Date().toISOString().split('T')[0],
        due_date:      due_date || null,
        subtotal:      parseFloat(subtotal) || 0,
        tax_amount:    parseFloat(tax_amount) || 0,
        total_amount:  parseFloat(total_amount) || 0,
        paid_amount:   0,
        status:        'sent',
        notes:         notes || null,
      })
      .select()
      .single();

    if (billErr) throw billErr;

    // Insert items
    const billItems = items.map(item => ({
      bill_id:     bill.id,
      description: item.description,
      quantity:    parseFloat(item.quantity) || 1,
      unit:        item.unit || 'piece',
      rate:        parseFloat(item.rate) || 0,
      // Fix: store computed amount so detail view always shows correct line totals
      amount:      (parseFloat(item.quantity) || 1) * (parseFloat(item.rate) || 0),
    }));

    const { error: itemsErr } = await supabase
      .from('bill_items')
      .insert(billItems);

    if (itemsErr) throw itemsErr;

    res.status(201).json({ bill, message: 'Bill generated successfully' });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────
// PUT /api/bills/:id/status  — Update bill status
// ─────────────────────────────────────────────
router.put('/:id/status', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'VALIDATION', message: 'Status is required' });

    const { data, error } = await supabase
      .from('bills')
      .update({ status })
      .eq('tenant_id', tenantId)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ bill: data, message: 'Bill status updated' });
  } catch (err) { next(err); }
});

module.exports = router;
