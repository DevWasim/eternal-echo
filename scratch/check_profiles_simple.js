const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  console.log('Profiles found:', profiles ? profiles.length : 0);
  if (pError) console.error('PError:', pError);

  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  console.log('Auth Users found:', users ? users.length : 0);
  if (uError) console.error('UError:', uError);
  
  if (users && users.length > 0) {
    for (const user of users) {
      const profile = profiles ? profiles.find(p => p.id === user.id) : null;
      console.log(`User ${user.email} (${user.id}) has profile? ${!!profile}`);
    }
  }
}

checkProfiles();
