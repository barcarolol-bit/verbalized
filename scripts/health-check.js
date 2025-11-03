#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function checkHealth(endpoint, name) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    if (data.ok) {
      console.log(`✅ PASS: ${name}`);
      console.log(`   ${JSON.stringify(data)}`);
    } else {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function main() {
  console.log('Running health checks...\n');
  
  await checkHealth('/api/health/transcribe', 'Transcribe (Local Whisper)');
  console.log('');
  await checkHealth('/api/health/compose', 'Compose (Ollama Cloud)');
  
  console.log('\nHealth check complete.');
}

main();

