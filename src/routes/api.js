import { login } from '../services/auth.js';
import { getEntitlement } from '../services/entitlement.js';
import { getCatalog, getSummary, getMaterialFile } from '../services/content.js';
import { signMedia } from '../lib/signing.js';
import { isVideo, isInline } from '../lib/media.js';
import { sendMail } from '../lib/mailer.js';
import { config } from '../config.js';

export async function apiRoutes(app) {
  // --- Session / account -------------------------------------------------
  app.post('/api/login', async (req, reply) => {
    const email = String(req.body?.email || '');
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return reply.code(400).send({ error: 'Enter your email and password.' });
    }
    const result = await login(email, password);
    if (result.error) {
      return reply.code(401).send({ error: result.error, needsReset: !!result.needsReset });
    }
    req.session.customerId = result.customer.id;
    const entitlement = await getEntitlement(result.customer.id);
    return { user: publicUser(result.customer), entitlement };
  });

  app.post('/api/logout', async (req, reply) => {
    await app.destroySession(req, reply);
    return { ok: true };
  });

  app.get('/api/me', async (req) => {
    const uid = req.session?.customerId;
    if (!uid) return { user: null, entitlement: { active: false } };
    const [{ getCustomer }, entitlement] = await Promise.all([
      import('../services/auth.js'),
      getEntitlement(uid),
    ]);
    const customer = await getCustomer(uid);
    if (!customer) return { user: null, entitlement: { active: false } };
    return { user: publicUser(customer), entitlement };
  });

  // --- Catalogue (requires ownership) ------------------------------------
  app.get('/api/content', { preHandler: app.requireAccess }, async (req) => {
    const [items, summary] = await Promise.all([getCatalog(), getSummary()]);
    return { summary, items, entitlement: req.entitlement };
  });

  // Mint a short-lived signed link for one item (stream + download).
  app.get('/api/content/:id/link', { preHandler: app.requireAccess }, async (req, reply) => {
    const id = Number(req.params.id);
    const material = await getMaterialFile(id);
    if (!material) return reply.code(404).send({ error: 'not_found' });
    const token = signMedia(id, req.customerId);
    const base = `${config.basePath}/media/${id}/${token}`;
    return {
      id,
      title: material.title,
      streamable: isVideo(material.filename),
      inline: isInline(material.filename),
      url: base,
      downloadUrl: `${base}?dl=1`,
      ttl: config.media.urlTtlSeconds,
    };
  });

  // --- Contact form --------------------------------------------------------
  app.post('/api/contact', async (req, reply) => {
    const name = String(req.body?.name || '').trim().slice(0, 100);
    const email = String(req.body?.email || '').trim().slice(0, 190);
    const message = String(req.body?.message || '').trim().slice(0, 4000);
    // Honeypot field: bots fill it, humans never see it.
    if (req.body?.website) return { ok: true };
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !message) {
      return reply.code(400).send({ error: 'Please fill in your name, a valid email, and a message.' });
    }
    sendMail({
      to: config.mail.adminTo || config.mail.from,
      subject: `Football Forms contact: ${name}`,
      text: `From: ${name} <${email}>\nPage: ${config.baseUrl}\n\n${message}`,
      replyTo: `${name} <${email}>`,
    }).catch((err) => req.log.error({ err }, 'contact email failed'));
    return { ok: true };
  });
}

function publicUser(c) {
  return {
    id: c.id,
    email: c.email,
    fname: c.fname || '',
    lname: c.lname || '',
    name: [c.fname, c.lname].filter(Boolean).join(' ') || c.email,
  };
}
