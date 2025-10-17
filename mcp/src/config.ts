import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface KnowledgerConfig {
  api_endpoint?: string;
  user_token?: string;
  default_project?: string;
  default_tags?: string[];
  workspace?: string;
}

/**
 * Configuration manager that loads .knowledgerrc files hierarchically
 * Similar to how git config works:
 * 1. Current directory .knowledgerrc
 * 2. Parent directories (recursive search)
 * 3. Home directory ~/.knowledgerrc
 * 4. System defaults
 */
export class ConfigManager {
  private config: KnowledgerConfig = {};
  private configLoaded = false;

  /**
   * Get merged configuration from all sources
   */
  getConfig(): KnowledgerConfig {
    if (!this.configLoaded) {
      this.loadConfig();
      this.configLoaded = true;
    }
    return this.config;
  }

  /**
   * Load configuration from all possible sources
   */
  private loadConfig(): void {
    // Start with defaults
    this.config = {
      api_endpoint: 'http://localhost:8000/api',
      default_tags: [],
      ...this.config
    };

    // Load from home directory first (lowest priority)
    this.loadConfigFile(path.join(os.homedir(), '.knowledgerrc'));

    // Load from current directory and parent directories (higher priority)
    this.loadConfigFromDirectory(process.cwd());
  }

  /**
   * Recursively search for and load .knowledgerrc files from directory tree
   */
  private loadConfigFromDirectory(dir: string): void {
    const configPath = path.join(dir, '.knowledgerrc');
    this.loadConfigFile(configPath);

    // Continue searching up the directory tree
    const parentDir = path.dirname(dir);
    if (parentDir !== dir) { // Not at root
      this.loadConfigFromDirectory(parentDir);
    }
  }

  /**
   * Load configuration from a specific file
   */
  private loadConfigFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileConfig = JSON.parse(content);
        
        // Merge with existing config (file config takes precedence)
        this.config = {
          ...this.config,
          ...fileConfig
        };

        console.error(`Loaded config from: ${filePath}`);
      }
    } catch (error) {
      console.error(`Warning: Failed to load config from ${filePath}:`, error);
    }
  }

  /**
   * Get current project name based on directory or config
   */
  getCurrentProject(): string | undefined {
    const config = this.getConfig();
    
    // Use explicit project from config
    if (config.default_project) {
      return config.default_project;
    }

    // Use current directory name as project
    const currentDir = path.basename(process.cwd());
    if (currentDir && currentDir !== '/') {
      return currentDir;
    }

    return undefined;
  }

  /**
   * Create a sample .knowledgerrc file in the current directory
   */
  createSampleConfig(): void {
    const sampleConfig: KnowledgerConfig = {
      api_endpoint: 'http://localhost:8000/api',
      default_project: path.basename(process.cwd()),
      default_tags: ['project', 'learning'],
      workspace: 'personal'
    };

    const configPath = path.join(process.cwd(), '.knowledgerrc');
    
    if (fs.existsSync(configPath)) {
      throw new Error('.knowledgerrc already exists in current directory');
    }

    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
    console.error(`Created sample config at: ${configPath}`);
  }

  /**
   * Validate current configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    // Check API endpoint
    if (!config.api_endpoint) {
      errors.push('Missing api_endpoint configuration');
    } else {
      try {
        new URL(config.api_endpoint);
      } catch {
        errors.push('Invalid api_endpoint URL format');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}