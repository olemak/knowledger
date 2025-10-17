import { exists } from "jsr:@std/fs@1";
import { dirname, join } from "jsr:@std/path@1";

export interface KnowledgerConfig {
  api_endpoint: string;
  default_tags: string[];
  project_name?: string;
}

export interface ConfigValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Hierarchical configuration manager for Knowledger
 * Loads config from .knowledgerrc files in current and parent directories
 */
export class ConfigManager {
  private config: KnowledgerConfig;
  private configPaths: string[] = [];

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get the current merged configuration
   */
  getConfig(): KnowledgerConfig {
    return { ...this.config };
  }

  /**
   * Load configuration from hierarchy of .knowledgerrc files
   */
  private loadConfig(): KnowledgerConfig {
    const defaultConfig: KnowledgerConfig = {
      api_endpoint: 'http://localhost:8000/api',
      default_tags: [],
    };

    // Find all .knowledgerrc files from current directory up to root
    const configFiles = this.findConfigFiles();
    this.configPaths = configFiles;

    let mergedConfig = { ...defaultConfig };

    // Load configs from root to current directory (parent configs first)
    for (const configPath of configFiles.reverse()) {
      try {
        const configText = Deno.readTextFileSync(configPath);
        const fileConfig = JSON.parse(configText) as Partial<KnowledgerConfig>;
        
        // Merge config (later configs override earlier ones)
        mergedConfig = {
          ...mergedConfig,
          ...fileConfig,
          default_tags: [
            ...(mergedConfig.default_tags || []),
            ...(fileConfig.default_tags || [])
          ]
        };
      } catch (error) {
        console.warn(`Warning: Could not load config from ${configPath}:`, error.message);
      }
    }

    return mergedConfig;
  }

  /**
   * Find all .knowledgerrc files from current directory to root
   */
  private findConfigFiles(): string[] {
    const configFiles: string[] = [];
    let currentDir = Deno.cwd();
    const root = Deno.build.os === 'windows' ? currentDir.split('\\')[0] + '\\' : '/';

    while (currentDir !== root) {
      const configPath = join(currentDir, '.knowledgerrc');
      
      try {
        if (Deno.statSync(configPath).isFile) {
          configFiles.push(configPath);
        }
      } catch {
        // File doesn't exist, continue
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) break; // Reached root
      currentDir = parentDir;
    }

    return configFiles;
  }

  /**
   * Validate the current configuration
   */
  validateConfig(): ConfigValidation {
    const errors: string[] = [];

    if (!this.config.api_endpoint) {
      errors.push('api_endpoint is required');
    } else {
      try {
        new URL(this.config.api_endpoint);
      } catch {
        errors.push('api_endpoint must be a valid URL');
      }
    }

    if (!Array.isArray(this.config.default_tags)) {
      errors.push('default_tags must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get the current project name (directory name or from config)
   */
  getCurrentProject(): string | null {
    if (this.config.project_name) {
      return this.config.project_name;
    }

    // Use current directory name as project
    const currentDir = Deno.cwd();
    const parts = currentDir.split(/[/\\]/);
    return parts[parts.length - 1] || null;
  }

  /**
   * Create a sample .knowledgerrc in the current directory
   */
  async createSampleConfig(): Promise<void> {
    const configPath = join(Deno.cwd(), '.knowledgerrc');
    
    if (await exists(configPath)) {
      throw new Error('.knowledgerrc already exists in current directory');
    }

    const sampleConfig: KnowledgerConfig = {
      api_endpoint: 'http://localhost:8000/api',
      default_tags: ['project', 'notes'],
      project_name: this.getCurrentProject() || 'my-project'
    };

    const configJson = JSON.stringify(sampleConfig, null, 2);
    await Deno.writeTextFile(configPath, configJson);
  }

  /**
   * Get all config file paths that were loaded
   */
  getConfigPaths(): string[] {
    return [...this.configPaths];
  }
}