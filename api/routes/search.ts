import { KnowledgeService } from '../services/knowledge.ts';
import { getSupabaseClient } from '../lib/supabase.ts';

export const searchRouter = {
  async search(req: Request, params: URLSearchParams): Promise<Response> {
    try {
      const query = params.get('q') || '';
      const semantic = params.get('semantic') === 'true';
      const threshold = parseFloat(params.get('threshold') || '0.7');
      const limit = parseInt(params.get('limit') || '10');
      
      if (!query.trim()) {
        return new Response(JSON.stringify({ 
          error: 'Query parameter q is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Extract user ID from auth (simplified for now)
      const userId = req.headers.get('x-user-id');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const supabase = getSupabaseClient();
      const knowledgeService = new KnowledgeService(supabase);

      let results;
      if (semantic) {
        // Use semantic search with embeddings
        results = await knowledgeService.searchSemantic(userId, query, {
          threshold,
          limit
        });
      } else {
        // Use traditional text search
        const searchResult = await knowledgeService.search(userId, {
          query,
          limit
        });
        results = searchResult.entries;
      }

      return new Response(JSON.stringify({
        query,
        searchType: semantic ? 'semantic' : 'text',
        results,
        count: results.length
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Search error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  async stats(req: Request, params: URLSearchParams): Promise<Response> {
    try {
      const userId = req.headers.get('x-user-id');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const supabase = getSupabaseClient();
      const knowledgeService = new KnowledgeService(supabase);
      const stats = await knowledgeService.getEmbeddingStats(userId);

      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Stats error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
