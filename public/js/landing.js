import { api, BASE } from './api.js';

// Footer year
const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

let loggedIn = false;

// ---------- Login modal ----------
const modal = document.getElementById('loginModal');

function openModal() {
  if (loggedIn) { window.location.href = `${BASE}/members`; return; }
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('lm-email')?.focus(), 50);
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  const msg = document.getElementById('loginMsg');
  if (msg) msg.textContent = '';
}

document.querySelectorAll('[data-login]').forEach((b) =>
  b.addEventListener('click', (e) => { e.preventDefault(); openModal(); }));
document.getElementById('loginClose')?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal && !modal.hidden) closeModal(); });

// Both login forms (modal + inline "Already purchased?" section) share this.
async function handleLogin(form) {
  const email = form.querySelector('input[type="email"]').value.trim();
  const password = form.querySelector('input[type="password"]').value;
  const btn = form.querySelector('button[type="submit"]');
  const msg = form.querySelector('.form-msg');
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = 'Signing in…';
  if (msg) msg.textContent = '';
  try {
    await api.login(email, password);
    window.location.href = `${BASE}/members`;
  } catch (err) {
    if (msg) msg.textContent = err.message || 'Sign in failed.';
    btn.disabled = false;
    btn.textContent = old;
  }
}
document.querySelectorAll('form[data-login-form]').forEach((form) =>
  form.addEventListener('submit', (e) => { e.preventDefault(); handleLogin(form); }));

// ---------- Contact form ----------
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector('button[type="submit"]');
  const msg = contactForm.querySelector('.form-msg');
  btn.disabled = true;
  msg.textContent = '';
  try {
    await api.contact({
      name: document.getElementById('ct-name').value,
      email: document.getElementById('ct-email').value,
      message: document.getElementById('ct-message').value,
      website: document.getElementById('ct-website').value, // honeypot
    });
    contactForm.reset();
    msg.textContent = 'Thanks — your message is on its way. We usually reply within one business day.';
    msg.classList.add('ok');
  } catch (err) {
    msg.textContent = err.message || 'Something went wrong — please email us instead.';
  } finally {
    btn.disabled = false;
  }
});

// If the visitor already has a session, turn login buttons into member links.
(async function checkSession() {
  try {
    const me = await api.me();
    if (me && me.user) {
      loggedIn = true;
      document.querySelectorAll('[data-login]').forEach((b) => {
        b.textContent = 'Open My Downloads';
      });
    }
  } catch { /* not logged in — leave as is */ }
})();
