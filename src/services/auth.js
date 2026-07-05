import argon2 from 'argon2';
import { queryOne } from '../db.js';

/**
 * Authentication against the shared afmstore.customers table — the same
 * accounts used by the afmvideos.com store. Passwords are argon2id hashes
 * (legacy plaintext was hashed during the store migration). This portal has
 * read-only access to customers, so it never writes back here.
 */

export async function findByEmail(email) {
  return queryOne(
    'SELECT id, email, fname, lname, password_hash, active FROM customers WHERE email = ?',
    [String(email).trim().toLowerCase()],
  );
}

export async function getCustomer(id) {
  return queryOne(
    'SELECT id, email, fname, lname, active FROM customers WHERE id = ?',
    [id],
  );
}

export async function login(email, password) {
  const customer = await findByEmail(email);
  if (!customer) return { error: 'Email or password is incorrect.' };
  if (!customer.password_hash) {
    return {
      error: 'Please reset your password on the store to activate your account.',
      needsReset: true,
    };
  }
  const ok = await argon2.verify(customer.password_hash, password).catch(() => false);
  if (!ok) return { error: 'Email or password is incorrect.' };

  // Strip the hash before returning.
  const { password_hash, ...safe } = customer;
  return { customer: safe };
}
