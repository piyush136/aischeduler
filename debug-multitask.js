#!/usr/bin/env node

/**
 * Simple test to diagnose multi-task creation issue
 */

const axios = require('axios');

const MCP_URL = 'http://localhost:4000';
const BACKEND_URL = 'http://localhost:5000';

// Test with a fake token
const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2OGY1MGYyMzJkMDAwMDAxMTAwMDAwMSIsImlhdCI6MTcyMDc5MDk0MCwiZXhwIjoxNzUyMzI2OTQwfQ.test_token';

async function testMultipleTasks() {
  console.log('🧪 Testing Multi-Task Creation\n');

  try {
    // Test 1: Check if MCP server is responding
    console.log('1️⃣  Testing MCP Server...');
    try {
      const healthRes = await axios.get(`${MCP_URL}/health`, { timeout: 5000 });
      console.log('   ✅ MCP Server is running');
    } catch (err) {
      console.log('   ⚠️  MCP Server health check failed (normal if no health endpoint)');
    }

    // Test 2: Call the chat endpoint with multiple tasks
    console.log('\n2️⃣  Testing Chat Endpoint with Multiple Tasks...');
    const chatPayload = {
      message: 'Create three tasks: 1) Buy milk tomorrow at 2pm, 2) Call dentist next Wednesday at 10am, 3) Finish report by Friday',
      history: []
    };

    console.log('   Sending prompt:', chatPayload.message);
    const chatRes = await axios.post(`${MCP_URL}/mcp/chat`, chatPayload, {
      headers: { Authorization: `Bearer ${FAKE_TOKEN}` },
      timeout: 30000
    });

    console.log('   ✅ Chat endpoint responded');
    console.log('   Response:', {
      reply: chatRes.data.reply,
      toolUsed: chatRes.data.toolUsed,
      dataSuccess: chatRes.data.data?.success,
      dataSummary: chatRes.data.data?.summary
    });

    if (chatRes.data.toolUsed === 'add_multiple_tasks') {
      console.log('   ✅ LLM correctly identified add_multiple_tasks');
    } else {
      console.log('   ⚠️  LLM used:', chatRes.data.toolUsed);
    }

    // Test 3: Direct backend test
    console.log('\n3️⃣  Testing Backend Bulk Endpoint...');
    const bulkPayload = {
      tasks: [
        {
          title: 'Test Task 1',
          due_at: '2026-01-21T14:00:00',
          priority: 3,
          recurrence: 'NONE'
        },
        {
          title: 'Test Task 2',
          due_at: '2026-01-22T10:00:00',
          priority: 3,
          recurrence: 'NONE'
        }
      ]
    };

    try {
      const bulkRes = await axios.post(`${BACKEND_URL}/api/tasks/bulk`, bulkPayload, {
        headers: { Authorization: `Bearer ${FAKE_TOKEN}` },
        timeout: 10000
      });

      console.log('   ✅ Backend bulk endpoint responded');
      console.log('   Response:', {
        success: bulkRes.data.success,
        summary: bulkRes.data.summary
      });
    } catch (bulkErr) {
      console.log('   ❌ Backend bulk endpoint error:', bulkErr.response?.status, bulkErr.response?.data?.error);
    }

  } catch (err) {
    console.error('❌ Test Error:', err.message);
    if (err.response?.data) {
      console.error('   Response:', err.response.data);
    }
  }
}

testMultipleTasks();
