import { buildServer } from './config/fastify.js';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { filmRoutes } from './modules/films/films.routes.js';
import 'dotenv/config';

const app = buildServer();

app.get('/', async () => ({ ok: true, name: 'Filmes.br API' }));

app.get('/health', async () => ({ ok: true }));

app.register(authRoutes);
app.register(filmRoutes);

app.listen({ port: env.port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`API rodando em http://localhost:${env.port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
