import { serve } from '@std/http/server';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, handleCors } from './middleware/cors.ts';
import { authMiddleware } from './middleware/auth.ts';
import { errorHandler } from './middleware/error.ts';
import { knowledgeRouter } from './routes/knowledge.ts';
import { projectsRouter } from './routes/projects.ts';
import { searchRouter } from './routes/search.ts';

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

// Router setup
const routes = new Map<string, (req: Request, params: URLSearchParams) => Promise<Response>>([
  // Knowledge routes
  ['GET:/api/knowledge', knowledgeRouter.list],
  ['POST:/api/knowledge', knowledgeRouter.create],
  ['GET:/api/knowledge/:id', knowledgeRouter.get],
  ['PUT:/api/knowledge/:id', knowledgeRouter.update],
  ['DELETE:/api/knowledge/:id', knowledgeRouter.delete],
  ['POST:/api/knowledge/:id/link', knowledgeRouter.link],
  
  // Project routes
  ['GET:/api/projects', projectsRouter.list],
  ['POST:/api/projects', projectsRouter.create],
  ['GET:/api/projects/:id', projectsRouter.get],
  ['GET:/api/projects/:id/knowledge', projectsRouter.getKnowledge],
  
  // Search routes
  ['GET:/api/search', searchRouter.search],
]);

// Main request handler
async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req);
  }

  try {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;
    
    // Find matching route
    let matchedRoute = null;
    let params = new URLSearchParams();
    
    for (const [routeKey, routeHandler] of routes) {
      const [routeMethod, routePath] = routeKey.split(':');
      
      if (method !== routeMethod) continue;
      
      // Simple route matching (supports :id parameters)
      const routeRegex = routePath.replace(/:([^/]+)/g, '(?<$1>[^/]+)');
      const match = path.match(new RegExp(`^${routeRegex}$`));
      
      if (match) {
        matchedRoute = routeHandler;
        // Extract path parameters
        if (match.groups) {
          for (const [key, value] of Object.entries(match.groups)) {
            params.set(key, value);
          }
        }
        // Add query parameters
        for (const [key, value] of url.searchParams) {
          params.set(key, value);
        }
        break;
      }
    }
    
    if (!matchedRoute) {
      return new Response(
        JSON.stringify({ error: 'Route not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Apply authentication middleware (skip for health check)
    if (!path.startsWith('/health')) {
      const authResult = await authMiddleware(req);
      if (authResult instanceof Response) {
        return authResult; // Authentication failed
      }
      // Add user info to request (would need proper context in real implementation)
    }
    
    // Execute route handler
    const response = await matchedRoute(req, params);
    
    // Add CORS headers to response
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    
  } catch (error) {
    return errorHandler(error);
  }
}

// Health check endpoint
routes.set('GET:/health', async () => {
  return new Response(
    JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '0.1.0'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

// Start server
console.log(`🚀 Knowledger API server starting on port ${PORT}`);
console.log(`📊 Health check: http://localhost:${PORT}/health`);
console.log(`🔍 API docs: http://localhost:${PORT}/api/docs (TODO)`);

await serve(handler, { port: PORT });