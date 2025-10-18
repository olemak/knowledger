import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2.0.0';
import type { 
  Knowledge, 
  CreateKnowledgeRequest, 
  UpdateKnowledgeRequest,
  SearchKnowledgeRequest,
  SearchKnowledgeResponse 
} from '../../shared/types.ts';

export class KnowledgeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new knowledge entry
   */
  async create(data: CreateKnowledgeRequest, userId: string): Promise<Knowledge> {
    const knowledgeData = {
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      project_id: data.project_id || null,
      user_id: userId,
      metadata: data.metadata || {},
      refs: data.refs || [],
      traits: data.traits || [],
      time_start: data.time_start || null,
      time_end: data.time_end || null
    };

    const { data: knowledge, error } = await this.supabase
      .from('knowledge')
      .insert([knowledgeData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create knowledge: ${error.message}`);
    }

    return knowledge;
  }

  /**
   * Get knowledge entries for a user
   */
  async list(
    userId: string, 
    options: { 
      projectId?: string; 
      limit?: number; 
      offset?: number; 
    } = {}
  ): Promise<{ entries: Knowledge[]; total: number }> {
    let query = this.supabase
      .from('knowledge')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.projectId) {
      query = query.eq('project_id', options.projectId);
    }

    if (options.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data: entries, count, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch knowledge entries: ${error.message}`);
    }

    return {
      entries: entries || [],
      total: count || 0
    };
  }

  /**
   * Get a single knowledge entry by ID
   */
  async getById(id: string, userId: string): Promise<Knowledge | null> {
    const { data: knowledge, error } = await this.supabase
      .from('knowledge')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      throw new Error(`Failed to fetch knowledge: ${error.message}`);
    }

    return knowledge;
  }

  /**
   * Update a knowledge entry
   */
  async update(id: string, data: UpdateKnowledgeRequest, userId: string): Promise<Knowledge | null> {
    const updateData: Record<string, any> = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.refs !== undefined) updateData.refs = data.refs;
    if (data.traits !== undefined) updateData.traits = data.traits;
    if (data.time_start !== undefined) updateData.time_start = data.time_start;
    if (data.time_end !== undefined) updateData.time_end = data.time_end;

    const { data: knowledge, error } = await this.supabase
      .from('knowledge')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      throw new Error(`Failed to update knowledge: ${error.message}`);
    }

    return knowledge;
  }

  /**
   * Delete a knowledge entry
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('knowledge')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete knowledge: ${error.message}`);
    }

    return true;
  }

  /**
   * Search knowledge entries using full-text search
   */
  async search(userId: string, searchParams: SearchKnowledgeRequest): Promise<SearchKnowledgeResponse> {
    let query = this.supabase
      .from('knowledge')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Basic text search using ilike (case insensitive)
    if (searchParams.query) {
      // Search in title, content, and refs array using PostgREST JSONB operators
      const searchQuery = searchParams.query.replace(/'/g, "''"); // Escape single quotes
      query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    }

    // Tag filtering
    if (searchParams.tags && searchParams.tags.length > 0) {
      query = query.overlaps('tags', searchParams.tags);
    }

    // Project filtering
    if (searchParams.project_id) {
      query = query.eq('project_id', searchParams.project_id);
    }

    // Pagination
    const limit = searchParams.limit || 20;
    const offset = searchParams.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Order by relevance (for text search) or date
    query = query.order('created_at', { ascending: false });

    const { data: entries, count, error } = await query;

    if (error) {
      throw new Error(`Failed to search knowledge: ${error.message}`);
    }

    return {
      entries: entries || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    };
  }

  /**
   * Get knowledge entries by tags
   */
  async getByTags(userId: string, tags: string[]): Promise<Knowledge[]> {
    const { data: entries, error } = await this.supabase
      .from('knowledge')
      .select('*')
      .eq('user_id', userId)
      .overlaps('tags', tags)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch knowledge by tags: ${error.message}`);
    }

    return entries || [];
  }

  /**
   * Get knowledge entries that reference a specific URI or attribution
   */
  async getByReference(userId: string, params: {
    uri?: string;
    attributedTo?: string;
    type?: 'citation' | 'testimony';
  }): Promise<Knowledge[]> {
    let query = this.supabase
      .from('knowledge')
      .select('*')
      .eq('user_id', userId);

    // Search refs array for matching criteria using JSONB operators
    if (params.uri) {
      query = query.contains('refs', JSON.stringify([{ uri: params.uri }]));
    }
    
    if (params.attributedTo) {
      query = query.contains('refs', JSON.stringify([{ attributed_to: params.attributedTo }]));
    }
    
    if (params.type) {
      query = query.contains('refs', JSON.stringify([{ type: params.type }]));
    }

    query = query.order('created_at', { ascending: false });

    const { data: entries, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch knowledge by reference: ${error.message}`);
    }

    return entries || [];
  }

  /**
   * Get knowledge entries by traits
   */
  async getByTraits(userId: string, params: {
    traitKey?: string;
    traitValue?: string;
    limit?: number;
  }): Promise<Knowledge[]> {
    let query = this.supabase
      .from('knowledge')
      .select('*')
      .eq('user_id', userId);

    // Search traits array using JSONB operators
    if (params.traitKey && params.traitValue) {
      // Search for exact key-value match
      query = query.contains('traits', JSON.stringify([{ key: params.traitKey, value: params.traitValue }]));
    } else if (params.traitKey) {
      // Search by key only using PostgreSQL JSONB path queries
      query = query.filter('traits', 'cs', JSON.stringify([{ key: params.traitKey }]));
    } else if (params.traitValue) {
      // Search by value only
      query = query.filter('traits', 'cs', JSON.stringify([{ value: params.traitValue }]));
    }

    query = query.order('created_at', { ascending: false });

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data: entries, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch knowledge by traits: ${error.message}`);
    }

    return entries || [];
  }
}
