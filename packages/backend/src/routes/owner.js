// ============================================================
// OWNER ROUTES — Authenticated owner's own business context
//
// These routes serve the currently authenticated owner/tenant.
// They use tenant-scoped queries (req.tenantId) to ensure
// owners can only access their own data.
//
// Route: /api/owner/*
// Middleware: requireAuth + attachTenantContext + requireOwner
// ============================================================

const router = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth, attachTenantContext, requireOwner } = require('../middleware/auth');

// All owner routes require authentication + tenant context
router.use(requireAuth, attachTenantContext, requireOwner);

// ============================================================
// OWNER PROFILE
// ============================================================

// GET /api/owner/profile
// Returns the authenticated owner's profile + tenant info
router.get('/profile', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.json({
        id:           req.user.id,
        email:        req.user.email,
        role:         'owner',
        tenant_id:    req.tenantId,
        business_name: req.businessName || 'Demo Business',
      });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        full_name,
        phone,
        avatar_url,
        tenant_id,
        last_seen_at,
        tenants (
          id,
          business_name,
          business_type,
          owner_name,
          email,
          phone,
          address,
          city,
          state,
          status,
          plan,
          login_identifier,
          created_at
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        error:   'PROFILE_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    // Update last_seen_at
    supabase
      .from('user_profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .then(({ error }) => {
        if (error) console.error('last_seen_at update error (non-fatal):', error);
      });

    res.json({
      id:        profile.id,
      email:     req.user.email,
      role:      profile.role,
      full_name: profile.full_name,
      phone:     profile.phone,
      avatar_url: profile.avatar_url,
      tenant_id: profile.tenant_id,
      tenant:    profile.tenants,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/owner/profile
// Updates the owner's profile and tenant details
router.put('/profile', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { full_name, phone, business_name, email, city, address } = req.body;

    if (!supabase || !tenantId) {
      return res.json({ message: 'Profile updated (Dev Mode bypass)' });
    }

    // Update user_profiles
    if (full_name !== undefined || phone !== undefined) {
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({
          full_name: full_name?.trim() || undefined,
          phone:     phone?.trim()        || undefined,
        })
        .eq('id', req.user.id);

      if (profileErr) throw profileErr;
    }

    // Update tenants
    if (business_name !== undefined || email !== undefined || city !== undefined || address !== undefined) {
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({
          business_name: business_name?.trim() || undefined,
          email:         email?.trim()         || undefined,
          city:          city?.trim()          || undefined,
          address:       address?.trim()       || undefined,
        })
        .eq('id', tenantId);

      if (tenantErr) throw tenantErr;
    }

    res.json({ message: 'Profile and business details updated successfully' });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// OWNER DASHBOARD STATS
// ============================================================

// GET /api/owner/dashboard
// Returns business metrics for the authenticated owner's tenant
router.get('/dashboard', async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    if (!supabase || !tenantId) {
      return res.json({
        stats: {
          totalContractors:     0,
          activeContractors:    0,
          totalCustomers:       0,
          activeCustomers:      0,
          totalTransactions:    0,
          totalMaterialIssued:  0,
          totalAdvanceReceived: 0,
          totalOutstanding:     0,
          totalOverdue:         0,
          totalPaid:            0,
          dueToday:             0,
          highRiskOutstanding:  0,
        },
        recentTransactions: [],
        topContractors:     [],
      });
    }

    // Run all queries in parallel
    const [
      { count: totalContractors },
      { count: activeContractors },
      { count: totalCustomers },
      { count: activeCustomers },
      { count: totalTransactions },
      { data: transactionData },
      { data: recentTxns },
    ] = await Promise.all([
      supabase.from('contractors').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('contractors').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
      supabase.from('material_transactions').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('material_transactions').select('total_amount, advance_amount, outstanding_amount, status, due_date').eq('tenant_id', tenantId),
      supabase.from('material_transactions')
        .select(`
          id,
          transaction_date,
          description,
          total_amount,
          advance_amount,
          outstanding_amount,
          status,
          contractors(name),
          customers(name)
        `)
        .eq('tenant_id', tenantId)
        .order('transaction_date', { ascending: false })
        .limit(10),
    ]);

    // Calculate financial aggregates
    const today = new Date().toISOString().split('T')[0];

    let totalMaterialIssued  = 0;
    let totalAdvanceReceived = 0;
    let totalOutstanding     = 0;
    let totalOverdue         = 0;
    let totalPaid            = 0;
    let dueToday             = 0;

    for (const t of (transactionData || [])) {
      const total       = parseFloat(t.total_amount || 0);
      const advance     = parseFloat(t.advance_amount || 0);
      const outstanding = parseFloat(t.outstanding_amount || 0);

      totalMaterialIssued  += total;
      totalAdvanceReceived += advance;

      if (['outstanding', 'partial', 'overdue'].includes(t.status)) {
        totalOutstanding += outstanding;
      }
      if (t.status === 'overdue') {
        totalOverdue += outstanding;
      }
      if (t.status === 'paid') {
        totalPaid += total;
      }
      if (t.due_date === today && ['outstanding', 'partial'].includes(t.status)) {
        dueToday += outstanding;
      }
    }

    // Get top contractors by outstanding
    const { data: contractors } = await supabase
      .from('contractors')
      .select(`
        id,
        name,
        phone,
        status,
        material_transactions(outstanding_amount, status)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(5);

    const topContractors = (contractors || [])
      .map(c => {
        const outstanding = c.material_transactions
          ?.filter(t => ['outstanding', 'partial', 'overdue'].includes(t.status))
          .reduce((s, t) => s + parseFloat(t.outstanding_amount || 0), 0) || 0;
        return { id: c.id, name: c.name, phone: c.phone, outstanding };
      })
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);

    // Get risk profile summary
    const { data: riskData } = await supabase
      .from('risk_profiles')
      .select('risk_level')
      .eq('tenant_id', tenantId);

    const riskSummary = { normal: 0, medium: 0, high: 0, critical: 0 };
    for (const r of (riskData || [])) {
      if (riskSummary[r.risk_level] !== undefined) {
        riskSummary[r.risk_level]++;
      }
    }

    // High risk outstanding = overdue for now (risk engine comes later)
    const highRiskOutstanding = totalOverdue;

    res.json({
      stats: {
        totalContractors:     totalContractors || 0,
        activeContractors:    activeContractors || 0,
        totalCustomers:       totalCustomers || 0,
        activeCustomers:      activeCustomers || 0,
        totalTransactions:    totalTransactions || 0,
        totalMaterialIssued,
        totalAdvanceReceived,
        totalOutstanding,
        totalOverdue,
        totalPaid,
        dueToday,
        highRiskOutstanding,
      },
      riskSummary,
      recentTransactions: (recentTxns || []).map(t => ({
        id:              t.id,
        date:            t.transaction_date,
        description:     t.description,
        amount:          parseFloat(t.total_amount || 0),
        advance:         parseFloat(t.advance_amount || 0),
        outstanding:     parseFloat(t.outstanding_amount || 0),
        status:          t.status,
        contractorName:  t.contractors?.name || 'Unknown',
        customerName:    t.customers?.name || null,
      })),
      topContractors,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
