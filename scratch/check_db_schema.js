const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking ancestors table schema and content...');
  
  // Try to fetch one record to see columns
  const { data, error } = await supabase
    .from('ancestors')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching ancestors:', error);
  } else {
    console.log('Successfully fetched ancestors sample:', data);
    if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]));
    }
  }

  // Check count
  const { count, error: countError } = await supabase
    .from('ancestors')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('Error fetching count:', countError);
  } else {
    console.log('Total ancestors in DB:', count);
  }
}

checkSchema();
