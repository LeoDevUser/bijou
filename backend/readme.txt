BIJOU BACKEND — LOCAL SETUP
===========================

1. Start the database
---------------------
sudo systemctl start postgresql
# first time only: createdb -U postgres bijou

2. Configure backend/.env
-------------------------
Copy .env.example to .env and fill it in. Format is plain KEY=value lines
(no "export", no quotes needed unless the value has spaces):

  # Database (local Postgres; empty password is fine with trust auth)
  DB_URL=jdbc:postgresql://localhost:5432/bijou
  DB_USERNAME=postgres
  DB_PASSWORD=

  # Auth
  JWT_SECRET=          <- base64, 32+ bytes decoded. generate: openssl rand -base64 48
  ADMIN_EMAIL=         <- admin login, seeded into the DB on every startup
  ADMIN_PASSWORD=      <- admin login password
  ADMIN_PAGE=          <- secret path segment for admin routes (e.g. "admin" locally,
                          a random hex in prod: openssl rand -hex 8)
  COOKIE_SECURE=false  <- false for local http, true in production

  # Stripe (test keys locally; sk must be from the SAME account as the
  # frontend's pk)
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...   <- printed by: stripe listen --forward-to
                                       localhost:8080/public/webhook/stripe

  # Cloudinary (dashboard > Settings > API Keys)
  CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

  # Email via Brevo HTTP API (primary path, free tier = 300/day)
  BREVO_API_KEY=xkeysib-...         <- Brevo > SMTP & API > API Keys tab
  MAIL_SENDER=...                   <- must be a VERIFIED sender in Brevo

  # Brevo SMTP fallback (only used when the relay is toggled off in admin
  # settings, or auto-disabled after a 429). Brevo > SMTP & API > SMTP tab.
  MAIL_USERNAME=...@smtp-brevo.com  <- the SMTP "Login", NOT an email sender
  MAIL_PASSWORD=xsmtpsib-...        <- an SMTP key value

3. Configure frontend/.env
--------------------------
  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...   <- same Stripe account as sk above
  VITE_ADMIN_PAGE=...                       <- MUST equal backend ADMIN_PAGE
  # VITE_API_URL: leave unset locally (vite proxy handles it);
  # in production set it to the deployed backend URL.

4. Run
------
Backend (set -a auto-exports every var sourced from .env so the Java
process inherits them):

  cd backend
  set -a; source .env; set +a; ./mvnw spring-boot:run

Frontend:

  cd frontend
  npm install
  npm run dev          # http://localhost:5173

Stripe webhooks (separate terminal, needed for checkout flows):

  stripe listen --forward-to localhost:8080/public/webhook/stripe

Admin panel: http://localhost:5173/<ADMIN_PAGE>, log in with
ADMIN_EMAIL / ADMIN_PASSWORD.

Gotchas
-------
- ddl-auto is env-driven (DDL_AUTO). Local .env sets create-drop, so the DB
  is WIPED and reseeded on every backend restart. In production leave
  DDL_AUTO unset — it defaults to "update", which never deletes data.
- Env vars are read at process start; after editing .env, restart the
  backend (and restart vite after editing frontend/.env).
- Do NOT put project exports in ~/.bashrc — stray exported vars silently
  leak into every run and are impossible to debug. .env is the single
  source of truth.
- Requires JDK 21+ (JAVA_HOME must not point at an older JDK).
