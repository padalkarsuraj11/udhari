// ============================================================
// ADMIN ROUTES — Platform Admin Operations
// Requires platform_admin role
// ============================================================

const router = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdmin);

// ============================================================
// DASHBOARD
// ============================================================

// GET /api/admin/dashboard — Platform KPI summary
router.get('/dashboard', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.json({
        stats: {
          totalOwners: 0,
          activeOwners: 0,
          inactiveOwners: 0,
          newOwnersThisMonth: 0,
        },
      });
    }

    // Get total tenants
    const { count: totalOwners } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    // Get active tenants
    const { count: activeOwners } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get inactive tenants
    const { count: inactiveOwners } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .in('status', ['inactive', 'suspended']);

    // Get new tenants this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: newOwnersThisMonth } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString());

    // Get total contractors across all tenants
    const { count: totalContractors } = await supabase
      .from('contractors')
      .select('*', { count: 'exact', head: true });

    // Get total customers across all tenants
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Get total transactions
    const { count: totalTransactions } = await supabase
      .from('material_transactions')
      .select('*', { count: 'exact', head: true });

    // Get total outstanding amount
    const { data: outstandingData } = await supabase
      .from('material_transactions')
      .select('outstanding_amount')
      .in('status', ['outstanding', 'partial', 'overdue']);

    const totalOutstanding = outstandingData?.reduce(
      (sum, t) => sum + parseFloat(t.outstanding_amount || 0), 0
    ) || 0;

    // Get total overdue amount
    const { data: overdueData } = await supabase
      .from('material_transactions')
      .select('outstanding_amount')
      .eq('status', 'overdue');

    const totalOverdue = overdueData?.reduce(
      (sum, t) => sum + parseFloat(t.outstanding_amount || 0), 0
    ) || 0;

    res.json({
      stats: {
        totalOwners: totalOwners || 0,
        activeOwners: activeOwners || 0,
        inactiveOwners: inactiveOwners || 0,
        newOwnersThisMonth: newOwnersThisMonth || 0,
        totalContractors: totalContractors || 0,
        totalCustomers: totalCustomers || 0,
        totalTransactions: totalTransactions || 0,
        totalOutstanding,
        totalOverdue,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// OWNER MANAGEMENT
// ============================================================

// GET /api/admin/owners — List all owners (paginated)
router.get('/owners', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      businessType,
    } = req.query;

    if (!supabase) {
      return res.json({
        data: [],
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0 },
      });
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = supabase
      .from('tenants')
      .select(`
        *,
        user_profiles!user_profiles_tenant_id_fkey(id, full_name, last_seen_at)
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (businessType) {
      query = query.eq('business_type', businessType);
    }

    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,owner_name.ilike.%${search}%,email.ilike.%${search}%,login_identifier.ilike.%${search}%`
      );
    }

    // Apply pagination
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Owners list error:', error);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch owners',
      });
    }

    // Get contractor counts for each tenant
    const tenantsWithCounts = await Promise.all(
      data.map(async (tenant) => {
        const { count: contractorCount } = await supabase
          .from('contractors')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id);

        const { data: transactionData } = await supabase
          .from('material_transactions')
          .select('outstanding_amount')
          .eq('tenant_id', tenant.id)
          .in('status', ['outstanding', 'partial', 'overdue']);

        const outstanding = transactionData?.reduce(
          (sum, t) => sum + parseFloat(t.outstanding_amount || 0), 0
        ) || 0;

        return {
          ...tenant,
          contractors: contractorCount || 0,
          outstanding,
          lastLogin: tenant.user_profiles?.[0]?.last_seen_at || null,
        };
      })
    );

    res.json({
      data: tenantsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/owners/:id — Owner details
router.get('/owners/:id', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Owner not found',
      });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        *,
        user_profiles!user_profiles_tenant_id_fkey(
          id, full_name, phone, last_seen_at
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !tenant) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Owner not found',
      });
    }

    // Get additional stats
    const { count: contractorCount } = await supabase
      .from('contractors')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id);

    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id);

    const { count: transactionCount } = await supabase
      .from('material_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id);

    const { data: transactionData } = await supabase
      .from('material_transactions')
      .select('total_amount, outstanding_amount, status')
      .eq('tenant_id', tenant.id);

    const totalIssued = transactionData?.reduce(
      (sum, t) => sum + parseFloat(t.total_amount || 0), 0
    ) || 0;

    const outstanding = transactionData
      ?.filter(t => ['outstanding', 'partial', 'overdue'].includes(t.status))
      .reduce((sum, t) => sum + parseFloat(t.outstanding_amount || 0), 0) || 0;

    const overdue = transactionData
      ?.filter(t => t.status === 'overdue')
      .reduce((sum, t) => sum + parseFloat(t.outstanding_amount || 0), 0) || 0;

    res.json({
      ...tenant,
      stats: {
        contractors: contractorCount || 0,
        customers: customerCount || 0,
        transactions: transactionCount || 0,
        totalIssued,
        outstanding,
        overdue,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/owners — Create owner (implemented next)
router.post('/owners', async (req, res, next) => {
  try {
    const {
      businessName,
      businessType,
      ownerName,
      email,
      phone,
      address,
      city,
      state,
      plan,
      loginIdentifier,
      password,
    } = req.body;

    // Validation
    if (!businessName || !businessType || !ownerName || !email || !loginIdentifier || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Database not configured',
      });
    }

    // Check for duplicate email or login_identifier
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .or(`email.eq.${email},login_identifier.eq.${loginIdentifier}`)
      .single();

    if (existingTenant) {
      return res.status(409).json({
        error: 'DUPLICATE',
        message: 'Email or login identifier already exists',
      });
    }

    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        role: 'owner',
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({
        error: 'AUTH_ERROR',
        message: authError.message || 'Failed to create user account',
      });
    }

    // Step 2: Create tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        business_name: businessName,
        business_type: businessType,
        owner_name: ownerName,
        email,
        phone,
        address,
        city,
        state,
        plan: plan || 'Starter',
        login_identifier: loginIdentifier,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: 'TENANT_ERROR',
        message: 'Failed to create tenant record',
      });
    }

    // Step 3: Link user profile to tenant
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        tenant_id: tenant.id,
        full_name: ownerName,
        phone,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // Log creation
    await supabase.from('audit_logs').insert({
      tenant_id: tenant.id,
      user_id: req.user.id,
      action: 'admin_created_owner',
      resource_type: 'tenant',
      resource_id: tenant.id,
      metadata: { business_name: businessName, plan },
    });

    res.status(201).json({
      success: true,
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name,
        owner_name: tenant.owner_name,
        email: tenant.email,
        login_identifier: tenant.login_identifier,
        status: tenant.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/owners/:id/status — Activate/deactivate
router.patch('/owners/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: 'Status must be active, inactive, or suspended',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Database not configured',
      });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('Status update error:', error);
      return res.status(500).json({
        error: 'UPDATE_ERROR',
        message: 'Failed to update tenant status',
      });
    }

    // Log status change
    await supabase.from('audit_logs').insert({
      tenant_id: tenant.id,
      user_id: req.user.id,
      action: status === 'active' ? 'admin_activated_owner' : 'admin_deactivated_owner',
      resource_type: 'tenant',
      resource_id: tenant.id,
      metadata: { new_status: status },
    });

    res.json({
      success: true,
      tenant: {
        id: tenant.id,
        business_name: tenant.business_name,
        status: tenant.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/activity — Recent platform activity
router.get('/activity', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    if (!supabase) {
      return res.json({ data: [] });
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        tenants(business_name),
        user_profiles!audit_logs_user_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Activity fetch error:', error);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch activity',
      });
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
