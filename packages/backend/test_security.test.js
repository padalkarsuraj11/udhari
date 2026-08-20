// test_security.js
// Tests the backend authorization and tenant isolation mechanisms

const request = require('supertest');
const app = require('./src/index'); // Express app

// Mocking Supabase auth
const { supabase } = require('./src/lib/supabase');

jest.mock('./src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    }
  }
}));

describe('Security & Tenant Isolation Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('TEST 8: Unauthenticated user attempts protected route', async () => {
    const res = await request(app).get('/api/contractors');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('TEST 1: Admin logs in & TEST 6: Admin attempts normal Owner business routes', async () => {
    // Mock admin user
    const adminUser = {
      id: 'admin-id',
      app_metadata: { role: 'platform_admin' },
      user_metadata: {}
    };
    require('./src/lib/supabase').supabase.auth.getUser.mockResolvedValue({
      data: { user: adminUser }, error: null
    });

    // Admin accessing admin routes
    let res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer fake-admin-token');
    expect(res.status).toBe(200);

    // Admin accessing owner routes (should be forbidden since admin doesn't have an owner_id)
    res = await request(app)
      .get('/api/contractors')
      .set('Authorization', 'Bearer fake-admin-token');
    // The attachOwnerContext middleware expects owner_id for owner routes.
    // Platform admins should use the admin endpoints or have a special mechanism.
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('TEST 2 & 3 & 4: Owner logs in and sees only their tenant context', async () => {
    // Mock Owner A
    const ownerA = {
      id: 'owner-a-user',
      app_metadata: { role: 'owner' },
      user_metadata: { owner_id: 'tenant-a' }
    };
    require('./src/lib/supabase').supabase.auth.getUser.mockResolvedValue({
      data: { user: ownerA }, error: null
    });

    let res = await request(app)
      .get('/api/contractors')
      .set('Authorization', 'Bearer fake-owner-a-token');
    expect(res.status).toBe(200);
    // The route factory returns the ownerId it extracted
    expect(res.body.ownerId).toBe('tenant-a');

    // TEST 5: Owner attempts to access Admin routes
    res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer fake-owner-a-token');
    expect(res.status).toBe(403); // Not platform_admin
  });
});
