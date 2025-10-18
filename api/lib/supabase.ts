import { createClient } from 'npm:@supabase/supabase-js@^2.0.0';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const SUPABASE_URL = Deno.env.get('SUPABASE_PROJECT_URL');
    const SUPABASE_KEY = Deno.env.get('SUPABASE_KEY');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing required environment variables: SUPABASE_PROJECT_URL, SUPABASE_KEY');
    }

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  return supabaseClient;
}