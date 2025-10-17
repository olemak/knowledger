import type { Context, Next } from 'jsr:@hono/hono';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2.0.0';

/**
 * Auth middleware that extracts user from Supabase JWT token
 */
export function createAuthMiddleware(supabase: SupabaseClient) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify the JWT token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.error('Auth error:', error);
        return c.json({ error: 'Invalid or expired token' }, 401);
      }

      // Add user to context for use in route handlers
      c.set('user', user);
      c.set('userId', user.id);
      
      await next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return c.json({ error: 'Authentication failed' }, 401);
    }
  };
}

/**
 * Optional auth middleware - allows requests with or without auth
 * Useful for public endpoints that can be enhanced with user context
 */
export function createOptionalAuthMiddleware(supabase: SupabaseClient) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          c.set('user', user);
          c.set('userId', user.id);
        }
      } catch (error) {
        // Silently fail for optional auth
        console.warn('Optional auth failed:', error);
      }
    }
    
    await next();
  };
}

/**
 * Helper to get current user ID from context
 * Falls back to temp user ID if no auth (for testing)
 */
export function getCurrentUserId(c: Context): string {
  const userId = c.get('userId');
  if (!userId) {
    // Temporary fallback for testing - remove in production!
    console.warn('No authenticated user, using temp user ID');
    return '550e8400-e29b-41d4-a716-446655440000';
  }
  return userId;
}

/**
 * Helper to get current user from context
 */
export function getCurrentUser(c: Context) {
  const user = c.get('user');
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
