const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('ancestors')
    .insert({
      owner_id: '973e6be3-71e4-46f5-8cd8-43eea52c4350',
      name: 'Test Ancestor ' + Date.now(),
      relationship: 'Testing',
      status: 'draft'
    })
    .select();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success:', data);
  }
}

testInsert();
