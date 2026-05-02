
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => {
        const parts = line.split('=');
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        return [key, value];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, audio_url, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching messages:', error);
    return;
  }

  console.log('Latest messages:');
  data.forEach(m => {
    console.log(`[${m.role}] ${m.content.slice(0, 50)}...`);
    console.log(`Audio URL: ${m.audio_url}`);
    console.log('---');
  });
}

checkMessages();
