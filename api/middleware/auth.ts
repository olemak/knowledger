export async function authMiddleware(req: Request): Promise<Response | null> {
  // For now, just return null to indicate auth passed
  // TODO: Implement actual JWT/Supabase auth validation
  return null;
}