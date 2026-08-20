// ============================================================
// SUPABASE CLIENT — Client (Owner) Frontend
// Uses anon/public key with RLS enforcement.
// NEVER use service-role key in frontend code.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Create a .env file based on .env.example'
  );
}

// Public client for owner frontend
// This client respects RLS policies
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
