// Route skeleton generator for all tenant-scoped routes
// Each route: requireAuth + attachOwnerContext to enforce tenant isolation

function createRouteModule(resourceName) {
  const router = require('express').Router();
  const { requireAuth, attachOwnerContext } = require('../middleware/auth');

  router.use(requireAuth, attachOwnerContext);

  router.get('/',    (req, res) => res.json({ message: `${resourceName} list`,   ownerId: req.ownerId }));
  router.get('/:id', (req, res) => res.json({ message: `${resourceName} detail`, id: req.params.id, ownerId: req.ownerId }));
  router.post('/',   (req, res) => res.status(501).json({ error: 'NOT_IMPLEMENTED', message: `Create ${resourceName} — Phase 2` }));
  router.put('/:id', (req, res) => res.status(501).json({ error: 'NOT_IMPLEMENTED', message: `Update ${resourceName} — Phase 2` }));
  router.delete('/:id', (req, res) => res.status(501).json({ error: 'NOT_IMPLEMENTED', message: `Delete ${resourceName} — Phase 2` }));

  return router;
}

module.exports = createRouteModule;
