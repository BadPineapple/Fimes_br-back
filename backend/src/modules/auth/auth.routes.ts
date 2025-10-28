import { FastifyInstance } from 'fastify';
import { LoginBody } from './auth.schemas.js';
import { loginOrRegister } from './auth.service.js';
import { getUserById } from '../users/user.service.js';
import { requireAuth } from '../../middlewares/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.format() });
    }
    const { email, name } = parsed.data;
    const user = await loginOrRegister(email, name);

    const token = await reply.jwtSign({
      sub: user.id,
      role: user.role
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatarUrl,
        role: user.role,
        is_supporter: user.isSupporter,
        is_private: user.isPrivate,
        description: user.description
      }
    };
  });

  app.get('/auth/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const payload: any = req.user;
    const user = await getUserById(payload.sub);
    if (!user) return reply.code(404).send({ error: 'Not found' });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatarUrl,
      role: user.role,
      is_supporter: user.isSupporter,
      is_private: user.isPrivate,
      description: user.description
    };
  });
}
