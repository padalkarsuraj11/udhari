// ============================================================
// ROUTE FACTORY
// Generates placeholder route modules for tenant-scoped resources.
// Each generated module:
//   - Requires authentication (requireAuth)
//   - Attaches tenant context (attachTenantContext)
//   - Enforces owner role (requireOwner)
//   - Returns stub 501 responses pending Phase 3 implementation
//
// Middleware chain: requireAuth → attachTenantContext → requireOwner
// This ensures:
//   1. User is authenticated (valid JWT)
//   2. Tenant context is loaded (req.tenantId, req.userRole)
//   3. Tenant is active
//   4. User is an owner/staff (not platform admin)
// ============================================================

function createRouteModule(resourceName) {
  const router = require('express').Router();
  const { requireAuth, attachTenantContext, requireOwner } = require('../middleware/auth');

  router.use(requireAuth, attachTenantContext, requireOwner);

  router.get('/', (req, res) => res.json({
    message:  `${resourceName} list`,
    tenantId: req.tenantId,
    note:     'Full implementation in Phase 3',
  }));

  router.get('/:id', (req, res) => res.json({
    message:  `${resourceName} detail`,
    id:       req.params.id,
    tenantId: req.tenantId,
    note:     'Full implementation in Phase 3',
  }));

  router.post('/', (req, res) => res.status(501).json({
    error:   'NOT_IMPLEMENTED',
    message: `Create ${resourceName} — Phase 3`,
  }));

  router.put('/:id', (req, res) => res.status(501).json({
    error:   'NOT_IMPLEMENTED',
    message: `Update ${resourceName} — Phase 3`,
  }));

  router.delete('/:id', (req, res) => res.status(501).json({
    error:   'NOT_IMPLEMENTED',
    message: `Delete ${resourceName} — Phase 3`,
  }));

  return router;
}

module.exports = createRouteModule;
