
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parser for .env.local
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => line.split('=').map(s => s.trim()))
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    console.log('❌ DATABASE NOT READY: ' + error.message);
  } else {
    console.log('✅ DATABASE READY: "profiles" table exists.');
  }
}

checkTables();
