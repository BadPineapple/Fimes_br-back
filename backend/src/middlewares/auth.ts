import { FastifyReply, FastifyRequest } from 'fastify';

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function requireRole(role: 'user' | 'moderator' | 'admin') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
      const payload: any = req.user;
      if (!payload?.role) throw new Error('no-role');
      const order = ['user', 'moderator', 'admin'];
      if (order.indexOf(payload.role) < order.indexOf(role)) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  };
}
