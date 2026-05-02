const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAncestors() {
  const { data: ancestors, error } = await supabase.from('ancestors').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total ancestors:', ancestors.length);
    ancestors.forEach(a => {
      console.log(`ID: ${a.id}, Name: ${a.name}, Owner: ${a.owner_id}`);
    });
  }
}

checkAncestors();
