// ============================================================
// SUPABASE CLIENT — Backend
// Uses service-role key for server-side operations.
// NEVER expose this in frontend code.
//
// Node.js 20 fix: pass the 'ws' package as realtime transport.
// Node 20 does not have native WebSocket support; Node 22+ does.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Database operations will fail. Configure your .env file.'
  );
}

// Node.js 20 WebSocket fix
let wsTransport = undefined;
try {
  wsTransport = require('ws');
} catch (e) {
  // ws not installed — will fail on Node < 22
  console.warn('⚠️  ws package not found. Install it: npm install ws');
}

const supabaseOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
};

// Server-side client — has full access, bypasses RLS
// Use only for admin operations and server-side data fetching
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, supabaseOptions)
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
    ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
  });
}

module.exports = { supabase, createUserClient };

