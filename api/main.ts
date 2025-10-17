import { Hono } from 'jsr:@hono/hono';
import { cors } from 'jsr:@hono/hono/cors';
import { logger } from 'jsr:@hono/hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@^2.0.0';
import { KnowledgeService } from './services/knowledge.ts';
import { createKnowledgeRoutes } from './routes/knowledge.ts';
import { createAuthRoutes } from './routes/auth.ts';
import { createAuthMiddleware, createOptionalAuthMiddleware } from './middleware/auth.ts';

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

// Initialize services and middleware
const knowledgeService = new KnowledgeService(supabase);
const knowledgeRoutes = createKnowledgeRoutes(knowledgeService);
const authRoutes = createAuthRoutes(supabase);
// Use optional auth for testing - switch to createAuthMiddleware for production
const authMiddleware = createOptionalAuthMiddleware(supabase);

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

// Auth routes (public)
app.post('/api/auth/signin', authRoutes.signIn);
app.post('/api/auth/signup', authRoutes.signUp);
app.post('/api/auth/signout', authRoutes.signOut);
app.get('/api/auth/me', authMiddleware, authRoutes.me);

// Knowledge routes (protected by auth)
app.get('/api/knowledge', authMiddleware, knowledgeRoutes.list);
app.post('/api/knowledge', authMiddleware, knowledgeRoutes.create);
app.get('/api/search', authMiddleware, knowledgeRoutes.search);
app.get('/api/knowledge/:id', authMiddleware, knowledgeRoutes.get);
app.put('/api/knowledge/:id', authMiddleware, knowledgeRoutes.update);
app.delete('/api/knowledge/:id', authMiddleware, knowledgeRoutes.delete);

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
