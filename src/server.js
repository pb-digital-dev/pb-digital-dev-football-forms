import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';

import { config } from './config.js';
import { pingDatabases } from './db.js';
import sessionPlugin from './plugins/session.js';
import authPlugin from './plugins/auth.js';
import { apiRoutes } from './routes/api.js';
import { mediaRoutes } from './routes/media.js';

export async function buildServer() {
  const app = Fastify({
    logger: { level: config.isProd ? 'info' : 'debug' },
    trustProxy: true, // behind Plesk nginx/apache + Passenger
    disableRequestLogging: config.isProd,
    bodyLimit: 1024 * 1024,
  });

  await app.register(fastifyCookie, { secret: config.session.secret });
  await app.register(fastifyFormbody);
  await app.register(sessionPlugin);
  await app.register(authPlugin);

  // Everything public mounts under the base path ('' in dev,
  // /football-forms live).
  const base = config.basePath;

  // SPA + assets.
  await app.register(fastifyStatic, {
    root: path.join(config.rootDir, 'public'),
    prefix: `${base}/`,
    index: 'index.html',
    maxAge: config.isProd ? '1h' : 0,
  });

  // Health check stays at the root — it's only reachable internally
  // (nginx forwards just the base path to this port).
  app.get('/healthz', async () => {
    await pingDatabases();
    return { ok: true, ts: new Date().toISOString() };
  });

  if (base) {
    // Canonicalize bare paths onto the trailing-slash landing URL.
    app.get('/', async (req, reply) => reply.redirect(`${base}/`, 301));
    app.get(base, async (req, reply) => reply.redirect(`${base}/`, 301));
  }

  await app.register(apiRoutes, base ? { prefix: base } : {});
  await app.register(mediaRoutes, base ? { prefix: base } : {});

  // Members area SPA shell (clean URL). The landing page (index.html) is the
  // public, SEO-indexed home page served at the base path.
  app.get(`${base}/members`, async (req, reply) => reply.sendFile('members.html'));

  // SEO: sitemap for this system (also referenced from the domain robots.txt
  // and included in the store's main sitemap).
  app.get(`${base}/sitemap.xml`, async (req, reply) => {
    const today = new Date().toISOString().slice(0, 10);
    reply.type('application/xml');
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      `  <url><loc>${config.baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`,
      '</urlset>',
    ].join('\n');
  });

  // Anything else: JSON 404 for API/media, real 404 for asset-like paths
  // (soft-404s hurt SEO), otherwise hand back the landing page.
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith(`${base}/api/`) || req.url.startsWith(`${base}/media/`)) {
      return reply.code(404).send({ error: 'not_found' });
    }
    const pathname = req.url.split('?')[0];
    if (/\.[a-z0-9]{2,5}$/i.test(pathname)) {
      return reply.code(404).type('text/plain').send('Not found');
    }
    if (req.method === 'GET') {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'not_found' });
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'unhandled error');
    if (reply.sent) return;
    const code = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    reply.code(code).send({ error: code === 500 ? 'server_error' : err.message });
  });

  return app;
}
