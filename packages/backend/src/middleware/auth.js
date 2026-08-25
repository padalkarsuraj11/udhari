// ============================================================
// AUTH MIDDLEWARE
// Validates Supabase JWT tokens and attaches user context.
//
// ARCHITECTURE:
//   requireAuth        → validates JWT, attaches req.user
//   requireAdmin       → verifies platform_admin role via DB
//   requireOwner       → verifies owner role + active tenant
//   attachTenantContext → attaches req.tenantId from user_profiles
//
// ROLE STRATEGY:
//   - app_metadata.role is set by service-role (backend) only
//     → used as the trusted source for middleware checks
//   - user_profiles.role is the application-layer source of truth
//     → used for DB queries and UI display
//   - We query user_profiles for role verification so both
//     sources stay in sync even if app_metadata is missing
// ============================================================

const { supabase } = require('../lib/supabase');

// ============================================================
// requireAuth
// Validates the Bearer JWT from the Authorization header.
// Attaches req.user (Supabase auth user object) and req.accessToken.
// ============================================================
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or malformed authorization header',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!supabase) {
      // Dev mode: allow bypass if Supabase is not configured
      console.warn('⚠️  Supabase not configured — skipping auth in dev mode');
      req.user = { id: 'dev-user', email: 'dev@udhari.io' };
      req.accessToken = token;
      return next();
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }

    req.user        = user;
    req.accessToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

// ============================================================
// requireAdmin
// Verifies the authenticated user has the platform_admin role.
// Queries user_profiles table — this is the authoritative source.
// Must be used AFTER requireAuth.
// ============================================================
async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Not authenticated',
    });
  }

  if (!supabase) {
    // Dev mode bypass
    console.warn('⚠️  Supabase not configured — skipping admin role check');
    return next();
  }

  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      console.error('requireAdmin error:', error, 'profile:', profile, 'user_id:', req.user.id);
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'User profile not found',
      });
    }

    if (profile.role !== 'platform_admin') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Platform admin access required',
      });
    }

    req.userRole = 'platform_admin';
    next();
  } catch (err) {
    next(err);
  }
}

// ============================================================
// attachTenantContext
// Looks up the authenticated user's tenant_id from user_profiles.
// Attaches req.tenantId and req.userRole.
// Also verifies the tenant is ACTIVE before allowing access.
// Must be used AFTER requireAuth.
// ============================================================
async function attachTenantContext(req, res, next) {
  if (!req.user) return next();

  if (!supabase) {
    // Dev mode
    req.tenantId = 'dev-tenant';
    req.userRole = 'owner';
    return next();
  }

  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        tenant_id,
        tenants (
          id,
          business_name,
          status
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'User profile not found',
      });
    }

    if (!profile.tenant_id) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'No business account associated with this user',
      });
    }

    // Verify tenant is active
    const tenantStatus = profile.tenants?.status;
    if (tenantStatus !== 'active') {
      return res.status(403).json({
        error: 'ACCOUNT_INACTIVE',
        message: tenantStatus === 'suspended'
          ? 'Your account has been suspended. Please contact support.'
          : 'Your account has been deactivated. Please contact support.',
      });
    }

    req.tenantId     = profile.tenant_id;
    req.userRole     = profile.role;
    req.businessName = profile.tenants?.business_name;
    next();
  } catch (err) {
    next(err);
  }
}

// ============================================================
// requireOwner
// Verifies the authenticated user is an owner (or staff).
// Must be used AFTER requireAuth + attachTenantContext.
// ============================================================
function requireOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Not authenticated',
    });
  }

  if (!req.tenantId) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'No tenant context — business account required',
    });
  }

  const allowedRoles = ['owner', 'staff'];
  if (!allowedRoles.includes(req.userRole)) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Business owner access required',
    });
  }

  next();
}

// ============================================================
// BACKWARD COMPATIBILITY
// Keep attachOwnerContext as alias pointing to attachTenantContext
// so existing route stubs don't break during migration.
// ============================================================
function attachOwnerContext(req, res, next) {
  return attachTenantContext(req, res, (err) => {
    if (!err && req.tenantId) {
      // Keep legacy req.ownerId for any stubs still using it
      req.ownerId = req.tenantId;
    }
    next(err);
  });
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireOwner,
  attachTenantContext,
  attachOwnerContext, // legacy alias
};
