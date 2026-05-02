const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  // Check profiles
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles || pError);

  // Check auth users
  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  console.log('Auth Users count:', users ? users.length : uError);
  
  if (users && users.length > 0) {
    const firstUser = users[0];
    console.log('First User ID:', firstUser.id);
    const hasProfile = profiles && profiles.some(p => p.id === firstUser.id);
    console.log('Has profile record?', hasProfile);
  }
}

checkProfiles();
