#!/usr/bin/env node
import { KnowledgerServer } from './server.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'server':
      // Start the MCP server
      const server = new KnowledgerServer();
      await server.start();
      break;

    case 'test':
      // Simple test of the knowledge API
      await testKnowledgeAPI();
      break;

    case 'config':
      // Show current configuration
      await showConfig();
      break;

    case 'init':
      // Initialize configuration
      await initConfig();
      break;

    default:
      console.log(`
Knowledger MCP CLI

Usage:
  knowledger server    Start the MCP server
  knowledger test      Test connection to API
  knowledger config    Show current configuration
  knowledger init      Initialize .knowledgerrc in current directory

Examples:
  knowledger server    # Start MCP server for AI chat integration
  knowledger test      # Test if API is accessible
`);
      process.exit(1);
  }
}

async function testKnowledgeAPI() {
  console.log('🧪 Testing Knowledger API connection...');
  
  const { ConfigManager } = await import('./config.js');
  const { KnowledgeAPI } = await import('./knowledge-api.js');
  
  try {
    const configManager = new ConfigManager();
    const api = new KnowledgeAPI(configManager);
    
    const config = configManager.getConfig();
    console.log(`📡 API Endpoint: ${config.api_endpoint}`);
    
    // Test with a simple list operation
    const result = await api.listKnowledge({ limit: 1 });
    console.log(`✅ API connection successful!`);
    console.log(`📊 Found ${result.total} knowledge entries`);
    
    if (result.entries.length > 0) {
      const entry = result.entries[0];
      console.log(`📝 Latest entry: "${entry.title}" (${entry.created_at})`);
    }
    
  } catch (error) {
    console.error('❌ API connection failed:', error);
    console.error('');
    console.error('Make sure:');
    console.error('1. The Knowledger API server is running (http://localhost:8000)');
    console.error('2. Your .knowledgerrc configuration is correct');
    process.exit(1);
  }
}

async function showConfig() {
  console.log('⚙️ Current Knowledger Configuration:');
  
  const { ConfigManager } = await import('./config.js');
  
  try {
    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    
    console.log('📋 Configuration:');
    console.log(JSON.stringify(config, null, 2));
    
    const validation = configManager.validateConfig();
    if (validation.valid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration errors:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    const currentProject = configManager.getCurrentProject();
    if (currentProject) {
      console.log(`📁 Current project: ${currentProject}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    process.exit(1);
  }
}

async function initConfig() {
  console.log('🚀 Initializing Knowledger configuration...');
  
  const { ConfigManager } = await import('./config.js');
  
  try {
    const configManager = new ConfigManager();
    configManager.createSampleConfig();
    console.log('✅ Created .knowledgerrc in current directory');
    console.log('');
    console.log('You can now:');
    console.log('1. Edit .knowledgerrc to customize settings');
    console.log('2. Run "knowledger config" to verify configuration');
    console.log('3. Run "knowledger test" to test API connection');
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️ .knowledgerrc already exists in current directory');
    } else {
      console.error('❌ Failed to create configuration:', error);
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
