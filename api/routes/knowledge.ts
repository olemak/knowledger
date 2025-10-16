export const knowledgeRouter = {
  async list(req: Request, params: URLSearchParams): Promise<Response> {
    return new Response(JSON.stringify({ message: 'Knowledge list - TODO' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async create(req: Request, params: URLSearchParams): Promise<Response> {
    return new Response(JSON.stringify({ message: 'Knowledge create - TODO' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async get(req: Request, params: URLSearchParams): Promise<Response> {
    const id = params.get('id');
    return new Response(JSON.stringify({ message: `Knowledge get ${id} - TODO` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async update(req: Request, params: URLSearchParams): Promise<Response> {
    const id = params.get('id');
    return new Response(JSON.stringify({ message: `Knowledge update ${id} - TODO` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async delete(req: Request, params: URLSearchParams): Promise<Response> {
    const id = params.get('id');
    return new Response(JSON.stringify({ message: `Knowledge delete ${id} - TODO` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async link(req: Request, params: URLSearchParams): Promise<Response> {
    const id = params.get('id');
    return new Response(JSON.stringify({ message: `Knowledge link ${id} - TODO` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
};