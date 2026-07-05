import fp from 'fastify-plugin';
import { getEntitlement } from '../services/entitlement.js';

/**
 * Route guards as Fastify preHandlers.
 *   app.requireAuth   — a signed-in customer (any).
 *   app.requireAccess — a signed-in customer who owns Football Forms.
 * Both set req.customerId; requireAccess also sets req.entitlement.
 */
export default fp(async function authPlugin(app) {
  app.decorate('requireAuth', async (req, reply) => {
    const uid = req.session?.customerId;
    if (!uid) return reply.code(401).send({ error: 'auth_required' });
    req.customerId = uid;
  });

  app.decorate('requireAccess', async (req, reply) => {
    const uid = req.session?.customerId;
    if (!uid) return reply.code(401).send({ error: 'auth_required' });
    const ent = await getEntitlement(uid);
    if (!ent.active) return reply.code(403).send({ error: 'no_access', entitlement: ent });
    req.customerId = uid;
    req.entitlement = ent;
  });
});
