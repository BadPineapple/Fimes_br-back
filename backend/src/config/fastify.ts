import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { env } from './env.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.register(fp(async (instance) => {
    instance.register(fastifyJwt, {
      secret: env.jwtSecret,
      sign: { expiresIn: env.jwtExpiresIn }
    });
  }));

  return app;
}
