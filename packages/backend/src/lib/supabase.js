// ============================================================
// SUPABASE CLIENT — Backend
// Uses service-role key for server-side operations.
// NEVER expose this in frontend code.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl     = process.env.SUPABASE_URL;
const supabaseKey     = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Database operations will fail. Configure your .env file.'
  );
}

// Server-side client — has full access, bypasses RLS
// Use only for admin operations and server-side data fetching
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// Create a client scoped to a specific user's JWT
// This respects RLS policies for tenant isolation
function createUserClient(accessToken) {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = { supabase, createUserClient };
