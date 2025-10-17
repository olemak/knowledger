import { Command } from '@cliffy/command';
import { green, red } from 'https://deno.land/std@0.218.2/fmt/colors.ts';

import { ConfigManager } from './config.ts';
import { KnowledgeAPI } from './knowledge-api.ts';
import { KnowledgerServer } from './server.ts';

async function testAPI(): Promise<void> {
  console.log('🧪 Testing Knowledger API connection...');
  
  try {
    const configManager = new ConfigManager();
    const api = new KnowledgeAPI(configManager);
    
    const config = configManager.getConfig();
    console.log(`📡 API Endpoint: ${config.api_endpoint}`);
    
    // Test with a simple list operation
    const result = await api.listKnowledge({ limit: 1 });
    console.log('✅ API connection successful!');
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
    Deno.exit(1);
  }
}

async function showConfig(): Promise<void> {
  console.log('⚙️ Current Knowledger Configuration:');
  
  try {
    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    
    console.log('📋 Configuration:');
    console.log(JSON.stringify(config, null, 2));
    
    const validation = configManager.validateConfig();
    if (validation.valid) {
      console.log(green('✅ Configuration is valid'));
    } else {
      console.log(red('❌ Configuration errors:'));
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    const currentProject = configManager.getCurrentProject();
    if (currentProject) {
      console.log(`📁 Current project: ${currentProject}`);
    }
    
    const configPaths = configManager.getConfigPaths();
    if (configPaths.length > 0) {
      console.log(`📄 Config files loaded: ${configPaths.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
    Deno.exit(1);
  }
}

async function initConfig(): Promise<void> {
  console.log('🚀 Initializing Knowledger configuration...');
  
  try {
    const configManager = new ConfigManager();
    await configManager.createSampleConfig();
    console.log('✅ Created .knowledgerrc in current directory');
    console.log('');
    console.log('You can now:');
    console.log('1. Edit .knowledgerrc to customize settings');
    console.log('2. Run "deno task cli config" to verify configuration');
    console.log('3. Run "deno task cli test" to test API connection');
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️ .knowledgerrc already exists in current directory');
    } else {
      console.error('❌ Failed to create configuration:', error);
      Deno.exit(1);
    }
  }
}

async function startServer(): Promise<void> {
  console.log('🚀 Starting Knowledger MCP server (Deno)...');
  const server = new KnowledgerServer();
  await server.start();
}

// Main CLI setup
const cli = new Command()
  .name('knowledger')
  .version('0.1.0')
  .description('Knowledger MCP - AI-powered knowledge management')
  .globalOption('-v, --verbose', 'Enable verbose logging')
  .action(() => {
    cli.showHelp();
  });

// Server command
cli.command('server')
  .description('Start the MCP server for AI chat integration')
  .action(async () => {
    await startServer();
  });

// Test command  
cli.command('test')
  .description('Test connection to the Knowledger API')
  .action(async () => {
    await testAPI();
  });

// Config command
cli.command('config')
  .description('Show current configuration')
  .action(async () => {
    await showConfig();
  });

// Init command
cli.command('init')
  .description('Initialize .knowledgerrc configuration file')
  .action(async () => {
    await initConfig();
  });

// Run the CLI
if (import.meta.main) {
  await cli.parse(Deno.args);
}