import { api, BASE } from './api.js';

const BUY_URL = 'https://afmvideos.com/videos/football-forms-for-the-winning-coach-fb-frms-digital';
const root = document.getElementById('root');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function brand() {
  return `<a class="m-brand" href="${BASE}/">
    <span class="shield">W</span>
    <span class="m-brand-name">WINNING COACH <em>RESOURCES</em></span>
  </a>`;
}

function shell(inner, user) {
  return `
  <header class="m-head">
    ${brand()}
    <div class="m-head-right">
      ${user ? `<span class="m-user">${esc(user.name)}</span>
      <a href="#" id="logout" class="m-logout">Sign Out</a>` : ''}
    </div>
  </header>
  <main class="m-main">${inner}</main>
  <footer class="m-foot">
    <span>&copy; <span id="yr"></span> AFM Media &middot; Gridiron Strategies</span>
    <span><a href="https://afmvideos.com/privacy">Privacy</a> &middot;
          <a href="https://afmvideos.com/terms">Terms</a> &middot;
          <a href="${BASE}/#contact">Contact</a></span>
  </footer>`;
}

function denied(user, entitlement) {
  return shell(`
    <div class="m-card m-denied">
      <h1>Your account doesn't include Football Forms yet</h1>
      <p>You're signed in as <strong>${esc(user.email)}</strong>, but we couldn't find a
         Football Forms purchase on this account. If you bought it under a different
         email, sign out and use that account instead.</p>
      <a class="btn btn-gold" href="${BUY_URL}">Get Football Forms — $19.95 →</a>
      <div class="m-alt"><a href="#" id="denyLogout">Use a different account</a></div>
    </div>`, user);
}

function downloads(user, data) {
  const since = data.entitlement?.since
    ? `<p class="m-since">Purchased ${esc(data.entitlement.since)} — lifetime access, re-download anytime.</p>` : '';
  const cards = data.items.map((it) => `
    <div class="m-card dl-card${it.primary ? ' dl-primary' : ''}">
      <div class="dl-icon">${pdfIcon()}</div>
      <div class="dl-body">
        <h2>${esc(it.title)}</h2>
        <p>${esc(it.desc)}</p>
        <div class="dl-meta">${it.pages} pages &middot; PDF</div>
      </div>
      <div class="dl-actions">
        <button class="btn btn-gold" data-dl="${it.id}">Download PDF</button>
        <button class="btn btn-line" data-view="${it.id}">View in Browser</button>
      </div>
    </div>`).join('');
  return shell(`
    <h1 class="m-title">Welcome back, Coach${user.fname ? ' ' + esc(user.fname) : ''}.</h1>
    <p class="m-sub">Your downloads are below. Save the PDFs to your device — you can
       sign back in and re-download them whenever you need to.</p>
    ${since}
    ${cards}
    <p class="m-help">Trouble downloading? <a href="${BASE}/#contact">Contact us</a> and we'll get you sorted.</p>
  `, user);
}

function pdfIcon() {
  return `<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.6">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/><path d="M9 15h6M9 11h2M9 18h6" stroke-linecap="round"/></svg>`;
}

async function openLink(id, download) {
  try {
    const link = await api.link(id);
    const url = download ? link.downloadUrl : link.url;
    if (download) window.location.href = url;
    else window.open(url, '_blank', 'noopener');
  } catch {
    alert('That link could not be created — please refresh and try again.');
  }
}

function wire(user) {
  document.getElementById('yr')?.append(String(new Date().getFullYear()));
  document.getElementById('logout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch { /* ignore */ }
    window.location.replace(`${BASE}/`);
  });
  document.getElementById('denyLogout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await api.logout(); } catch { /* ignore */ }
    window.location.replace(`${BASE}/`);
  });
  document.querySelectorAll('[data-dl]').forEach((b) =>
    b.addEventListener('click', () => openLink(Number(b.dataset.dl), true)));
  document.querySelectorAll('[data-view]').forEach((b) =>
    b.addEventListener('click', () => openLink(Number(b.dataset.view), false)));
}

(async function boot() {
  let me;
  try { me = await api.me(); } catch { me = null; }
  if (!me || !me.user) {
    window.location.replace(`${BASE}/`); // login lives on the landing page
    return;
  }
  try {
    const data = await api.content();
    root.innerHTML = downloads(me.user, data);
  } catch (err) {
    if (err.status === 403) {
      root.innerHTML = denied(me.user, err.data?.entitlement);
    } else {
      window.location.replace(`${BASE}/`);
      return;
    }
  }
  wire(me.user);
})();
