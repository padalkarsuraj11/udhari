#!/usr/bin/env node
// ============================================================
// ADMIN USER SETUP SCRIPT
// Creates or promotes a user to platform_admin role.
//
// Usage:
//   node scripts/setup-admin.js --email admin@udhari.io --password SecurePass123
//
// What it does:
//   1. Creates a Supabase auth user with the given credentials
//      OR updates an existing user
//   2. Sets app_metadata.role = 'platform_admin'
//   3. Creates/updates user_profiles with role = 'platform_admin'
//
// IMPORTANT: Run this from the packages/backend directory.
//   cd packages/backend
//   node scripts/setup-admin.js --email your@email.com --password yourpassword
// ============================================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Node.js 20 WebSocket fix
let wsTransport;
try { wsTransport = require('ws'); } catch(e) { /* Node 22+ has native WS */ }


// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      result.email = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      result.password = args[++i];
    } else if (args[i] === '--name' && args[i + 1]) {
      result.name = args[++i];
    }
  }
  return result;
}

async function setupAdmin() {
  const { email, password, name } = parseArgs();

  if (!email) {
    console.error('❌ --email is required');
    console.error('   Usage: node scripts/setup-admin.js --email admin@udhari.io --password SecurePass123');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
  });

  const fullName = name || email.split('@')[0];
  console.log(`\n🔧 Setting up platform admin: ${email}`);

  // ---- Step 1: Check if user already exists ----
  let userId;
  let isNewUser = false;

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    userId    = existingUser.id;
    isNewUser = false;
    console.log(`   ℹ️  Found existing auth user: ${userId}`);
  } else {
    if (!password) {
      console.error('❌ --password is required when creating a new admin user');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // ---- Step 2: Create new auth user ----
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: 'platform_admin',
      },
      user_metadata: {
        full_name: fullName,
        role:      'platform_admin',
      },
    });

    if (createError) {
      console.error('❌ Failed to create auth user:', createError.message);
      process.exit(1);
    }

    userId    = newUser.user.id;
    isNewUser = true;
    console.log(`   ✅ Created new auth user: ${userId}`);
  }

  // ---- Step 3: Set app_metadata.role = platform_admin ----
  const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      role: 'platform_admin',
    },
    user_metadata: {
      full_name: fullName,
      role:      'platform_admin',
    },
  });

  if (metaError) {
    console.error('❌ Failed to update app_metadata:', metaError.message);
    process.exit(1);
  }
  console.log('   ✅ Set app_metadata.role = platform_admin');

  // ---- Step 4: Create or update user_profiles ----
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id:        userId,
      role:      'platform_admin',
      full_name: fullName,
      // tenant_id stays NULL for platform admins
    }, {
      onConflict: 'id',
    });

  if (profileError) {
    console.error('❌ Failed to update user_profiles:', profileError.message);
    console.error('   Try running the database migrations first.');
    process.exit(1);
  }
  console.log('   ✅ Updated user_profiles.role = platform_admin');

  // ---- Step 5: Verify the setup ----
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, full_name')
    .eq('id', userId)
    .single();

  console.log('\n✅ Platform admin setup complete!');
  console.log('─────────────────────────────────────────');
  console.log(`   Email:     ${email}`);
  console.log(`   User ID:   ${userId}`);
  console.log(`   Role:      ${profile?.role || 'platform_admin'}`);
  console.log(`   Full Name: ${profile?.full_name || fullName}`);
  console.log('─────────────────────────────────────────');
  console.log('\nYou can now login at http://localhost:5173/login');
  console.log('Use the email and password you provided.\n');
}

setupAdmin().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
