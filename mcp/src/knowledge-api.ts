import { ConfigManager } from './config.js';

export interface SaveKnowledgeParams {
  title: string;
  content: string;
  tags?: string[];
  project?: string;
  metadata?: Record<string, any>;
}

export interface SearchKnowledgeParams {
  query: string;
  tags?: string[];
  project?: string;
  limit?: number;
}

export interface ListKnowledgeParams {
  limit?: number;
  project?: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  project?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeResponse {
  entries: KnowledgeEntry[];
  total: number;
  has_more?: boolean;
}

/**
 * API client for communicating with the Knowledger API server
 */
export class KnowledgeAPI {
  private baseURL: string;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    const config = this.configManager.getConfig();
    this.baseURL = config.api_endpoint || 'http://localhost:8000/api';
  }

  /**
   * Save a knowledge entry
   */
  async saveKnowledge(params: SaveKnowledgeParams): Promise<KnowledgeEntry> {
    const response = await this.makeRequest('POST', '/knowledge', {
      title: params.title,
      content: params.content,
      tags: params.tags || [],
      metadata: params.metadata || {}
    });

    if (!response.ok) {
      throw new Error(`Failed to save knowledge: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Search knowledge entries
   */
  async searchKnowledge(params: SearchKnowledgeParams): Promise<KnowledgeResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.query);
    
    if (params.tags && params.tags.length > 0) {
      searchParams.set('tags', params.tags.join(','));
    }
    
    if (params.project) {
      searchParams.set('project_id', params.project);
    }
    
    if (params.limit) {
      searchParams.set('limit', params.limit.toString());
    }

    const response = await this.makeRequest('GET', `/search?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to search knowledge: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeResponse;
  }

  /**
   * List knowledge entries
   */
  async listKnowledge(params: ListKnowledgeParams = {}): Promise<KnowledgeResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.limit) {
      searchParams.set('limit', params.limit.toString());
    }
    
    if (params.project) {
      searchParams.set('project_id', params.project);
    }

    const url = searchParams.toString() ? `/knowledge?${searchParams.toString()}` : '/knowledge';
    const response = await this.makeRequest('GET', url);

    if (!response.ok) {
      throw new Error(`Failed to list knowledge: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    // Transform the API response format to match our interface
    return {
      entries: data.entries || [],
      total: data.total || 0,
      has_more: data.has_more || false
    };
  }

  /**
   * Make HTTP request to the API
   */
  private async makeRequest(method: string, path: string, body?: any): Promise<Response> {
    const url = `${this.baseURL}${path}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'knowledger-mcp/0.1.0'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw new Error('Unknown network error');
    }
  }
}