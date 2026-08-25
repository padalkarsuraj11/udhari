// ============================================================
// AUTH ROUTES — Authentication & Session Management
// Handles login, logout, session validation
// ============================================================

const router = require('express').Router();
const { supabase } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login
// Authenticate user with email/password or login_identifier
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, loginIdentifier } = req.body;

    if (!supabase) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Authentication service not configured',
      });
    }

    // Determine login method
    let authEmail = email;

    // If loginIdentifier provided, look up tenant email
    if (loginIdentifier && !email) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('email, status')
        .eq('login_identifier', loginIdentifier)
        .single();

      if (tenantError || !tenant) {
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid login identifier or password',
        });
      }

      if (tenant.status !== 'active') {
        return res.status(403).json({
          error: 'ACCOUNT_INACTIVE',
          message: 'Your account has been deactivated. Please contact support.',
        });
      }

      authEmail = tenant.email;
    }

    if (!authEmail || !password) {
      return res.status(400).json({
        error: 'MISSING_CREDENTIALS',
        message: 'Email/login identifier and password are required',
      });
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: password,
    });

    if (error) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, full_name, tenant_id, tenants(business_name, status)')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(500).json({
        error: 'PROFILE_ERROR',
        message: 'Failed to load user profile',
      });
    }

    // Check tenant status for non-admin users
    if (profile.role !== 'platform_admin' && profile.tenants?.status !== 'active') {
      // Sign out the user
      await supabase.auth.signOut();
      return res.status(403).json({
        error: 'ACCOUNT_INACTIVE',
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Log successful login
    await supabase.from('audit_logs').insert({
      tenant_id: profile.tenant_id,
      user_id: data.user.id,
      action: 'user_login',
      resource_type: 'auth',
      resource_id: data.user.id,
      metadata: { email: data.user.email },
    });

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role,
        full_name: profile.full_name,
        tenant_id: profile.tenant_id,
        business_name: profile.tenants?.business_name,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    if (!supabase) {
      return res.json({ success: true, message: 'Logged out' });
    }

    // Get tenant_id from user_profiles (reliable source)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', req.user.id)
      .maybeSingle();

    // Log logout
    await supabase.from('audit_logs').insert({
      tenant_id: profile?.tenant_id || null,
      user_id:   req.user.id,
      action:    'user_logout',
      resource_type: 'auth',
      resource_id:   req.user.id,
      metadata: { email: req.user.email },
    });

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
// Get current authenticated user info
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!supabase) {
      return res.json({
        id: req.user.id,
        email: req.user.email,
        role: 'owner',
      });
    }

    // Get user profile with tenant info
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        full_name,
        phone,
        avatar_url,
        tenant_id,
        tenants (
          business_name,
          business_type,
          status,
          plan
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return res.status(404).json({
        error: 'PROFILE_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    res.json({
      id: profile.id,
      email: req.user.email,
      role: profile.role,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      tenant_id: profile.tenant_id,
      tenant: profile.tenants ? {
        business_name: profile.tenants.business_name,
        business_type: profile.tenants.business_type,
        status: profile.tenants.status,
        plan: profile.tenants.plan,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
// Refresh access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'MISSING_TOKEN',
        message: 'Refresh token is required',
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Authentication service not configured',
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
