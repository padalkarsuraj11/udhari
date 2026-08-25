// ============================================================
// ADMIN ROUTES — Platform Admin Operations
// Requires platform_admin role (enforced by requireAdmin middleware)
//
// All operations use the service-role Supabase client which
// bypasses RLS — this is intentional for platform-level access.
// The requireAdmin middleware ensures only authenticated platform
// admins can reach these routes.
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
          totalContractors: 0,
          totalCustomers: 0,
          totalTransactions: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
        },
      });
    }

    // Run counts in parallel for performance
    const [
      { count: totalOwners },
      { count: activeOwners },
      { count: inactiveOwners },
      { count: newOwnersThisMonth },
      { count: totalContractors },
      { count: totalCustomers },
      { count: totalTransactions },
    ] = await Promise.all([
      supabase.from('tenants').select('*', { count: 'exact', head: true }),
      supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('tenants').select('*', { count: 'exact', head: true }).in('status', ['inactive', 'suspended']),
      supabase.from('tenants').select('*', { count: 'exact', head: true }).gte(
        'created_at',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      ),
      supabase.from('contractors').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('material_transactions').select('*', { count: 'exact', head: true }),
    ]);

    // Get outstanding/overdue amounts (these need actual data, not just counts)
    const { data: outstandingData } = await supabase
      .from('material_transactions')
      .select('outstanding_amount')
      .in('status', ['outstanding', 'partial', 'overdue']);

    const { data: overdueData } = await supabase
      .from('material_transactions')
      .select('outstanding_amount')
      .eq('status', 'overdue');

    const totalOutstanding = outstandingData?.reduce(
      (sum, t) => sum + parseFloat(t.outstanding_amount || 0), 0
    ) || 0;

    const totalOverdue = overdueData?.reduce(
      (sum, t) => sum + parseFloat(t.outstanding_amount || 0), 0
    ) || 0;

    res.json({
      stats: {
        totalOwners:        totalOwners || 0,
        activeOwners:       activeOwners || 0,
        inactiveOwners:     inactiveOwners || 0,
        newOwnersThisMonth: newOwnersThisMonth || 0,
        totalContractors:   totalContractors || 0,
        totalCustomers:     totalCustomers || 0,
        totalTransactions:  totalTransactions || 0,
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

// GET /api/admin/owners — List all owners (paginated + filterable)
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
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 },
      });
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const from     = (pageNum - 1) * limitNum;
    const to       = from + limitNum - 1;

    let query = supabase
      .from('tenants')
      .select(`
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
        created_at,
        updated_at,
        user_profiles!user_profiles_tenant_id_fkey(id, full_name, last_seen_at)
      `, { count: 'exact' });

    if (status)       query = query.eq('status', status);
    if (businessType) query = query.eq('business_type', businessType);
    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,owner_name.ilike.%${search}%,email.ilike.%${search}%,login_identifier.ilike.%${search}%`
      );
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Owners list error:', error);
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch owners',
      });
    }

    // Enrich with contractor count and outstanding (parallel per tenant)
    const enriched = await Promise.all(
      (data || []).map(async (tenant) => {
        const [
          { count: contractorCount },
          { data: transactionData },
        ] = await Promise.all([
          supabase
            .from('contractors')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id),
          supabase
            .from('material_transactions')
            .select('outstanding_amount')
            .eq('tenant_id', tenant.id)
            .in('status', ['outstanding', 'partial', 'overdue']),
        ]);

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
      data: enriched,
      pagination: {
        page:   pageNum,
        limit:  limitNum,
        total:  count || 0,
        pages:  Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/owners/:id — Owner details with stats
router.get('/owners/:id', async (req, res, next) => {
  try {
    if (!supabase) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Owner not found' });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
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
        created_at,
        updated_at,
        user_profiles!user_profiles_tenant_id_fkey(
          id, full_name, phone, last_seen_at
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !tenant) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Owner not found' });
    }

    // Get additional stats in parallel
    const [
      { count: contractorCount },
      { count: customerCount },
      { count: transactionCount },
      { data: transactionData },
    ] = await Promise.all([
      supabase.from('contractors').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      supabase.from('material_transactions').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      supabase.from('material_transactions').select('total_amount, outstanding_amount, status').eq('tenant_id', tenant.id),
    ]);

    const totalIssued  = transactionData?.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0) || 0;
    const outstanding  = transactionData?.filter(t => ['outstanding', 'partial', 'overdue'].includes(t.status)).reduce((s, t) => s + parseFloat(t.outstanding_amount || 0), 0) || 0;
    const overdue      = transactionData?.filter(t => t.status === 'overdue').reduce((s, t) => s + parseFloat(t.outstanding_amount || 0), 0) || 0;

    res.json({
      ...tenant,
      stats: {
        contractors:  contractorCount || 0,
        customers:    customerCount || 0,
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

// POST /api/admin/owners — Create new owner (tenant + auth user + user_profile)
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
      country,
      plan,
      loginIdentifier,
      password,
    } = req.body;

    // Validation
    const missing = [];
    if (!businessName)    missing.push('businessName');
    if (!businessType)    missing.push('businessType');
    if (!ownerName)       missing.push('ownerName');
    if (!email)           missing.push('email');
    if (!loginIdentifier) missing.push('loginIdentifier');
    if (!password)        missing.push('password');

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Missing required fields: ${missing.join(', ')}`,
        fields: missing,
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters',
      });
    }

    // Validate loginIdentifier length
    if (loginIdentifier.length < 3) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Login identifier must be at least 3 characters',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Database not configured',
      });
    }

    // Check for duplicate email
    const { data: emailExists } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (emailExists) {
      return res.status(409).json({
        error: 'DUPLICATE_EMAIL',
        message: 'An owner with this email already exists',
      });
    }

    // Check for duplicate login_identifier
    const { data: identifierExists } = await supabase
      .from('tenants')
      .select('id')
      .eq('login_identifier', loginIdentifier)
      .maybeSingle();

    if (identifierExists) {
      return res.status(409).json({
        error: 'DUPLICATE_IDENTIFIER',
        message: 'This login identifier is already in use',
      });
    }

    // ---- STEP 1: Create Supabase auth user ----
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm so owner can login immediately
      app_metadata: {
        role: 'owner',
        // tenant_id will be set after tenant creation
      },
      user_metadata: {
        full_name: ownerName,
        role: 'owner',
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);

      // Check if the error is because the email is already in auth.users
      if (authError.message?.includes('already been registered') || authError.status === 422) {
        return res.status(409).json({
          error: 'DUPLICATE_EMAIL',
          message: 'A user with this email already exists in the authentication system',
        });
      }

      return res.status(500).json({
        error: 'AUTH_ERROR',
        message: authError.message || 'Failed to create user account',
      });
    }

    const authUserId = authData.user.id;

    // ---- STEP 2: Create tenant record ----
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        business_name:    businessName,
        business_type:    businessType,
        owner_name:       ownerName,
        email,
        phone:            phone || null,
        address:          address || null,
        city:             city || null,
        state:            state || null,
        plan:             plan || 'Starter',
        login_identifier: loginIdentifier,
        status:           'active',
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authUserId);
      return res.status(500).json({
        error: 'TENANT_ERROR',
        message: 'Failed to create business account. Please try again.',
      });
    }

    // ---- STEP 3: Update app_metadata with tenant_id ----
    await supabase.auth.admin.updateUserById(authUserId, {
      app_metadata: {
        role:      'owner',
        tenant_id: tenant.id,
      },
    });

    // ---- STEP 4: Link user profile to tenant ----
    // The trigger handle_new_user already created the profile.
    // Now update it with the tenant linkage.
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        tenant_id: tenant.id,
        full_name: ownerName,
        phone:     phone || null,
        role:      'owner',
      })
      .eq('id', authUserId);

    if (profileError) {
      // Non-fatal: log but don't fail the creation
      console.error('Profile update error (non-fatal):', profileError);
    }

    // ---- STEP 5: Log creation ----
    await supabase.from('audit_logs').insert({
      tenant_id:     tenant.id,
      user_id:       req.user.id,
      action:        'admin_created_owner',
      resource_type: 'tenant',
      resource_id:   tenant.id,
      metadata: {
        business_name:    businessName,
        owner_name:       ownerName,
        plan,
        login_identifier: loginIdentifier,
        created_by:       req.user.email,
      },
    }).then(({ error }) => {
      if (error) console.error('Audit log error (non-fatal):', error);
    });

    res.status(201).json({
      success: true,
      tenant: {
        id:               tenant.id,
        business_name:    tenant.business_name,
        business_type:    tenant.business_type,
        owner_name:       tenant.owner_name,
        email:            tenant.email,
        phone:            tenant.phone,
        login_identifier: tenant.login_identifier,
        status:           tenant.status,
        plan:             tenant.plan,
        created_at:       tenant.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/owners/:id — Update owner business information
router.put('/owners/:id', async (req, res, next) => {
  try {
    const {
      businessName,
      businessType,
      ownerName,
      phone,
      address,
      city,
      state,
      plan,
    } = req.body;

    if (!supabase) {
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Database not configured' });
    }

    // Build update object — only include fields that were provided
    const updates = {};
    if (businessName !== undefined) updates.business_name = businessName;
    if (businessType !== undefined) updates.business_type = businessType;
    if (ownerName    !== undefined) updates.owner_name    = ownerName;
    if (phone        !== undefined) updates.phone         = phone;
    if (address      !== undefined) updates.address       = address;
    if (city         !== undefined) updates.city          = city;
    if (state        !== undefined) updates.state         = state;
    if (plan         !== undefined) updates.plan          = plan;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'No fields provided for update',
      });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('Owner update error:', error);
      return res.status(500).json({
        error: 'UPDATE_ERROR',
        message: 'Failed to update owner information',
      });
    }

    if (!tenant) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Owner not found' });
    }

    // If owner_name changed, also update user_profile
    if (ownerName) {
      await supabase
        .from('user_profiles')
        .update({ full_name: ownerName })
        .eq('tenant_id', req.params.id)
        .then(({ error }) => {
          if (error) console.error('Profile name update error (non-fatal):', error);
        });
    }

    // Log update
    await supabase.from('audit_logs').insert({
      tenant_id:     tenant.id,
      user_id:       req.user.id,
      action:        'admin_updated_owner',
      resource_type: 'tenant',
      resource_id:   tenant.id,
      metadata:      { updated_fields: Object.keys(updates), updated_by: req.user.email },
    }).then(({ error }) => {
      if (error) console.error('Audit log error (non-fatal):', error);
    });

    res.json({
      success: true,
      tenant,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/owners/:id/status — Activate/deactivate/suspend
router.patch('/owners/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Database not configured' });
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
        message: 'Failed to update account status',
      });
    }

    if (!tenant) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Owner not found' });
    }

    const actionMap = {
      active:    'admin_activated_owner',
      inactive:  'admin_deactivated_owner',
      suspended: 'admin_suspended_owner',
    };

    await supabase.from('audit_logs').insert({
      tenant_id:     tenant.id,
      user_id:       req.user.id,
      action:        actionMap[status],
      resource_type: 'tenant',
      resource_id:   tenant.id,
      metadata:      { new_status: status, updated_by: req.user.email },
    }).then(({ error }) => {
      if (error) console.error('Audit log error (non-fatal):', error);
    });

    res.json({
      success: true,
      tenant: {
        id:            tenant.id,
        business_name: tenant.business_name,
        status:        tenant.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/owners/:id/audit — Audit log for a specific owner
router.get('/owners/:id/audit', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    if (!supabase) {
      return res.json({ data: [] });
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at,
        user_profiles!audit_logs_user_id_fkey(full_name)
      `)
      .eq('tenant_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Audit log fetch error:', error);
      return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch audit log' });
    }

    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/activity — Recent platform-wide activity
router.get('/activity', async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    if (!supabase) {
      return res.json({ data: [] });
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        metadata,
        created_at,
        tenants(business_name),
        user_profiles!audit_logs_user_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(Math.min(100, parseInt(limit)));

    if (error) {
      console.error('Activity fetch error:', error);
      return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to fetch activity' });
    }

    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/owners/:id — Delete owner (tenant + auth users + user profiles)
router.delete('/owners/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!supabase) {
      return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Database not configured' });
    }

    // 1. Fetch user profiles linked to this tenant
    const { data: profiles, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('tenant_id', id);

    if (profileErr) {
      console.error('Error fetching profiles for deletion:', profileErr);
    }

    // 2. Delete Supabase Auth users
    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        const { error: authDelErr } = await supabase.auth.admin.deleteUser(p.id);
        if (authDelErr) {
          console.error(`Failed to delete auth user ${p.id}:`, authDelErr);
        }
      }
    }

    // 3. Delete tenant itself (cascades database tables)
    const { error: deleteErr } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      console.error('Failed to delete tenant:', deleteErr);
      return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to delete tenant' });
    }

    // 4. Log deletion in audit log (non-tenant event, or set tenant_id to null)
    supabase.from('audit_logs').insert({
      tenant_id:     null,
      user_id:       req.user.id,
      action:        'admin_deleted_owner',
      resource_type: 'tenant',
      resource_id:   id,
      metadata:      { deleted_tenant_id: id, deleted_by: req.user.email },
    }).then(({ error }) => {
      if (error) console.error('Audit log error (non-fatal):', error);
    });

    res.json({ success: true, message: 'Owner deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
