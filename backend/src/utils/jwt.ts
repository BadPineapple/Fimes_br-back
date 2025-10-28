import { FastifyRequest } from 'fastify';

export function getTokenFromRequest(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
