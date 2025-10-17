import { Context } from 'jsr:@hono/hono';
import { KnowledgeService } from '../services/knowledge.ts';
import type { CreateKnowledgeRequest, UpdateKnowledgeRequest } from '../../shared/types.ts';

// For now, we'll use a hardcoded user ID until we implement proper auth
const TEMP_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export function createKnowledgeRoutes(knowledgeService: KnowledgeService) {
  return {
    async list(c: Context) {
      try {
        const limit = parseInt(c.req.query('limit') || '20');
        const offset = parseInt(c.req.query('offset') || '0');
        const projectId = c.req.query('project_id');

        const result = await knowledgeService.list(TEMP_USER_ID, {
          limit,
          offset,
          projectId
        });

        return c.json({
          entries: result.entries,
          total: result.total,
          has_more: result.total > offset + limit
        });
      } catch (error) {
        console.error('Error listing knowledge:', error);
        return c.json({ error: 'Failed to list knowledge entries' }, 500);
      }
    },

    async create(c: Context) {
      try {
        const body = await c.req.json() as CreateKnowledgeRequest;
        
        // Basic validation
        if (!body.title || !body.content) {
          return c.json({ error: 'Title and content are required' }, 400);
        }

        const knowledge = await knowledgeService.create(body, TEMP_USER_ID);
        return c.json(knowledge, 201);
      } catch (error) {
        console.error('Error creating knowledge:', error);
        return c.json({ error: 'Failed to create knowledge entry' }, 500);
      }
    },

    async get(c: Context) {
      try {
        const id = c.req.param('id');
        const knowledge = await knowledgeService.getById(id, TEMP_USER_ID);
        
        if (!knowledge) {
          return c.json({ error: 'Knowledge entry not found' }, 404);
        }

        return c.json(knowledge);
      } catch (error) {
        console.error('Error getting knowledge:', error);
        return c.json({ error: 'Failed to get knowledge entry' }, 500);
      }
    },

    async update(c: Context) {
      try {
        const id = c.req.param('id');
        const body = await c.req.json() as UpdateKnowledgeRequest;

        const knowledge = await knowledgeService.update(id, body, TEMP_USER_ID);
        
        if (!knowledge) {
          return c.json({ error: 'Knowledge entry not found' }, 404);
        }

        return c.json(knowledge);
      } catch (error) {
        console.error('Error updating knowledge:', error);
        return c.json({ error: 'Failed to update knowledge entry' }, 500);
      }
    },

    async delete(c: Context) {
      try {
        const id = c.req.param('id');
        const success = await knowledgeService.delete(id, TEMP_USER_ID);
        
        if (!success) {
          return c.json({ error: 'Knowledge entry not found' }, 404);
        }

        return c.json({ message: 'Knowledge entry deleted successfully' });
      } catch (error) {
        console.error('Error deleting knowledge:', error);
        return c.json({ error: 'Failed to delete knowledge entry' }, 500);
      }
    },

    async search(c: Context) {
      try {
        const query = c.req.query('q') || '';
        const tags = c.req.query('tags')?.split(',') || [];
        const projectId = c.req.query('project_id');
        const limit = parseInt(c.req.query('limit') || '20');
        const offset = parseInt(c.req.query('offset') || '0');

        const result = await knowledgeService.search(TEMP_USER_ID, {
          query,
          tags: tags.length > 0 ? tags : undefined,
          project_id: projectId,
          limit,
          offset
        });

        return c.json(result);
      } catch (error) {
        console.error('Error searching knowledge:', error);
        return c.json({ error: 'Failed to search knowledge entries' }, 500);
      }
    }
  };
}
