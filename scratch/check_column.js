const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificColumn() {
  const { data, error } = await supabase
    .from('ancestors')
    .select('advice_they_always_gave')
    .limit(1);

  if (error) {
    console.error('Error selecting column:', error);
  } else {
    console.log('Column "advice_they_always_gave" exists!');
  }
}

checkSpecificColumn();
