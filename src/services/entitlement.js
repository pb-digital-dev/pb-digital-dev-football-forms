import { queryOne } from '../db.js';
import { config } from '../config.js';

/**
 * Does this customer own Football Forms for the Winning Coach?
 *
 * Access is granted when the customer has a fulfilled order (paid / shipped /
 * completed) containing ANY Football Forms product — the current digital
 * edition (afmstore id 908, SKU FB-FRMS-DIGITAL) or any historical SKU
 * (CD / print / bundle editions), so buyers from any era keep their access.
 * The store at afmvideos.com is the point of sale, so a purchase there
 * immediately grants access here.
 *
 * Today the model is lifetime-per-purchase (config.entitlement.accessDays = 0).
 * Setting ACCESS_DAYS to e.g. 365 switches on an annual-renewal model with no
 * code change: access then requires an order within that window and an
 * `expiresAt` is reported back to the client.
 *
 * @returns {Promise<{active:boolean, since:string|null, expiresAt:string|null, orderId:number|null}>}
 */
export async function getEntitlement(customerId) {
  if (!customerId) return notEntitled();

  const { productIds, validStatuses, accessDays } = config.entitlement;
  const productList = productIds.map(() => '?').join(',');
  const statusList = validStatuses.map(() => '?').join(',');

  // Most recent qualifying order for any Football Forms product.
  const row = await queryOne(
    `SELECT o.id AS order_id, DATE(o.created_at) AS order_date,
            DATEDIFF(CURDATE(), DATE(o.created_at)) AS age_days
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id IN (${productList})
        AND o.customer_id = ?
        AND o.status IN (${statusList})
      ORDER BY o.created_at DESC
      LIMIT 1`,
    [...productIds, customerId, ...validStatuses],
  );

  if (!row) return notEntitled();

  const since = toISODate(row.order_date);

  // Lifetime model.
  if (!accessDays || accessDays <= 0) {
    return { active: true, since, expiresAt: null, orderId: Number(row.order_id) };
  }

  // Windowed (renewal) model.
  const expires = new Date(row.order_date);
  expires.setDate(expires.getDate() + accessDays);
  const active = Number(row.age_days) <= accessDays;
  return {
    active,
    since,
    expiresAt: toISODate(expires),
    orderId: Number(row.order_id),
  };
}

function notEntitled() {
  return { active: false, since: null, expiresAt: null, orderId: null };
}

function toISODate(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toISOString().slice(0, 10);
}
