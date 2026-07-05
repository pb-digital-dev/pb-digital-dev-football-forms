import mysql from 'mysql2/promise';
import { config } from './config.js';

/** Single pool: afmstore (auth, entitlement, sessions). */
export const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: config.db.connectionLimit,
  charset: 'utf8mb4_unicode_ci',
  namedPlaceholders: true,
  supportBigNumbers: true,
});

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Verify the database connection at boot. Throws if unreachable. */
export async function pingDatabases() {
  await pool.query('SELECT 1');
}
