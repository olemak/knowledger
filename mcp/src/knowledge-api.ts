import type { ConfigManager } from './config.ts';

export interface KnowledgeReference {
  uri: string;
  title: string;
  attributed_to?: string;
  type: 'citation' | 'testimony';
  statement?: string;
}

export interface KnowledgeTrait {
  key: string;
  value: string;
  embedding?: number[];
  parent_id?: string;
  confidence?: number;
}

export interface SaveKnowledgeParams {
  title: string;
  content: string;
  tags?: string[];
  project?: string;
  metadata?: Record<string, any>;
  refs?: KnowledgeReference[];
  traits?: KnowledgeTrait[];
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
  refs?: KnowledgeReference[];
  traits?: KnowledgeTrait[];
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
      metadata: params.metadata || {},
      refs: params.refs || [],
      traits: params.traits || []
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
   * Get a single knowledge entry by ID
   */
  async getKnowledge(id: string): Promise<KnowledgeEntry> {
    const response = await this.makeRequest('GET', `/knowledge/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to get knowledge: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Add a reference to an existing knowledge entry
   */
  async addReference(id: string, reference: KnowledgeReference): Promise<KnowledgeEntry> {
    // First get the current entry
    const current = await this.getKnowledge(id);
    
    // Add the new reference
    const updatedRefs = [...(current.refs || []), reference];
    
    // Update the entry
    const response = await this.makeRequest('PUT', `/knowledge/${id}`, {
      refs: updatedRefs
    });

    if (!response.ok) {
      throw new Error(`Failed to add reference: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Add tags to an existing knowledge entry
   */
  async addTags(id: string, newTags: string[]): Promise<KnowledgeEntry> {
    // First get the current entry
    const current = await this.getKnowledge(id);
    
    // Merge tags (remove duplicates)
    const currentTags = current.tags || [];
    const uniqueTags = [...new Set([...currentTags, ...newTags])];
    
    // Update the entry
    const response = await this.makeRequest('PUT', `/knowledge/${id}`, {
      tags: uniqueTags
    });

    if (!response.ok) {
      throw new Error(`Failed to add tags: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Update content of an existing knowledge entry
   */
  async updateContent(id: string, content: string, append: boolean = false): Promise<KnowledgeEntry> {
    let finalContent = content;
    
    if (append) {
      // First get the current entry
      const current = await this.getKnowledge(id);
      finalContent = current.content + '\n\n' + content;
    }
    
    // Update the entry
    const response = await this.makeRequest('PUT', `/knowledge/${id}`, {
      content: finalContent
    });

    if (!response.ok) {
      throw new Error(`Failed to update content: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Update title of an existing knowledge entry
   */
  async updateTitle(id: string, title: string): Promise<KnowledgeEntry> {
    // Update the entry
    const response = await this.makeRequest('PUT', `/knowledge/${id}`, {
      title: title
    });

    if (!response.ok) {
      throw new Error(`Failed to update title: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Add traits to an existing knowledge entry
   */
  async addTraits(id: string, newTraits: KnowledgeTrait[]): Promise<KnowledgeEntry> {
    // First get the current entry
    const current = await this.getKnowledge(id);
    
    // Merge traits (avoid duplicates by key-value pairs)
    const currentTraits = current.traits || [];
    const mergedTraits = [...currentTraits];
    
    for (const newTrait of newTraits) {
      const exists = currentTraits.some(t => t.key === newTrait.key && t.value === newTrait.value);
      if (!exists) {
        mergedTraits.push(newTrait);
      }
    }
    
    // Update the entry
    const response = await this.makeRequest('PUT', `/knowledge/${id}`, {
      traits: mergedTraits
    });

    if (!response.ok) {
      throw new Error(`Failed to add traits: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Set traits for a knowledge entry (replaces all existing traits)
   */
  async setTraits(id: string, traits: KnowledgeTrait[]): Promise<KnowledgeEntry> {
    // Update the entry with new traits array
    const response = await this.makeRequest('PUT', `/knowledge/${id}`, {
      traits: traits
    });

    if (!response.ok) {
      throw new Error(`Failed to set traits: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Update a specific trait by promoting it to link to an entity
   */
  async linkTraitToEntity(id: string, traitKey: string, traitValue: string, parentId: string): Promise<KnowledgeEntry> {
    // First get the current entry
    const current = await this.getKnowledge(id);
    
    if (!current.traits) {
      throw new Error('No traits found on this entry');
    }
    
    // Find and update the specific trait
    const updatedTraits = current.traits.map(trait => {
      if (trait.key === traitKey && trait.value === traitValue) {
        return { ...trait, parent_id: parentId };
      }
      return trait;
    });
    
    // Update the entry
    const response = await this.makeRequest('PUT', `/knowledge/${id}`, {
      traits: updatedTraits
    });

    if (!response.ok) {
      throw new Error(`Failed to link trait to entity: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeEntry;
  }

  /**
   * Search knowledge entries by traits
   */
  async searchByTraits(traitKey?: string, traitValue?: string, limit: number = 10): Promise<KnowledgeResponse> {
    const searchParams = new URLSearchParams();
    
    if (traitKey) {
      searchParams.set('trait_key', traitKey);
    }
    
    if (traitValue) {
      searchParams.set('trait_value', traitValue);
    }
    
    searchParams.set('limit', limit.toString());
    
    const response = await this.makeRequest('GET', `/knowledge/by-traits?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to search by traits: ${response.status} ${response.statusText}`);
    }

    return await response.json() as KnowledgeResponse;
  }

  /**
   * Search knowledge by tags only
   */
  async searchByTags(tags: string[], matchAll: boolean = false): Promise<KnowledgeResponse> {
    const searchParams = new URLSearchParams();
    
    // Use empty query to avoid text search, just tag filtering
    searchParams.set('q', '');
    searchParams.set('tags', tags.join(','));
    
    const response = await this.makeRequest('GET', `/search?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to search by tags: ${response.status} ${response.statusText}`);
    }

    const results = await response.json() as KnowledgeResponse;
    
    // If matchAll is true, filter results to only include entries with ALL tags
    if (matchAll && results.entries) {
      results.entries = results.entries.filter(entry => 
        tags.every(tag => entry.tags?.includes(tag))
      );
    }
    
    return results;
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
        'User-Agent': 'knowledger-mcp-deno/0.1.0'
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