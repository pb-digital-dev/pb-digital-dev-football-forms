import crypto from 'node:crypto';
import { config } from '../config.js';

/**
 * Short-lived signed tokens for media URLs. A token binds a course_material id
 * to a customer and an expiry, so a download/stream link cannot be shared or
 * replayed after it lapses. HMAC-SHA256 over "<materialId>.<customerId>.<exp>".
 */
export function signMedia(materialId, customerId, ttlSeconds = config.media.urlTtlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${materialId}.${customerId}.${exp}`;
  const sig = hmac(payload);
  return `${exp}.${sig}`;
}

export function verifyMedia(token, materialId, customerId) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [expStr, sig] = token.split('.', 2);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = hmac(`${materialId}.${customerId}.${exp}`);
  return timingSafeEqual(sig, expected);
}

function hmac(payload) {
  return crypto.createHmac('sha256', config.media.signingSecret).update(payload).digest('hex');
}

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
