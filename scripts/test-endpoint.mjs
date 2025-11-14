#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createRequire } from 'module';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'https://s6gx8tcxjuuwmf.api.runpod.ai';
const API_KEY = process.env.RUNPOD_API_KEY || (() => {
  try {
    const env = readFileSync('.env', 'utf-8');
    const match = env.match(/^RUNPOD_API_KEY=(.+)$/m);
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
  } catch {
    return null;
  }
})();

if (!API_KEY) {
  console.error('❌ Error: RUNPOD_API_KEY not found in .env or environment');
  process.exit(1);
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTime(seconds) {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(2)}ms`;
  }
  return `${seconds.toFixed(2)}s`;
}

async function makeRequest(path, method = 'GET', body = null) {
  const url = `${ENDPOINT_URL}${path}`;
  const startTime = process.hrtime.bigint();
  
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const endTime = process.hrtime.bigint();
    const elapsedMs = Number(endTime - startTime) / 1_000_000;
    const elapsedSeconds = elapsedMs / 1000;
    
    let responseBody;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
      timeMs: elapsedMs,
      timeSeconds: elapsedSeconds,
      success: response.ok,
    };
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const elapsedMs = Number(endTime - startTime) / 1_000_000;
    const elapsedSeconds = elapsedMs / 1000;
    
    return {
      error: error.message,
      timeMs: elapsedMs,
      timeSeconds: elapsedSeconds,
      success: false,
    };
  }
}

async function testPing() {
  log('\n📡 Testing /ping endpoint...', 'cyan');
  const result = await makeRequest('/ping');
  
  if (result.success && result.status === 200) {
    log(`✅ Ping successful: ${result.status} ${JSON.stringify(result.body)}`, 'green');
  } else if (result.status === 204) {
    log(`⚠️  Ping returned 204 (initializing)`, 'yellow');
  } else {
    log(`❌ Ping failed: ${result.status} ${result.statusText || result.error}`, 'red');
  }
  log(`   Time: ${formatTime(result.timeSeconds)}`, 'blue');
  return result;
}

async function testWeatherTool() {
  log('\n🌤️  Testing weather tool...', 'cyan');
  const result = await makeRequest(
    '/api/tools/get-weather/execute',
    'POST',
    { data: { location: 'Berlin' } }
  );
  
  if (result.success && result.status === 200) {
    log(`✅ Weather tool successful: ${result.status}`, 'green');
    log(`   Response: ${JSON.stringify(result.body)}`, 'blue');
  } else if (result.status === 430) {
    log(`⚠️  No workers available (430) - cold start or scaling issue`, 'yellow');
  } else {
    log(`❌ Weather tool failed: ${result.status} ${result.statusText || result.error}`, 'red');
    if (result.body) {
      log(`   Error: ${JSON.stringify(result.body)}`, 'red');
    }
  }
  log(`   Time: ${formatTime(result.timeSeconds)}`, 'blue');
  return result;
}

async function runColdStartTest() {
  log('\n🧊 COLD START TEST', 'bright');
  log('   (Testing first request when workers are idle)', 'blue');
  log('   This may take 30+ seconds if workers need to spin up...\n', 'yellow');
  
  const result = await testWeatherTool();
  
  if (result.success) {
    log(`\n✅ Cold start successful!`, 'green');
    log(`   Total time: ${formatTime(result.timeSeconds)}`, 'bright');
  } else if (result.status === 430) {
    log(`\n⚠️  Cold start: No workers available after ${formatTime(result.timeSeconds)}`, 'yellow');
    log(`   This indicates workers need to spin up`, 'yellow');
  } else {
    log(`\n❌ Cold start failed after ${formatTime(result.timeSeconds)}`, 'red');
  }
  
  return result;
}

async function runWarmRequestTest() {
  log('\n🔥 WARM REQUEST TEST', 'bright');
  log('   (Testing subsequent requests with worker already running)\n', 'blue');
  
  const results = [];
  for (let i = 1; i <= 3; i++) {
    log(`Request ${i}/3...`, 'cyan');
    const result = await testWeatherTool();
    results.push(result);
    
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
    }
  }
  
  const successful = results.filter(r => r.success);
  const avgTime = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.timeSeconds, 0) / successful.length
    : 0;
  
  log(`\n📊 Warm request results:`, 'bright');
  log(`   Successful: ${successful.length}/3`, successful.length === 3 ? 'green' : 'yellow');
  log(`   Average time: ${formatTime(avgTime)}`, 'blue');
  
  return results;
}

async function main() {
  log('🚀 Runpod Endpoint Test Suite', 'bright');
  log(`   Endpoint: ${ENDPOINT_URL}\n`, 'blue');
  
  const results = {
    ping: null,
    coldStart: null,
    warmRequests: null,
  };
  
  // Test ping
  results.ping = await testPing();
  
  // Wait a bit before cold start test
  log('\n⏳ Waiting 2 seconds before cold start test...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Cold start test
  results.coldStart = await runColdStartTest();
  
  // Wait a bit before warm request test
  log('\n⏳ Waiting 2 seconds before warm request test...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Warm request test
  results.warmRequests = await runWarmRequestTest();
  
  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('📋 TEST SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  
  log(`\n📡 Ping:`, 'cyan');
  if (results.ping.success) {
    log(`   ✅ ${results.ping.status} - ${formatTime(results.ping.timeSeconds)}`, 'green');
  } else {
    log(`   ❌ Failed - ${formatTime(results.ping.timeSeconds)}`, 'red');
  }
  
  log(`\n🧊 Cold Start:`, 'cyan');
  if (results.coldStart.success) {
    log(`   ✅ ${results.coldStart.status} - ${formatTime(results.coldStart.timeSeconds)}`, 'green');
  } else if (results.coldStart.status === 430) {
    log(`   ⚠️  430 (No workers) - ${formatTime(results.coldStart.timeSeconds)}`, 'yellow');
  } else {
    log(`   ❌ Failed - ${formatTime(results.coldStart.timeSeconds)}`, 'red');
  }
  
  log(`\n🔥 Warm Requests:`, 'cyan');
  const successfulWarm = results.warmRequests.filter(r => r.success);
  if (successfulWarm.length > 0) {
    const avgTime = successfulWarm.reduce((sum, r) => sum + r.timeSeconds, 0) / successfulWarm.length;
    const minTime = Math.min(...successfulWarm.map(r => r.timeSeconds));
    const maxTime = Math.max(...successfulWarm.map(r => r.timeSeconds));
    log(`   ✅ ${successfulWarm.length}/3 successful`, 'green');
    log(`   ⏱️  Average: ${formatTime(avgTime)}`, 'blue');
    log(`   ⏱️  Min: ${formatTime(minTime)}, Max: ${formatTime(maxTime)}`, 'blue');
  } else {
    log(`   ❌ All failed`, 'red');
  }
  
  log('\n' + '='.repeat(60) + '\n', 'bright');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

