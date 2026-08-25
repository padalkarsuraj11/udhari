require('dotenv').config({ path: 'd:/borrow/packages/backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let wsTransport;
try { wsTransport = require('ws'); } catch(e) {}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
});

async function seed() {
  const email = 'demo@udhari.io';
  const password = 'demo123';
  const ownerName = 'Ramesh Patel';
  const businessName = 'Patel Electrical Traders';
  const loginIdentifier = 'DEMO001';
  const businessType = 'Electrical';

  console.log('Seeding demo tenant...');

  // 1. Get or create auth user
  let authUserId = null;
  try {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    const authUser = usersData?.users?.find(u => u.email === email);
    if (authUser) {
      authUserId = authUser.id;
      console.log('Auth user already exists:', authUserId);
    }
  } catch (err) {
    console.warn('Warning: listUsers failed, trying to create user directly...', err.message);
  }

  if (!authUserId) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'owner' },
      user_metadata: { full_name: ownerName, role: 'owner' }
    });

    if (createError) {
      if (createError.message?.includes('already been registered') || createError.status === 422) {
        console.log('User already registered. Trying to find user ID via listUsers...');
        const { data: usersData2 } = await supabase.auth.admin.listUsers();
        const authUser2 = usersData2?.users?.find(u => u.email === email);
        if (authUser2) {
          authUserId = authUser2.id;
        } else {
          console.error('Failed to find user ID for existing user');
          process.exit(1);
        }
      } else {
        console.error('Failed to create auth user:', createError);
        process.exit(1);
      }
    } else {
      authUserId = newUser.user.id;
      console.log('Created auth user:', authUserId);
    }
  }

  // 2. Check if tenant exists
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('login_identifier', loginIdentifier)
    .maybeSingle();

  let tenantId;
  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log('Tenant already exists:', tenantId);
  } else {
    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        business_name: businessName,
        business_type: businessType,
        owner_name: ownerName,
        email,
        phone: '+91 98765 43210',
        city: 'Ahmedabad',
        state: 'Gujarat',
        login_identifier: loginIdentifier,
        status: 'active',
        plan: 'Starter'
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Failed to create tenant:', tenantError);
      process.exit(1);
    }
    tenantId = tenant.id;
    console.log('Created tenant:', tenantId);
  }

  // 3. Update auth user metadata with tenant_id
  await supabase.auth.admin.updateUserById(authUserId, {
    app_metadata: {
      role: 'owner',
      tenant_id: tenantId
    }
  });
  console.log('Updated app_metadata with tenant_id');

  // 4. Update user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: authUserId,
      role: 'owner',
      full_name: ownerName,
      phone: '+91 98765 43210',
      tenant_id: tenantId
    });

  if (profileError) {
    console.error('Failed to update profile:', profileError);
    process.exit(1);
  }
  console.log('Profile setup complete!');

  // 5. Seed some sample contractors, customers and transactions for this tenant so the dashboard is not blank!
  console.log('Seeding sample contractors...');
  const { data: existingContractors } = await supabase.from('contractors').select('id').eq('tenant_id', tenantId);
  if (existingContractors && existingContractors.length === 0) {
    const contractorsToSeed = [
      { name: 'Raj Construction', contact_name: 'Rajesh Sharma', phone: '+91 98001 11111', email: 'raj@rajconstruction.com', city: 'Ahmedabad', credit_limit: 1000000, status: 'active' },
      { name: 'Shree Electrical Works', contact_name: 'Suresh Patel', phone: '+91 97002 22222', email: 'suresh@shreeelec.com', city: 'Gandhinagar', credit_limit: 500000, status: 'active' },
      { name: 'Patil Contractors', contact_name: 'Mahesh Patil', phone: '+91 96003 33333', email: 'mahesh@patilcon.com', city: 'Surat', credit_limit: 800000, status: 'active' }
    ];

    for (const c of contractorsToSeed) {
      const { data: con, error: conErr } = await supabase
        .from('contractors')
        .insert({ ...c, tenant_id: tenantId })
        .select()
        .single();

      if (conErr) {
        console.error('Error seeding contractor:', conErr);
        continue;
      }

      // Seed customer for this contractor
      const { data: cust, error: custErr } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenantId,
          contractor_id: con.id,
          name: con.name === 'Raj Construction' ? 'Sharma Building' : 'Desai Bungalow',
          project_type: 'Commercial',
          address: 'Ahmedabad Highway',
          status: 'active'
        })
        .select()
        .single();

      if (custErr) {
        console.error('Error seeding customer:', custErr);
        continue;
      }

      // Seed transaction
      const { data: txn, error: txnErr } = await supabase
        .from('material_transactions')
        .insert({
          tenant_id: tenantId,
          contractor_id: con.id,
          customer_id: cust.id,
          transaction_date: new Date().toISOString().split('T')[0],
          description: 'Initial material shipment',
          total_amount: con.name === 'Raj Construction' ? 250000 : 120000,
          advance_amount: con.name === 'Raj Construction' ? 50000 : 20000,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'outstanding'
        })
        .select()
        .single();

      if (txnErr) {
        console.error('Error seeding transaction:', txnErr);
      }
    }
    console.log('Sample contractors, customers, and transactions seeded successfully!');
  } else {
    console.log('Contractors already exist. Skipping sample data seed.');
  }
}

seed().catch(err => {
  console.error('Unexpected seeding error:', err);
});
