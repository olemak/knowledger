export const searchRouter = {
  async search(req: Request, params: URLSearchParams): Promise<Response> {
    const query = params.get('q') || '';
    return new Response(JSON.stringify({ 
      message: `Search for "${query}" - TODO`,
      query,
      results: []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
};