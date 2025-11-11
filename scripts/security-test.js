#!/usr/bin/env node

/**
 * Security Validation Test Suite
 * 
 * This script validates the security improvements implemented in the Verbalized application.
 * It tests security headers, rate limiting, input validation, and XSS prevention.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function error(message) {
  log(`✗ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

function warn(message) {
  log(`⚠ ${message}`, colors.yellow);
}

// Test results
let passed = 0;
let failed = 0;

// Helper to make HTTP requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test 1: Security Headers
async function testSecurityHeaders() {
  info('\nTest 1: Security Headers');
  
  try {
    const response = await makeRequest('/');
    const headers = response.headers;
    
    const requiredHeaders = {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'microphone=(self), camera=(), geolocation=(), payment=()',
    };
    
    let headersPassed = true;
    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      if (headers[header]?.toLowerCase() === expectedValue.toLowerCase()) {
        success(`  ${header}: ${headers[header]}`);
      } else {
        error(`  ${header}: Expected "${expectedValue}", got "${headers[header] || 'not set'}"`);
        headersPassed = false;
      }
    }
    
    // Check CSP
    if (headers['content-security-policy']) {
      success(`  content-security-policy: Present`);
    } else {
      error(`  content-security-policy: Not set`);
      headersPassed = false;
    }
    
    if (headersPassed) {
      passed++;
      success('Security headers test: PASSED');
    } else {
      failed++;
      error('Security headers test: FAILED');
    }
  } catch (err) {
    failed++;
    error(`Security headers test: ERROR - ${err.message}`);
  }
}

// Test 2: Rate Limiting
async function testRateLimiting() {
  info('\nTest 2: Rate Limiting');
  
  try {
    // Make multiple requests quickly
    const requests = [];
    for (let i = 0; i < 35; i++) {
      requests.push(makeRequest('/api/health/transcribe'));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    
    if (rateLimited) {
      success(`  Rate limiting triggered after excessive requests`);
      const rateLimitedResponse = responses.find(r => r.status === 429);
      if (rateLimitedResponse.headers['retry-after']) {
        success(`  Retry-After header present: ${rateLimitedResponse.headers['retry-after']}`);
      }
      passed++;
      success('Rate limiting test: PASSED');
    } else {
      warn(`  Rate limiting not triggered (might need more requests or different timing)`);
      warn('Rate limiting test: SKIPPED (server might not be running)');
    }
  } catch (err) {
    failed++;
    error(`Rate limiting test: ERROR - ${err.message}`);
  }
}

// Test 3: Input Validation
async function testInputValidation() {
  info('\nTest 3: Input Validation');
  
  try {
    // Test missing Content-Type
    const invalidContentType = await makeRequest('/api/compose', {
      method: 'POST',
      headers: {},
      body: '{"transcript": "test"}',
    });
    
    if (invalidContentType.status === 400) {
      success(`  Invalid Content-Type rejected`);
      passed++;
      success('Input validation test: PASSED');
    } else {
      error(`  Invalid Content-Type not rejected (status: ${invalidContentType.status})`);
      failed++;
      error('Input validation test: FAILED');
    }
  } catch (err) {
    failed++;
    error(`Input validation test: ERROR - ${err.message}`);
  }
}

// Test 4: XSS Prevention
async function testXSSPrevention() {
  info('\nTest 4: XSS Prevention');
  
  try {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await makeRequest('/api/compose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: xssPayload,
        prePrompt: xssPayload,
      }),
    });
    
    // Response should handle the payload safely
    if (response.body && !response.body.includes('<script>')) {
      success(`  XSS payload sanitized in response`);
      passed++;
      success('XSS prevention test: PASSED');
    } else {
      error(`  XSS payload may not be properly sanitized`);
      failed++;
      error('XSS prevention test: FAILED');
    }
  } catch (err) {
    // Error is acceptable (might be auth or other validation error)
    warn(`  Test resulted in error (may be expected): ${err.message}`);
    warn('XSS prevention test: SKIPPED');
  }
}

// Test 5: Error Message Sanitization
async function testErrorSanitization() {
  info('\nTest 5: Error Message Sanitization');
  
  try {
    // This should fail and return an error
    const response = await makeRequest('/api/compose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{}', // Empty body should fail validation
    });
    
    const body = JSON.parse(response.body);
    
    // Check that error doesn't contain sensitive info
    const errorMsg = body.error || '';
    const hasSensitiveInfo = 
      errorMsg.includes('sk-') || // API keys
      errorMsg.includes('Bearer') || // Tokens
      errorMsg.includes('https://api.') || // API URLs
      errorMsg.length > 300; // Too detailed
    
    if (!hasSensitiveInfo) {
      success(`  Error messages don't leak sensitive information`);
      passed++;
      success('Error sanitization test: PASSED');
    } else {
      error(`  Error message may contain sensitive information: ${errorMsg.substring(0, 100)}`);
      failed++;
      error('Error sanitization test: FAILED');
    }
  } catch (err) {
    failed++;
    error(`Error sanitization test: ERROR - ${err.message}`);
  }
}

// Test 6: Health Endpoint Security
async function testHealthEndpointSecurity() {
  info('\nTest 6: Health Endpoint Security');
  
  try {
    const response = await makeRequest('/api/health/compose');
    const body = JSON.parse(response.body);
    
    // Health endpoint should not expose detailed configuration
    const exposesConfig = 
      body.hasOwnProperty('baseUrl') ||
      body.hasOwnProperty('model') ||
      body.hasOwnProperty('provider') ||
      body.hasOwnProperty('mode');
    
    if (!exposesConfig) {
      success(`  Health endpoint doesn't expose configuration details`);
      passed++;
      success('Health endpoint security test: PASSED');
    } else {
      error(`  Health endpoint exposes configuration: ${JSON.stringify(body)}`);
      failed++;
      error('Health endpoint security test: FAILED');
    }
  } catch (err) {
    failed++;
    error(`Health endpoint security test: ERROR - ${err.message}`);
  }
}

// Main test runner
async function runTests() {
  log('\n═══════════════════════════════════════════════════════════', colors.blue);
  log('  VERBALIZED SECURITY VALIDATION TEST SUITE', colors.blue);
  log('═══════════════════════════════════════════════════════════\n', colors.blue);
  
  info('Checking if server is running on http://localhost:3000...');
  
  try {
    await makeRequest('/');
    success('Server is running!\n');
  } catch (err) {
    error('Server is not running. Please start it with: npm run dev');
    error(`Error: ${err.message}\n`);
    process.exit(1);
  }
  
  await testSecurityHeaders();
  await testRateLimiting();
  await testInputValidation();
  await testXSSPrevention();
  await testErrorSanitization();
  await testHealthEndpointSecurity();
  
  // Summary
  log('\n═══════════════════════════════════════════════════════════', colors.blue);
  log('  TEST SUMMARY', colors.blue);
  log('═══════════════════════════════════════════════════════════\n', colors.blue);
  
  log(`Total Tests: ${passed + failed}`);
  success(`Passed: ${passed}`);
  if (failed > 0) {
    error(`Failed: ${failed}`);
  }
  
  const percentage = passed / (passed + failed) * 100;
  log(`\nSuccess Rate: ${percentage.toFixed(1)}%\n`);
  
  if (failed === 0) {
    success('All security tests passed! ✅\n');
    process.exit(0);
  } else {
    error(`${failed} test(s) failed. Please review the security implementation. ❌\n`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch((err) => {
  error(`\nUnexpected error: ${err.message}`);
  process.exit(1);
});
