// ============================================================
// MATERIALS ROUTES — Material catalog management
// ============================================================

const router  = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth, attachTenantContext, requireOwner } = require('../middleware/auth');

router.use(requireAuth, attachTenantContext, requireOwner);

router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!supabase || !tenantId) return res.json({ materials: [] });

    const { data, error } = await supabase
      .from('materials')
      .select('id, name, unit, rate, category, status, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    res.json({ materials: data || [] });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { name, unit, rate, category } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'VALIDATION', message: 'Name is required' });
    if (!supabase || !tenantId) return res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not configured' });

    const { data, error } = await supabase
      .from('materials')
      .insert({
        tenant_id: tenantId,
        name:      name.trim(),
        unit:      unit || 'piece',
        rate:      parseFloat(rate) || 0,
        category:  category?.trim() || null,
      })
      .select().single();

    if (error) throw error;
    res.status(201).json({ material: data, message: 'Material added' });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { name, unit, rate, category, status } = req.body;
    const updates = {};
    if (name     !== undefined) updates.name     = name.trim();
    if (unit     !== undefined) updates.unit     = unit;
    if (rate     !== undefined) updates.rate     = parseFloat(rate);
    if (category !== undefined) updates.category = category?.trim() || null;
    if (status   !== undefined) updates.status   = status;

    const { data, error } = await supabase
      .from('materials').update(updates)
      .eq('tenant_id', tenantId).eq('id', req.params.id)
      .select().single();

    if (error) throw error;
    res.json({ material: data });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('materials').update({ status: 'inactive' })
      .eq('tenant_id', req.tenantId).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Material deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
