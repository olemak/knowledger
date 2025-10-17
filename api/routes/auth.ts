import { Context } from 'jsr:@hono/hono';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2.0.0';
import { getCurrentUser } from '../middleware/auth.ts';

export function createAuthRoutes(supabase: SupabaseClient) {
  return {
    /**
     * Get current user info
     * Requires valid JWT token
     */
    async me(c: Context) {
      try {
        const user = getCurrentUser(c);
        
        return c.json({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata
        });
      } catch (error) {
        console.error('Error getting user info:', error);
        return c.json({ error: 'Failed to get user info' }, 500);
      }
    },

    /**
     * Sign in with email and password
     */
    async signIn(c: Context) {
      try {
        const { email, password } = await c.req.json();
        
        if (!email || !password) {
          return c.json({ error: 'Email and password are required' }, 400);
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return c.json({ error: error.message }, 401);
        }

        return c.json({
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
          expires_at: data.session?.expires_at
        });
      } catch (error) {
        console.error('Error signing in:', error);
        return c.json({ error: 'Sign in failed' }, 500);
      }
    },

    /**
     * Sign up with email and password
     */
    async signUp(c: Context) {
      try {
        const { email, password, metadata } = await c.req.json();
        
        if (!email || !password) {
          return c.json({ error: 'Email and password are required' }, 400);
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata || {}
          }
        });

        if (error) {
          return c.json({ error: error.message }, 400);
        }

        return c.json({
          user: data.user ? {
            id: data.user.id,
            email: data.user.email,
          } : null,
          session: data.session ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at
          } : null,
          message: data.user && !data.session ? 
            'Registration successful! Please check your email to verify your account.' : 
            'Registration successful!'
        });
      } catch (error) {
        console.error('Error signing up:', error);
        return c.json({ error: 'Sign up failed' }, 500);
      }
    },

    /**
     * Sign out (invalidate refresh token)
     */
    async signOut(c: Context) {
      try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          return c.json({ error: error.message }, 400);
        }

        return c.json({ message: 'Signed out successfully' });
      } catch (error) {
        console.error('Error signing out:', error);
        return c.json({ error: 'Sign out failed' }, 500);
      }
    }
  };
}