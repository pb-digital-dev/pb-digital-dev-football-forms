import { verifyMedia } from '../lib/signing.js';
import { getMaterialFile } from '../services/content.js';
import { resolveContentFile, streamFile } from '../lib/media.js';

/**
 * Entitlement-checked media delivery. The link is a short-lived signed token
 * bound to the material id and the signed-in customer (minted by
 * /api/content/:id/link, which is behind requireAccess). Streaming supports
 * HTTP Range so video seeks; `?dl=1` forces a download.
 */
export async function mediaRoutes(app) {
  app.get('/media/:id/:token', async (req, reply) => {
    const id = Number(req.params.id);
    const customerId = req.session?.customerId;
    if (!customerId) return reply.code(401).send('Sign in to view this content.');
    if (!verifyMedia(req.params.token, id, customerId)) {
      return reply.code(403).send('This link has expired. Reopen the item to refresh it.');
    }

    const material = await getMaterialFile(id);
    if (!material) return reply.code(404).send('Not found.');

    const source = await resolveContentFile(material.filename);
    if (!source) {
      req.log.error({ id, filename: material.filename }, 'content file missing on disk');
      return reply.code(404).send('This file is temporarily unavailable.');
    }

    return streamFile(req, reply, source, {
      filename: material.filename.split('/').pop(),
      download: req.query?.dl === '1',
    });
  });
}
