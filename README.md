# Football Forms for the Winning Coach

Members download system + SEO landing page for the classic Gridiron Strategies
book (134 forms / 304 pages, PDF). Live at **afmvideos.com/football-forms**
(the legacy footballforms.secureorderingonline.com site 301-redirects there).

Same pattern as the SCORE MORE system (`pb-digital-dev/scoremore`):

- Node 22 + Fastify 5, no-build vanilla-JS frontend in `public/`
- Mounted under `BASE_PATH=/football-forms` behind the store domain's nginx
  (unset BASE_PATH for local dev at the domain root)
- Login = the shared afmvideos.com store account (afmstore.customers)
- Access gate = a fulfilled store order containing any Football Forms SKU
  (current digital edition = product 908 / FB-FRMS-DIGITAL; historical CD /
  print SKUs also count — see FORMS_PRODUCT_IDS in src/config.js)
- The two deliverable PDFs live OUTSIDE httpdocs in `../content/`
  (CONTENT_ROOT) and are served via short-lived HMAC-signed links
- Runs under systemd `football-forms.service` on port 3400
  (restart: `sudo systemctl restart football-forms.service`)

`.env` (gitignored) needs: DB_USER/DB_PASSWORD (user `ffwc`), SESSION_SECRET,
MEDIA_SIGNING_SECRET, BASE_PATH, CONTENT_ROOT. Backup at `../.env.backup`.
