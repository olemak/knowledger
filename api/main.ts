import { Hono } from 'jsr:@hono/hono';
import { cors } from 'jsr:@hono/hono/cors';
import { logger } from 'jsr:@hono/hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@^2.0.0';
import { KnowledgeService } from './services/knowledge.ts';
import { createKnowledgeRoutes } from './routes/knowledge.ts';

// Load environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_PROJECT_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_KEY')!;
const PORT = parseInt(Deno.env.get('API_PORT') || '8000');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required environment variables: SUPABASE_PROJECT_URL, SUPABASE_KEY');
  Deno.exit(1);
}

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize services
const knowledgeService = new KnowledgeService(supabase);
const knowledgeRoutes = createKnowledgeRoutes(knowledgeService);

// Initialize Hono app
const app = new Hono();

// Add middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// Knowledge routes
app.get('/api/knowledge', knowledgeRoutes.list);
app.post('/api/knowledge', knowledgeRoutes.create);
app.get('/api/knowledge/:id', knowledgeRoutes.get);
app.put('/api/knowledge/:id', knowledgeRoutes.update);
app.delete('/api/knowledge/:id', knowledgeRoutes.delete);
app.get('/api/search', knowledgeRoutes.search);

// Project routes
app.get('/api/projects', (c) => c.json({ message: 'Projects list - TODO' }));
app.post('/api/projects', (c) => c.json({ message: 'Projects create - TODO' }));
app.get('/api/projects/:id', (c) => {
  const id = c.req.param('id');
  return c.json({ message: `Project get ${id} - TODO` });
});
app.get('/api/projects/:id/knowledge', (c) => {
  const id = c.req.param('id');
  return c.json({ message: `Project ${id} knowledge - TODO` });
});


// Start server
console.log(`🚀 Knowledger API server starting on port ${PORT}`);
console.log(`📊 Health check: http://localhost:${PORT}/health`);
console.log(`🔍 API docs: http://localhost:${PORT}/api/docs (TODO)`);

Deno.serve({ port: PORT }, app.fetch);
