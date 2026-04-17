#!/usr/bin/env node

/**
 * Multi-Task Creation Test Suite
 * Tests the bulk task creation feature end-to-end
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';
const MCP_BASE = 'http://localhost:3002';

// Test credentials (you'll need to set these)
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

let authToken = null;

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  test: (msg) => console.log(`${colors.blue}[TEST]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[✓]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[✗]${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠]${colors.reset} ${msg}`)
};

async function authenticate() {
  try {
    log.test('Authenticating test user...');
    const res = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    authToken = res.data.token;
    log.success(`Authenticated. Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (err) {
    log.error(`Authentication failed: ${err.message}`);
    return false;
  }
}

async function testBulkBackendEndpoint() {
  try {
    log.test('Testing backend bulk task creation endpoint...');
    
    const tasksPayload = {
      tasks: [
        {
          title: 'Buy groceries',
          due_at: '2026-01-20T14:00:00',
          priority: 3,
          description: 'Milk, eggs, bread'
        },
        {
          title: 'Call dentist',
          due_at: '2026-01-21T10:00:00',
          priority: 2,
          description: 'Schedule appointment'
        },
        {
          title: 'Finish project report',
          due_at: '2026-01-22T17:00:00',
          priority: 1,
          description: 'Complete and submit'
        }
      ]
    };

    const res = await axios.post(
      `${API_BASE}/tasks/bulk`,
      tasksPayload,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (res.data.success) {
      log.success(`Bulk endpoint created ${res.data.summary.created} tasks`);
      log.info(`Summary: Created=${res.data.summary.created}, Synced=${res.data.summary.synced}, Failed=${res.data.summary.failed}`);
      return true;
    } else {
      log.error(`Bulk endpoint returned failure`);
      return false;
    }
  } catch (err) {
    log.error(`Bulk endpoint test failed: ${err.message}`);
    if (err.response?.data) {
      console.log(err.response.data);
    }
    return false;
  }
}

async function testMCPBulkTool() {
  try {
    log.test('Testing MCP add_multiple_tasks tool via chat endpoint...');
    
    const chatPayload = {
      message: 'Create these tasks: 1) Buy milk tomorrow at 2pm (urgent), 2) Call the doctor next Wednesday at 10am, 3) Finish presentation by Friday evening',
      history: []
    };

    const res = await axios.post(
      `${MCP_BASE}/chat`,
      chatPayload,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    log.info(`MCP Response: ${res.data.reply}`);
    
    if (res.data.toolUsed === 'add_multiple_tasks') {
      log.success(`MCP correctly identified bulk operation and used add_multiple_tasks`);
      const toolResult = res.data.data;
      log.info(`Result: Created=${toolResult.summary.created}, Synced=${toolResult.summary.synced}`);
      return true;
    } else if (res.data.data?.success) {
      log.warn(`MCP used ${res.data.toolUsed} instead of add_multiple_tasks, but still succeeded`);
      return true;
    } else {
      log.error(`MCP request did not return expected results`);
      return false;
    }
  } catch (err) {
    log.error(`MCP bulk tool test failed: ${err.message}`);
    if (err.response?.data) {
      console.log(err.response.data);
    }
    return false;
  }
}

async function testValidation() {
  try {
    log.test('Testing validation (empty tasks array should fail)...');
    
    const tasksPayload = {
      tasks: []
    };

    try {
      await axios.post(
        `${API_BASE}/tasks/bulk`,
        tasksPayload,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      log.error(`Validation should have failed for empty array`);
      return false;
    } catch (err) {
      if (err.response?.status === 400) {
        log.success(`Validation correctly rejected empty tasks array`);
        return true;
      } else {
        log.error(`Unexpected error response: ${err.message}`);
        return false;
      }
    }
  } catch (err) {
    log.error(`Validation test failed: ${err.message}`);
    return false;
  }
}

async function testMaxLimit() {
  try {
    log.test('Testing maximum task limit (51 tasks should fail)...');
    
    const tasks = Array.from({ length: 51 }, (_, i) => ({
      title: `Task ${i + 1}`,
      due_at: '2026-01-20T09:00:00',
      priority: 3
    }));

    try {
      await axios.post(
        `${API_BASE}/tasks/bulk`,
        { tasks },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      log.error(`Should have rejected 51 tasks`);
      return false;
    } catch (err) {
      if (err.response?.status === 400) {
        log.success(`Correctly rejected 51 tasks (limit is 50)`);
        return true;
      } else {
        log.error(`Unexpected error response: ${err.message}`);
        return false;
      }
    }
  } catch (err) {
    log.error(`Max limit test failed: ${err.message}`);
    return false;
  }
}

async function testSingleTaskWithBulkTool() {
  try {
    log.test('Testing MCP with single task (should determine best tool)...');
    
    const chatPayload = {
      message: 'Create a task: Buy milk tomorrow at 3pm',
      history: []
    };

    const res = await axios.post(
      `${MCP_BASE}/chat`,
      chatPayload,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    log.info(`MCP Response: ${res.data.reply}`);
    log.info(`Tool used: ${res.data.toolUsed}`);
    
    if (res.data.data?.success || res.data.data?.task) {
      log.success(`Single task was processed successfully`);
      return true;
    } else {
      log.error(`Single task processing failed`);
      return false;
    }
  } catch (err) {
    log.error(`Single task test failed: ${err.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Multi-Task Creation Test Suite${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

  // Check if servers are running
  try {
    await axios.get(`${API_BASE}/health`);
  } catch (err) {
    log.error(`Backend not running at ${API_BASE}`);
    process.exit(1);
  }

  if (!await authenticate()) {
    log.error('Cannot continue without authentication');
    process.exit(1);
  }

  const results = [];

  log.info('Running tests...\n');

  results.push(['Backend Bulk Endpoint', await testBulkBackendEndpoint()]);
  results.push(['Validation (Empty Array)', await testValidation()]);
  results.push(['Max Limit (51 Tasks)', await testMaxLimit()]);
  results.push(['Single Task Processing', await testSingleTaskWithBulkTool()]);
  results.push(['MCP Bulk Tool', await testMCPBulkTool()]);

  // Summary
  console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Test Results${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  results.forEach(([name, success]) => {
    const icon = success ? colors.green + '✓' : colors.red + '✗';
    const status = success ? 'PASSED' : 'FAILED';
    console.log(`${icon}${colors.reset} ${name}: ${status}`);
    if (success) passed++;
    else failed++;
  });

  console.log(`\n${colors.cyan}Total: ${passed} passed, ${failed} failed${colors.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(err => {
    log.error(`Test suite failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  testBulkBackendEndpoint,
  testMCPBulkTool,
  testValidation,
  testMaxLimit
};
