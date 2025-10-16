export const projectsRouter = {
  async list(req: Request, params: URLSearchParams): Promise<Response> {
    return new Response(JSON.stringify({ message: 'Projects list - TODO' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async create(req: Request, params: URLSearchParams): Promise<Response> {
    return new Response(JSON.stringify({ message: 'Projects create - TODO' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async get(req: Request, params: URLSearchParams): Promise<Response> {
    const id = params.get('id');
    return new Response(JSON.stringify({ message: `Project get ${id} - TODO` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  async getKnowledge(req: Request, params: URLSearchParams): Promise<Response> {
    const id = params.get('id');
    return new Response(JSON.stringify({ message: `Project ${id} knowledge - TODO` }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
};