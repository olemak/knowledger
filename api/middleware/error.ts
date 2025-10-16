import { corsHeaders } from './cors.ts';

export function errorHandler(error: unknown): Response {
  console.error('API Error:', error);
  
  return new Response(
    JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}