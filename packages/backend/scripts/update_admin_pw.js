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

async function updateAdminPassword() {
  const email = 'admin@udhari.io';
  const newPassword = 'admin123';

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError);
    process.exit(1);
  }

  const adminUser = usersData?.users?.find(u => u.email === email);
  if (!adminUser) {
    console.error('Admin user not found in Supabase Auth');
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.updateUserById(adminUser.id, {
    password: newPassword
  });

  if (error) {
    console.error('Failed to update admin password:', error);
    process.exit(1);
  }

  console.log('Successfully updated admin@udhari.io password to admin123!');
}

updateAdminPassword();
