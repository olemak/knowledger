#!/usr/bin/env deno run --allow-all

import { ConfigManager } from './src/config.ts';
import { KnowledgeAPI } from './src/knowledge-api.ts';

// Test just the components without the full MCP server
async function testComponents() {
  console.log('🧪 Testing Deno MCP Server components...');
  
  try {
    // Test configuration
    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    console.log(`✅ Config loaded: ${config.api_endpoint}`);
    
    // Test API client
    const api = new KnowledgeAPI(configManager);
    const results = await api.listKnowledge({ limit: 1 });
    console.log(`✅ API client works: found ${results.total} entries`);
    
    console.log('✅ All components working! MCP server should work too.');
    
  } catch (error) {
    console.error('❌ Component test failed:', error);
  }
}

if (import.meta.main) {
  await testComponents();
}