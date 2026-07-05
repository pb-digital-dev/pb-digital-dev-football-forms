import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, '.env') });

function required(name) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`Missing required environment variable ${name} (set it in .env)`);
  }
  return v;
}

const basePath = (process.env.BASE_PATH || '').replace(/\/+$/, '');

export const config = {
  rootDir,
  env: process.env.NODE_ENV || 'production',
  isProd: (process.env.NODE_ENV || 'production') === 'production',
  // 3100 = store, 3200 = scoremore, 3300 = gridiron. This app owns 3400.
  port: Number(process.env.PORT || 3400),
  host: process.env.HOST || '127.0.0.1',
  // URL prefix the app is mounted under ('' = domain root). In production the
  // system lives at https://afmvideos.com/football-forms behind the store
  // domain's nginx (BASE_PATH=/football-forms in .env).
  basePath,
  baseUrl: process.env.BASE_URL || `https://afmvideos.com${basePath}`,
  siteName: 'Football Forms for the Winning Coach',

  // Auth + entitlement live in the AFM store database (afmstore). The store at
  // afmvideos.com is the seller; this app only reads accounts/orders and
  // owns its own session rows in afmstore.sessions.
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: process.env.DB_NAME || 'afmstore',
    connectionLimit: Number(process.env.DB_POOL || 4),
  },

  session: {
    secret: required('SESSION_SECRET'),
    cookieName: process.env.SESSION_COOKIE || 'ffwcsid',
    ttlHours: Number(process.env.SESSION_TTL_HOURS || 24 * 14),
  },

  // Products whose fulfilled order grants access. 908 = FB-FRMS-DIGITAL (the
  // digital edition sold on the store today); the rest are every historical
  // Football Forms SKU (CD, print, bundles) so past buyers keep their access.
  entitlement: {
    productIds: (process.env.FORMS_PRODUCT_IDS || '908,208,179,412,554,667,668,805')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter(Boolean),
    validStatuses: (process.env.VALID_ORDER_STATUSES || 'paid,shipped,completed')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    // 0 = lifetime access per purchase (digital download product).
    accessDays: Number(process.env.ACCESS_DAYS || 0),
  },

  // The deliverable PDFs live outside httpdocs so git deploys never touch
  // them (same convention as the SCORE MORE content dir).
  media: {
    contentRoot: process.env.CONTENT_ROOT || path.join(rootDir, '..', 'content'),
    signingSecret: required('MEDIA_SIGNING_SECRET'),
    urlTtlSeconds: Number(process.env.MEDIA_URL_TTL || 6 * 3600),
  },

  mail: {
    from: process.env.MAIL_FROM || 'orders@afmvideos.com',
    fromName: process.env.MAIL_FROM_NAME || 'Football Forms for the Winning Coach',
    adminTo: process.env.MAIL_ADMIN || '',
  },

  // Where "Order Instant Download" sends buyers (the store product page).
  buyUrl: process.env.BUY_URL
    || 'https://afmvideos.com/videos/football-forms-for-the-winning-coach-fb-frms-digital',
};
