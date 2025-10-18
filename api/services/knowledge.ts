import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2.0.0';
import type { 
  Knowledge, 
  CreateKnowledgeRequest, 
  UpdateKnowledgeRequest,
  SearchKnowledgeRequest,
  SearchKnowledgeResponse 
} from '../../shared/types.ts';
import { EmbeddingsService } from './embeddings.ts';

export class KnowledgeService {
  private embeddings: EmbeddingsService;
  
  constructor(private supabase: SupabaseClient) {
    this.embeddings = new EmbeddingsService();
  }

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

    // Generate and store embedding asynchronously
    this.generateAndStoreEmbedding(knowledge.id, data.title, data.content)
      .catch(err => console.error('Failed to generate embedding:', err));

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

    // Regenerate embedding if title or content changed
    if (data.title !== undefined || data.content !== undefined) {
      this.generateAndStoreEmbedding(knowledge.id, knowledge.title, knowledge.content)
        .catch(err => console.error('Failed to regenerate embedding:', err));
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

  /**
   * Generate and store embedding for a knowledge entry
   */
  private async generateAndStoreEmbedding(knowledgeId: string, title: string, content: string): Promise<void> {
    try {
      const embeddingResult = await this.embeddings.generateKnowledgeEmbedding(title, content);
      
      await this.supabase
        .from('knowledge_embeddings')
        .upsert({
          knowledge_id: knowledgeId,
          content_embedding: embeddingResult.embedding,
          model_name: embeddingResult.model
        }, { onConflict: 'knowledge_id,model_name' });
        
    } catch (error) {
      console.error(`Failed to generate/store embedding for knowledge ${knowledgeId}:`, error);
      // Don't throw - embeddings are optional
    }
  }

  /**
   * Search knowledge entries using semantic similarity
   */
  async searchSemantic(
    userId: string, 
    query: string, 
    options: {
      threshold?: number;
      limit?: number;
      projectId?: string;
    } = {}
  ): Promise<Knowledge[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.generateQueryEmbedding(query);
      
      // Use the database function to find similar entries
      const { data: results, error } = await this.supabase
        .rpc('find_similar_knowledge', {
          query_embedding: queryEmbedding,
          match_threshold: options.threshold || 0.7,
          match_count: options.limit || 10,
          p_user_id: userId
        });

      if (error) {
        throw new Error(`Failed to search semantically: ${error.message}`);
      }

      // Transform results to match Knowledge interface
      return (results || []).map((row: any) => ({
        id: row.knowledge_id,
        title: row.title,
        content: row.content,
        tags: row.tags || [],
        created_at: row.created_at,
        user_id: userId, // We know this from the query context
        updated_at: row.created_at, // Simplified for now
        metadata: {},
        refs: [],
        traits: []
      }));
    } catch (error) {
      console.error('Semantic search failed, falling back to text search:', error);
      // Fallback to regular text search
      const searchResult = await this.search(userId, {
        query,
        limit: options.limit || 10,
        project_id: options.projectId
      });
      return searchResult.entries;
    }
  }

  /**
   * Get embedding statistics for a user
   */
  async getEmbeddingStats(userId: string): Promise<{
    totalEmbeddings: number;
    modelsUsed: string[];
    avgContentLength: number;
    lastUpdated: Date | null;
  }> {
    try {
      const { data: stats, error } = await this.supabase
        .rpc('get_embedding_stats', { p_user_id: userId });

      if (error) {
        throw new Error(`Failed to get embedding stats: ${error.message}`);
      }

      const result = stats?.[0];
      return {
        totalEmbeddings: result?.total_embeddings || 0,
        modelsUsed: result?.models_used || [],
        avgContentLength: result?.avg_content_length || 0,
        lastUpdated: result?.last_updated ? new Date(result.last_updated) : null
      };
    } catch (error) {
      console.error('Failed to get embedding stats:', error);
      return {
        totalEmbeddings: 0,
        modelsUsed: [],
        avgContentLength: 0,
        lastUpdated: null
      };
    }
  }
}
