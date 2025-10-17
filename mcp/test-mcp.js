#!/usr/bin/env node

import { spawn } from 'child_process';

// Test the MCP server by sending protocol messages
async function testMCP() {
  console.log('🧪 Testing MCP server functionality...\n');
  
  const server = spawn('node', ['dist/cli.js', 'server'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  // Helper to send JSON-RPC message
  function sendMessage(message) {
    const json = JSON.stringify(message);
    server.stdin.write(json + '\n');
  }

  // Helper to read response
  function waitForResponse(timeout = 5000) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, timeout);

      const handler = (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              clearTimeout(timer);
              server.stdout.off('data', handler);
              resolve(response);
              return;
            } catch (e) {
              // Not valid JSON, continue
            }
          }
        }
      };

      server.stdout.on('data', handler);
    });
  }

  try {
    // 1. Initialize connection
    console.log('📡 Initializing MCP connection...');
    sendMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    });

    const initResponse = await waitForResponse();
    console.log('✅ Initialize response:', JSON.stringify(initResponse, null, 2));

    // 2. List available tools
    console.log('\n🔧 Listing available tools...');
    sendMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    const toolsResponse = await waitForResponse();
    console.log('✅ Tools available:', JSON.stringify(toolsResponse, null, 2));

    // 3. Test save_knowledge tool
    console.log('\n💾 Testing save_knowledge tool...');
    sendMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'save_knowledge',
        arguments: {
          title: 'MCP Test Entry',
          content: 'This is a test knowledge entry created via MCP',
          tags: ['mcp', 'test'],
          type: 'note'
        }
      }
    });

    const saveResponse = await waitForResponse();
    console.log('✅ Save response:', JSON.stringify(saveResponse, null, 2));

    // 4. Test search_knowledge tool
    console.log('\n🔍 Testing search_knowledge tool...');
    sendMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'search_knowledge',
        arguments: {
          query: 'MCP test'
        }
      }
    });

    const searchResponse = await waitForResponse();
    console.log('✅ Search response:', JSON.stringify(searchResponse, null, 2));

    console.log('\n🎉 All MCP tests completed successfully!');

  } catch (error) {
    console.error('❌ MCP test failed:', error.message);
  } finally {
    server.kill();
    process.exit(0);
  }
}

testMCP().catch(console.error);