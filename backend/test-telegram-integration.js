/**
 * Test Script for Telegram Bot Integration
 * Tests linking code generation, webhook connectivity, and task APIs
 * 
 * Usage: node test-telegram-integration.js [token]
 * 
 * Example with JWT token:
 * node test-telegram-integration.js "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const jwtToken = process.argv[2]; // Pass JWT token as command line argument

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  validateStatus: () => true // Don't throw on any status
});

// Add auth header if token provided
if (jwtToken) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
}

async function runTests() {
  console.log('🧪 Starting Telegram Bot Integration Tests\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔐 Auth Token: ${jwtToken ? '✅ Provided' : '❌ Not provided (tests requiring auth will fail)'}\n`);

  const results = [];

  // Test 1: Generate Linking Code
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Generate Linking Code (POST /telegram/link-code)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const response = await apiClient.post('/telegram/link-code');
    
    if (response.status === 401) {
      console.log('❌ FAILED - Unauthorized (JWT token required)\n');
      results.push({ test: 'Generate Linking Code', status: 'FAILED', reason: 'Unauthorized' });
    } else if (response.status === 200 && response.data.success) {
      console.log('✅ SUCCESS');
      console.log(`   - Linking Code: ${response.data.linking_code}`);
      console.log(`   - Expires: ${response.data.expires_in_minutes} minutes`);
      console.log(`   - Message: ${response.data.message}\n`);
      results.push({ test: 'Generate Linking Code', status: 'PASSED', code: response.data.linking_code });
    } else {
      console.log(`❌ FAILED - Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}\n`);
      results.push({ test: 'Generate Linking Code', status: 'FAILED', reason: `Status ${response.status}` });
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}\n`);
    results.push({ test: 'Generate Linking Code', status: 'ERROR', reason: error.message });
  }

  // Test 2: Webhook Health Check (POST /telegram/webhook with minimal data)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Webhook Health Check (POST /telegram/webhook)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const webhookData = {
      update_id: 123456789,
      message: {
        message_id: 1,
        from: {
          id: '987654321',
          is_bot: false,
          first_name: 'Test',
          username: 'testuser'
        },
        text: '/start'
      }
    };

    const response = await apiClient.post('/telegram/webhook', webhookData);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS - Webhook accepted');
      console.log(`   - Status Code: ${response.status}`);
      console.log(`   - Response: ${JSON.stringify(response.data)}\n`);
      results.push({ test: 'Webhook Health Check', status: 'PASSED' });
    } else {
      console.log(`❌ FAILED - Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}\n`);
      results.push({ test: 'Webhook Health Check', status: 'FAILED', reason: `Status ${response.status}` });
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}\n`);
    results.push({ test: 'Webhook Health Check', status: 'ERROR', reason: error.message });
  }

  // Test 3: Get User Tasks
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: Get User Tasks (GET /telegram/tasks)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const response = await apiClient.get('/telegram/tasks?limit=3');
    
    if (response.status === 401) {
      console.log('❌ FAILED - Unauthorized (JWT token required)\n');
      results.push({ test: 'Get User Tasks', status: 'FAILED', reason: 'Unauthorized' });
    } else if (response.status === 200) {
      console.log('✅ SUCCESS');
      console.log(`   - Success: ${response.data.success}`);
      console.log(`   - Tasks Found: ${response.data.tasks.length}`);
      if (response.data.tasks.length > 0) {
        console.log(`   - First Task: ${response.data.tasks[0].title}`);
      }
      console.log(`   - Message Preview: ${response.data.message.substring(0, 50)}...\n`);
      results.push({ test: 'Get User Tasks', status: 'PASSED', taskCount: response.data.tasks.length });
    } else {
      console.log(`❌ FAILED - Status ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}\n`);
      results.push({ test: 'Get User Tasks', status: 'FAILED', reason: `Status ${response.status}` });
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}\n`);
    results.push({ test: 'Get User Tasks', status: 'ERROR', reason: error.message });
  }

  // Test 4: Backend Health Check
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 4: Backend Health Check (GET /)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const response = await apiClient.get('/');
    
    if (response.status === 200) {
      console.log('✅ SUCCESS - Backend is running');
      console.log(`   - Message: ${response.data}\n`);
      results.push({ test: 'Backend Health Check', status: 'PASSED' });
    } else {
      console.log(`❌ FAILED - Status ${response.status}\n`);
      results.push({ test: 'Backend Health Check', status: 'FAILED', reason: `Status ${response.status}` });
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}\n`);
    results.push({ test: 'Backend Health Check', status: 'ERROR', reason: error.message });
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0, failed = 0, errors = 0;
  
  results.forEach((result) => {
    const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.status}`);
    if (result.reason) console.log(`   └─ ${result.reason}`);
    
    if (result.status === 'PASSED') passed++;
    else if (result.status === 'FAILED') failed++;
    else errors++;
  });

  console.log(`\n📈 Results: ${passed} passed, ${failed} failed, ${errors} errors\n`);

  if (failed === 0 && errors === 0) {
    console.log('🎉 All tests passed! Telegram bot integration is ready.\n');
  } else if (errors > 0) {
    console.log('⚠️  Some tests had errors. Check your backend connection.\n');
  } else {
    console.log('⚠️  Some tests failed. Review the output above.\n');
  }

  // Print instructions
  console.log('📝 NEXT STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. To run tests with authentication, first get a JWT token:');
  console.log('   - Login to the web app');
  console.log('   - Copy the auth token from browser localStorage: localStorage.getItem("authToken")');
  console.log('   - Run: node test-telegram-integration.js "YOUR_JWT_TOKEN"\n');
  console.log('2. To test with Telegram bot:');
  console.log('   - Get your Telegram bot token from @BotFather');
  console.log('   - Start the backend: npm run dev');
  console.log('   - Send /start to your bot in Telegram\n');
  console.log('3. To test webhook locally:');
  console.log('   - Install ngrok: https://ngrok.com/');
  console.log('   - Run: ngrok http 5000');
  console.log('   - Set TELEGRAM_WEBHOOK_URL to the ngrok HTTPS URL\n');
}

runTests().catch(console.error);
