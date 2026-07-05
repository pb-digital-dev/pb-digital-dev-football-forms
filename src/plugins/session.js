import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { query, queryOne } from '../db.js';

/**
 * MariaDB-backed sessions, sharing the afmstore.sessions table with the store
 * but under our own signed cookie (ffwcsid). A random session id lives in
 * the cookie; the JSON payload lives in the table and is written back only when
 * it changes.
 */
export default fp(async function sessionPlugin(app) {
  const { cookieName, ttlHours } = config.session;
  const ttlMs = ttlHours * 3600 * 1000;

  app.decorateRequest('session', null);
  app.decorateRequest('_sessionState', null);

  app.addHook('onRequest', async (req, reply) => {
    let sid = null;
    const raw = req.cookies[cookieName];
    if (raw) {
      const unsigned = req.unsignCookie(raw);
      if (unsigned.valid) sid = unsigned.value;
    }

    let data = {};
    let found = false;
    if (sid) {
      const row = await queryOne(
        'SELECT data FROM sessions WHERE id = ? AND expires_at > NOW()',
        [sid],
      );
      if (row) {
        found = true;
        try {
          data = JSON.parse(row.data) || {};
        } catch {
          data = {};
        }
      }
    }
    if (!sid || !found) {
      sid = crypto.randomBytes(24).toString('base64url');
      reply.setCookie(cookieName, sid, {
        // Scope the cookie to the app's mount path so it isn't sent to the
        // rest of afmvideos.com (the store has its own session cookie).
        path: `${config.basePath}/`,
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        signed: true,
        maxAge: Math.floor(ttlMs / 1000),
      });
    }

    req.session = data;
    req._sessionState = { sid, found, before: JSON.stringify(data) };
  });

  app.addHook('onResponse', async (req) => {
    const state = req._sessionState;
    if (!state) return;
    const after = JSON.stringify(req.session ?? {});
    if (state.found && after === state.before) return;
    if (!state.found && after === '{}') return; // nothing to persist

    const expires = new Date(Date.now() + ttlMs);
    await query(
      `INSERT INTO sessions (id, data, expires_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)`,
      [state.sid, after, expires],
    );
  });

  /** Destroy the current session row and clear the cookie. */
  app.decorate('destroySession', async (req, reply) => {
    const sid = req._sessionState?.sid;
    if (sid) await query('DELETE FROM sessions WHERE id = ?', [sid]);
    reply.clearCookie(cookieName, { path: `${config.basePath}/` });
    req.session = {};
    if (req._sessionState) req._sessionState.before = '{}';
  });
});
