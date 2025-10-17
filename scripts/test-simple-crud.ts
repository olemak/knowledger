#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --env

// Simple CRUD test using direct HTTP requests
const BASE_URL = 'http://localhost:8000/api';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    results.push({ test: name, status: 'PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ 
      test: name, 
      status: 'FAIL', 
      details: error.message 
    });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

let createdId: string = '';

// Test 1: Create
await runTest('Create Knowledge Entry', async () => {
  const response = await fetch(`${BASE_URL}/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Knowledge Entry',
      content: 'This is a test entry to verify CRUD operations work.',
      tags: ['test', 'crud'],
      metadata: { source: 'deno-test' }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const data = await response.json();
  if (!data.id) {
    throw new Error('No ID returned from create operation');
  }

  createdId = data.id;
});

// Test 2: List
await runTest('List Knowledge Entries', async () => {
  const response = await fetch(`${BASE_URL}/knowledge`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const data = await response.json();
  if (!data.entries || !Array.isArray(data.entries)) {
    throw new Error('Invalid response format');
  }
});

// Test 3: Get specific entry (only if we created one)
if (createdId) {
  await runTest('Get Specific Knowledge Entry', async () => {
    const response = await fetch(`${BASE_URL}/knowledge/${createdId}`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    if (data.id !== createdId) {
      throw new Error('Retrieved entry ID does not match');
    }
  });

  // Test 4: Update
  await runTest('Update Knowledge Entry', async () => {
    const response = await fetch(`${BASE_URL}/knowledge/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Test Knowledge Entry',
        content: 'This content has been updated.',
        tags: ['test', 'crud', 'updated']
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    if (data.title !== 'Updated Test Knowledge Entry') {
      throw new Error('Update did not take effect');
    }
  });

  // Test 5: Search
  await runTest('Search Knowledge Entries', async () => {
    const response = await fetch(`${BASE_URL}/search?q=updated&tags=test`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    if (!data.entries || !Array.isArray(data.entries)) {
      throw new Error('Invalid search response format');
    }
  });

  // Test 6: Delete
  await runTest('Delete Knowledge Entry', async () => {
    const response = await fetch(`${BASE_URL}/knowledge/${createdId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
  });

  // Test 7: Verify deletion
  await runTest('Verify Deletion', async () => {
    const response = await fetch(`${BASE_URL}/knowledge/${createdId}`);
    
    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
  });
}

// Test error handling
await runTest('Handle Validation Error', async () => {
  const response = await fetch(`${BASE_URL}/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Missing required title and content
      tags: ['invalid']
    })
  });

  if (response.status !== 400) {
    throw new Error(`Expected 400, got ${response.status}`);
  }
});

// Summary
console.log('\n📊 Test Results Summary:');
console.log('========================');
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📋 Total:  ${results.length}`);

if (failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`   • ${r.test}: ${r.details}`);
  });
  Deno.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
}