#!/usr/bin/env node

/**
 * Quick Test Script to Verify MCP Tool → Backend → LLM Connection
 * Run this to test if date handling is working correctly
 */

const axios = require('axios');
const { BACKEND_API_URL, MCP_PUBLIC_URL } = require('./config/api');

const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

console.log('🔍 Testing MCP → Backend Connection\n');
console.log('Configuration:');
console.log(`  MCP Server: ${MCP_PUBLIC_URL}`);
console.log(`  Backend: ${BACKEND_API_URL}`);
console.log(`  Token: ${TEST_TOKEN.substring(0, 10)}...\n`);

// Test Cases
const testCases = [
  {
    name: 'Tomorrow at 7am',
    message: 'Add a task called "Meeting" for tomorrow at 7am',
    expectedDatePattern: /202\d-\d{2}-\d{2}T07:00:00/
  },
  {
    name: 'Specific date at 3pm',
    message: 'Create task "Project Review" for January 25th at 3pm',
    expectedDatePattern: /2026-01-25T15:00:00/
  },
  {
    name: 'Next Monday',
    message: 'Add task "Weekly standup" for next Monday at 10am',
    expectedDatePattern: /T10:00:00/
  }
];

async function testMCPConnection() {
  try {
    console.log('Testing MCP Chat Connection...\n');
    
    const testMessage = 'What is today\'s date?';
    console.log(`Sending: "${testMessage}"`);
    
    const response = await axios.post(`${MCP_PUBLIC_URL}/chat`, {
      message: testMessage,
      history: []
    }, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });
    
    console.log('✅ MCP Connection OK');
    console.log(`Response: ${response.data.reply}\n`);
    return true;
  } catch (error) {
    console.error('❌ MCP Connection Failed');
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

async function testDateParsing() {
  console.log('Testing Date Parsing...\n');
  
  for (const testCase of testCases) {
    try {
      console.log(`Test: ${testCase.name}`);
      console.log(`Message: "${testCase.message}"`);
      
      const response = await axios.post(`${MCP_PUBLIC_URL}/chat`, {
        message: testCase.message,
        history: []
      }, {
        headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
      });
      
      const data = response.data;
      if (data.data && data.data.task && data.data.task.due_at) {
        const dueAt = data.data.task.due_at;
        const matches = testCase.expectedDatePattern.test(dueAt);
        
        if (matches) {
          console.log(`✅ Date Parsed Correctly: ${dueAt}`);
        } else {
          console.log(`⚠️  Date Pattern Mismatch`);
          console.log(`   Expected: ${testCase.expectedDatePattern}`);
          console.log(`   Got: ${dueAt}`);
        }
      } else {
        console.log(`⚠️  No task created or no due_at field`);
      }
      console.log();
    } catch (error) {
      console.error(`❌ Test Failed: ${error.message}\n`);
    }
  }
}

async function testBackendTaskCreation() {
  try {
    console.log('Testing Backend Task Creation...\n');
    
    const taskData = {
      title: 'Test Task',
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      priority: 3
    };
    
    console.log('Creating task with data:', taskData);
    
    const response = await axios.post(`${BACKEND_API_URL}/tasks`, taskData, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
    });
    
    console.log('✅ Backend Task Creation OK');
    console.log(`Created task: ${response.data._id}`);
    console.log(`Due at: ${response.data.due_at}\n`);
    return true;
  } catch (error) {
    console.error('❌ Backend Task Creation Failed');
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const mcpOk = await testMCPConnection();
  if (!mcpOk) {
    console.log('⚠️  Skipping further tests due to MCP connection failure\n');
    return;
  }
  
  await testDateParsing();
  await testBackendTaskCreation();
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('✅ Connection tests completed!\n');
  console.log('📝 Note: For accurate results, ensure:');
  console.log('   1. MCP Server is running');
  console.log('   2. Backend is running');
  console.log('   3. You have a valid authentication token');
  console.log('   4. Check logs in both terminals for debugging info\n');
}

runTests().catch(console.error);
