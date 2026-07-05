// Base path the app is mounted under, derived from where this script lives
// (…/js/api.js). '' when served at the domain root, '/football-forms' live.
export const BASE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

// Tiny fetch wrapper. All requests are same-origin and carry the session cookie.
async function request(method, url, body) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request('GET', `${BASE}/api/me`),
  login: (email, password) => request('POST', `${BASE}/api/login`, { email, password }),
  logout: () => request('POST', `${BASE}/api/logout`),
  content: () => request('GET', `${BASE}/api/content`),
  link: (id) => request('GET', `${BASE}/api/content/${id}/link`),
  contact: (payload) => request('POST', `${BASE}/api/contact`, payload),
};
