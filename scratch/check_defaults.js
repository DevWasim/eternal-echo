const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumnDefaults() {
  const { data, error } = await supabase.rpc('get_column_defaults', { table_name_param: 'ancestors' });
  if (error) {
    // If RPC doesn't exist, try fetching from information_schema via a raw query if possible, 
    // but Supabase client doesn't support raw SQL easily unless we use an RPC.
    console.error('RPC Error (get_column_defaults might not exist):', error);
    
    // Alternative: Try to insert with NO name and see what happens (it should fail if not null and no default)
    const { error: insertError } = await supabase.from('ancestors').insert({ owner_id: '973e6be3-71e4-46f5-8cd8-43eea52c4350' });
    console.log('Insert without name result:', insertError);
  } else {
    console.log('Column defaults:', data);
  }
}

checkColumnDefaults();
