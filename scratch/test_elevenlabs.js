const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
}

loadEnv();

async function testElevenLabs() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  
  console.log('Testing ElevenLabs API...');
  console.log('API Key:', apiKey ? 'Present (starts with ' + apiKey.slice(0, 5) + '...)' : 'Missing');
  console.log('Voice ID:', voiceId);

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: "Hello, this is a test of the Eternal Echo voice system.",
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (response.ok) {
      console.log('Success! API key is valid and synthesis worked.');
      const data = await response.arrayBuffer();
      console.log('Received audio buffer of size:', data.byteLength);
    } else {
      const error = await response.json();
      console.error('API Error:', response.status, response.statusText);
      console.error('Error Details:', JSON.stringify(error, null, 2));
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

testElevenLabs();
