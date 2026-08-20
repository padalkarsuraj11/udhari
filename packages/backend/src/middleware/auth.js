// ============================================================
// AUTH MIDDLEWARE
// Validates Supabase JWT tokens and attaches user to request.
// Supports both admin and owner (tenant) authentication.
// ============================================================

const { supabase } = require('../lib/supabase');

// Verify Supabase JWT and attach user to req.user
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
      req.user = { id: 'dev-user', role: 'owner' };
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

// Verify the user has the 'platform_admin' role
// Admin role is stored in user_metadata or app_metadata
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
  }

  const role = req.user.app_metadata?.role || req.user.user_metadata?.role;

  if (role !== 'platform_admin') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  next();
}

// Extract owner_id from the authenticated user
// owner_id is stored in user_metadata during owner provisioning
function attachOwnerContext(req, res, next) {
  if (!req.user) return next();

  const ownerId = req.user.user_metadata?.owner_id;
  if (!ownerId) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'No owner account associated with this user',
    });
  }

  req.ownerId = ownerId;
  next();
}

module.exports = { requireAuth, requireAdmin, attachOwnerContext };
