# HI-ER Developer Handoff

This document is a technical handoff for developers who need to maintain or extend the Hydraulic Institute Energy Ratings (HI-ER) application. For lighter content-editor / setup notes, see also `README.md`.

**Live site:** https://er.pumps.org/  
**Source:** https://github.com/edlpumps/hi-er (private; request access from the HI / Intelliquip owners)

---

## 1. What this product is

HI-ER is the web application behind the Hydraulic Institute Energy Ratings program. It supports:

| Audience | What they do |
|----------|----------------|
| **Public** | Search Qualified Product Listings (QPL) for pumps and circulators, view product detail pages, download labels/QR codes, run utility calculators, purchase Extended Product Certificates (when enabled) |
| **Participants** (manufacturers) | Register, manage users/labs, upload and revise pump & circulator listings, submit for listing, generate labels |
| **HI Admins** | Manage participants, labs, labels, subscribers, approve/control listings, export data |
| **Subscribers** | Receive scheduled email dumps of full or QPL listing spreadsheets |

Domain concepts:

- **Pumps (CI / clean water pumps)** — PEI / Energy Rating calculations, Excel bulk upload, public QPL search
- **Circulators** — Separate models, calculator, upload templates, labels (including DOE CEI regulation messaging)
- **Labels** — SVG → PNG Energy Rating labels (English/French), QR codes
- **Certificates** — Extended Product Certificates with cart/checkout via an external e-store API
- **Participants** — Organizations with subscription status (pump / circulator) and role-based users

---

## 2. Stack at a glance

| Layer | Choice |
|-------|--------|
| Runtime | **Node.js `22.17.0`** (pinned in `package.json` `engines`) |
| Framework | **Express 5** |
| Views | **Jade/Pug** (`views/**`) + client JS under `public/scripts/` |
| Client UI | **AngularJS 1.5.7** (pumps / PEI / admin / registration) and **Vue 2.5.16** (circulators / certificates) — both via CDN, not npm |
| CSS | LESS via `less-middleware` (`public/stylesheets/`) |
| DB | **MongoDB** via **Mongoose 6** (`schemas.js`) |
| Auth | **Passport** local strategy (email + salted password) |
| Sessions | `express-session` (in-memory by default; `connect-mongo` is a dependency but store is currently `null` in `index.js`) |
| i18n | **i18next** — `locales/en` and `locales/fr` |
| Labels | Pug SVG templates + **`@resvg/resvg-js`** for PNG |
| Certificates PDF | `html-pdf` + **PhantomJS** (legacy; still in use) |
| Email | **Nodemailer** + scheduled jobs via `node-schedule` |
| Logging | **Bunyan** (`LOG_LEVEL`) |
| Hosting | **Heroku** (`Procfile`: `web: npm start`) |
| Tests | **Mocha** + **Chai** (`npm test`) |

Related upgrade notes: `node-upgrade-22.17.0.md`.

---

## 3. Repository layout

```
index.js                 # App bootstrap, middleware, auth, Mongo connect, schedulers
schemas.js               # All Mongoose models + ID counters
package.json             # Dependencies and engines
Procfile                 # Heroku web process
.dev / .env              # Local env (gitignored as .env) — see §5
dev.env                  # Example / historical local env (do not commit secrets)

routes/                  # Express routers (HTTP surface)
  registration.js        # /, /portal, register, activate, password reset
  participant.js         # /participant/* (pumps + mounts circulators)
  circulator.js          # /participant/circulators/*
  admin.js               # /admin/*
  ratings.js             # /ratings/* public QPL + mounts certificates
  circulator-ratings.js  # /circulator/ratings/*
  certificates.js        # /ratings/certificates/*
  labels.js              # /labels/* SVG/PNG/QR
  pei.js                 # /pei calculator UI/API
  downloads.js           # Admin Excel/CSV exports
  common.js              # Shared helpers (users, savings calc constants, etc.)

controllers/
  circulator.js          # Circulator import/validation/business logic

calculator/              # Pump PEI / ER calculation engine
circulator-calculator/   # Circulator calculation engine
certificate_calculator/  # Certificate banding / motor mins

utils/
  label_builder.js       # Label SVG/PNG generation
  language.js            # page_lang vs label_lang
  mailer.js              # SMTP email templates
  password.js            # Hash/salt + ADMIN_PASSWORD_OVERRIDE
  uom.js                 # US vs metric units
  export_common.js       # Shared export helpers

exporter.js              # Builds full/QPL listing workbooks for email/downloads
export-file.js           # CLI to test subscriber attachment generation
certificate-export.js    # Certificate listing export
circulator-export.js     # Circulator listing export

views/                   # Jade layouts + feature folders + svg/ label templates
  common/circulators.jade  # Shared Vue templates/components for circulators
public/                  # Static assets, client Angular + Vue apps, images
  scripts/certificates/  # Vue apps for certificate search/create
locales/                 # i18n JSON
tests/                   # Mocha tests + calculator/certificate fixtures
```

One-off / maintenance scripts (run carefully against the intended DB):

| Script | Purpose |
|--------|---------|
| `export-file.js` | Generate subscriber Full/QPL spreadsheets locally |
| `help_gen.js` | Build help content from `help.xlsx` → `public/resources/help.json` |
| `db-migrate.js` | DB migration helper |
| `brand-reset.js` / `pump-removal.js` | Maintenance (use `MAINTENANCE_*` env vars) |
| `lcc.js` | LCC CSV-related utility |
| `test_gen.js` | Test-case generation helpers |

---

## 4. Request / feature map

Mounted in `index.js`:

| Mount | Module | Notes |
|-------|--------|-------|
| `/` | `routes/registration.js` | Portal, home redirect by role, registration/activation |
| `/participant` | `routes/participant.js` | Participant portal; circulators at `/participant/circulators` |
| `/admin` | `routes/admin.js` | Requires `req.user.admin` |
| `/pei` | `routes/pei.js` | Public PEI calculator |
| `/labels` | `routes/labels.js` | Pump label assets |
| `/ratings` | `routes/ratings.js` | Public pump search/detail; certificates nested under `/ratings/certificates` |
| `/circulator/ratings` | `routes/circulator-ratings.js` | Public circulator search/detail/labels |
| `/downloads` | `routes/downloads.js` | Admin-only listing downloads |

Also: `POST /login`, `GET /logout`, `POST /units`, `POST /language`.

### User roles (`schemas.js` → `users`)

- `admin` — HI administrator
- `participant_admin` / `participant_edit` / `participant_view` — scoped to a `participant` ObjectId
- Public pages do not require login

After login, `/` redirects participants to `/participant` and admins to `/admin`.

### Feature flags (environment)

| Variable | Effect |
|----------|--------|
| `CIRCULATORS` | Shows circulator UI tiles / participant circulator flows |
| `CERTIFICATES_ENABLED` | Shows certificate entry points on public ratings UI |
| `PEI_CHECKS_ENABLED` | Extra PEI validation in `calculator/index.js` |
| `NODE_ENV` | If not containing `PROD`, shows beta banner; skips production subscriber email pushes |
| `LIVE_EMAIL` | If unset/false, all mail goes to `SMTP_RECIPIENT_OVERRIDE` |
| `ADMIN_PASSWORD_OVERRIDE` | Dev backdoor password accepted by `utils/password.js` |

---

## 5. Local development setup

### Prerequisites

1. **Node.js 22.17.0** (exact pin; `npm install --engine-strict` fails on other 22.x patches unless you relax `engines`)
2. **npm**
3. **MongoDB** running locally (Compass optional)
4. Git access to `edlpumps/hi-er`

### Install

```bash
git clone https://github.com/edlpumps/hi-er.git
cd hi-er
npm install
```

### Environment file

`dotenv` loads **`.env`** from the project root (see `.gitignore`). Create `.env` with at least:

```bash
MONGO_CONNECTION_DATA=mongodb://127.0.0.1:27017/er
NODE_ENV=development
LOG_LEVEL=debug
ADMIN_PASSWORD_OVERRIDE=test
```

Useful additional variables (names only — get real values from Heroku config / team vault, never commit them):

| Variable | Purpose |
|----------|---------|
| `PORT` | Defaults to `3003` |
| `SMTP`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SENDING_ADDRESS`, `SMTP_RECIPIENT_OVERRIDE` | Outbound mail |
| `LIVE_EMAIL` | Send to real recipients when truthy |
| `ESTORE_URL`, `ESTORE_AUTH_KEY`, `ESTORE_ADMIN_EMAIL`, `ESTORE_OVERRIDE`, `ESTORE_CONFIRMATION_SECRET` | Participant status / certificate checkout integration with pumps.org e-store |
| `CIRCULATORS`, `CERTIFICATES_ENABLED` | Feature toggles |
| `MAINTENANCE_DB`, `MAINTENANCE_PARTICIPANT`, `MAINTENANCE_REBRAND` | Maintenance scripts |

There may be a local `dev.env` or Atlas credential helper file in a developer’s machine; treat those as secrets. Prefer copying **variable names** into your own `.env`, not checking secrets into git.

### Database

- App expects a database (commonly named `er` locally).
- You need at least one **admin** user document in `users` (or use `ADMIN_PASSWORD_OVERRIDE` against an existing user for local login).
- To seed from production, use `mongodump` / `mongorestore` (examples in `README.md`). Confirm you have Atlas credentials and permission before dumping prod.

### Run

```bash
node index.js
# or
npm run start          # pipes through bunyan
npm run devstart       # supervisor + bunyan (supervisor must be available)
```

App URL: **http://127.0.0.1:3003**

VS Code: use the **Launch Program** configuration in `.vscode/launch.json` (targets `index.js`). Other launch configs: Mocha Tests, Launch Export, Build Help.

### Tests

```bash
npm test               # mocha tests/
```

Known issue (as of Node 22 upgrade notes): `tests/circulator-model-checks.js` / `controllers/circulator.js` can fail with `Cannot read properties of undefined (reading 'push')`. Calculator fixtures live under `tests/test_cases/` and `tests/certificate-testcases/`.

Skipped suites use `.skip` suffixes (`test_calculator.js.skip`, etc.).

---

## 6. Architecture notes worth knowing

### Bootstrap order (`index.js`)

1. Load dotenv  
2. Connect Mongoose with `MONGO_CONNECTION_DATA`  
3. `schemas.init(mongoose)` → attach models on `app.locals.db`  
4. Initialize i18next  
5. Register middleware + routes  
6. Listen on `PORT`  
7. Schedule subscriber email jobs (no-op when `NODE_ENV` is not production-like)

Each request gets model accessors (`req.Pumps`, `req.Users`, …) and session-derived `unit_set` / `lang_set`.

### Calculation engines

- **Pumps:** `calculator/index.js` (+ `default_motor_efficiencies.json`)
- **Circulators:** `circulator-calculator/index.js` and import logic in `controllers/circulator.js`
- **Certificates:** `certificate_calculator/` (`bands.json`, `minimum_motor.json`)
- Upload Excel column maps: `routes/template_map.json`, `routes/circulator_template_map.json`

Hard-coded energy/cost assumptions (README also documents these) in `routes/common.js`:

- Pump annual run hours **4000**, circulator **2500**, cost **$0.15/kWh**

### Labels

- Built in `utils/label_builder.js` from Pug under `views/svg/`
- Logos stored as **data-URI files** (no extension) in `views/svg/` — see README “PNG to URI”
- Circulator large label shows “Meets the 2028 DOE…” only when CEI ≤ 1.00
- `page_lang` and `label_lang` are independent (`utils/language.js` + i18next)

### Pump uploads & downloads

Pumps use Excel bulk import/export. Column layout is driven by **`routes/template_map.json`** + blank workbook **`routes/er_pump_listings.xlsx`** (currently template version **1.6**). Circulators have a parallel pair: `circulator_template_map.json` + `er-circulator-listings.xlsx`.

#### Participant pump upload (create)

| Step | Route | What happens |
|------|-------|----------------|
| Download blank template | `GET /participant/template` | Streams `er_pump_listings.xlsx` as `Pump Energy Ratings.xlsx` |
| Upload form | `GET /participant/pumps/upload` | Renders `views/participant/upload.jade` (shows template version/date) |
| Parse workbook | `POST /participant/pumps/upload` | ExcelJS reads sheet 1 from row `template.config.first_row`; maps columns via `template_map.json`; runs calculator / validation; splits into succeeded vs failed |
| Confirm | → `views/participant/upload_confirm.jade` | Review parsed rows |
| Persist | `POST /participant/pumps/save_upload` | Writes new pump docs (needs `participant_edit`) |

#### Participant pump upload (bulk revise / update)

Same idea with `upload_update` / `save_upload_update` — matches existing pumps by `rating_id` and updates rather than creating. Views: `upload_update.jade` → same confirm template with `is_update: true`.

#### Participant pump downloads

| Route | Output |
|-------|--------|
| `GET /participant/pumps/download` | All pumps for the logged-in participant → `Pump Listings.xlsx` via `common.build_pump_spreadsheet` |
| `GET /participant/pumps/:id/download` | Single pump spreadsheet (same builder) |
| Admin mirror | `GET /admin/participant/:id/pumps/:pump_id/download` | Same spreadsheet for a participant’s pump |

`routes/common.js` → `build_pump_spreadsheet` fills a copy of the template workbook (respecting session `unit_set`).

Also: single-pump PEI calculator download at `POST /pei/download` (same builder pattern).

#### Admin / subscriber listing downloads (not the upload template)

These are **full catalog / QPL dumps**, not the participant upload format:

| Audience | How |
|----------|-----|
| HI Admin | `/downloads` UI (`routes/downloads.js`) — e.g. `/downloads/ci_energy_ratings-qpl.xlsx`, `…-full.xlsx` (plus circulator & certificate variants, `lcc.csv`) |
| Subscribers | Scheduled emails from `index.js` attaching workbooks from `exporter.js` |
| Local test | `node export-file.js` |

Cached admin downloads use `node-cache` (1-day TTL) for some CSV endpoints; XLSX pump/circulator/certificate files are built via `exporter.create(...)`.

**When changing the pump Excel format:** update `er_pump_listings.xlsx` and `template_map.json` together (version + `revision_date` in config), then smoke-test both create upload and upload_update, plus a participant download round-trip.

### Scheduled listing emails (subscribers — not participants)

This is **not** a participant-portal feature. Manufacturers (`participants`) upload/download their own listings in-app. **Subscribers** are a separate collection of external organizations (utilities, etc.) that HI admins manage under **Admin → Subscribers** (`/admin/subscriber`). Those contacts get BCC’d spreadsheet dumps on a cadence.

**Data model** (`schemas.js` → `subscribers`):

| Field | Meaning |
|-------|---------|
| `organization` | Display name |
| `recipients` | Email address list |
| `interval_days` | `1` daily, `7` weekly, `15` twice a month, `30` monthly |
| `type_of_data` | `"qpl"` or `"full"` (missing/`full` → full dump) |
| `last_email_date` | Present on schema; UI last-sent column is currently commented out |

**Admin UI:** `views/admin/a_subscribers.jade` + Angular `ERSubscriberController` in `public/scripts/erAdminApp.js` → `/admin/api/subscriber` CRUD in `routes/admin.js`.

**Runtime** (bottom of `index.js`):

1. `node-schedule` jobs call `push_emails(interval)`:
   - Daily ≈ **11:25** (`interval_days: 1`)
   - Weekly **Monday 13:10** (`7`)
   - Twice a month cron `0 11 1,15 * *` (`15`)
   - Monthly cron `0 11 1 * *` (`30`)
2. **Skipped** when `NODE_ENV` does not contain `PROD` (beta/dev log and return)
3. Builds workbooks once via `exporter.create('all', { admin: false })`
4. Loads matching subscribers, splits full vs QPL recipient lists
5. `mailer.sendListings(...)` BCC-sends with attachments:
   - `ci_energy_ratings-{qpl|full}.xlsx`
   - `circulator_energy_ratings-{qpl|full}.xlsx`
   - `extended_product_certificates-{qpl|full}.xlsx`
6. Body templates: `views/subscribers/email.pug` + `email-plain.pug`

Same workbook builder feeds admin `/downloads/*`. Local generation without sending: `node export-file.js` (also documented in `README.md`).

**Caveats:** jobs run inside the **web dyno** — multiple dynos can duplicate sends; `LIVE_EMAIL` / `SMTP_RECIPIENT_OVERRIDE` still apply via the mailer.

### Auth / passwords

- Passwords: salted hash via `utils/password.js`
- `ADMIN_PASSWORD_OVERRIDE` bypasses real password check when set (local convenience; do not set in production)

---

## 7. Deployment

### Environments

| Env | Heroku app (per README) | Branch |
|-----|-------------------------|--------|
| Beta | `intelliquip-hi/hi-er-beta` | Deploy chosen GitHub branch via Heroku Deploy UI |
| Production | `intelliquip-hi/hi-er` | Deploy **`master`** after merge |

Heroku login historically referenced `higladetech@gmail.com` — confirm current account ownership with HI / ops before changing anything.

Flow:

1. Push branch → open PR → review/merge  
2. For beta: Heroku → Deploy → Deploy GitHub branch  
3. For prod: ensure `master` is current → deploy `master` on production app  
4. Confirm app is **not** in Maintenance Mode  

Config vars (Mongo URI, SMTP, e-store keys, feature flags) live in **Heroku Config Vars**, not in the repo.

MongoDB in production is Atlas (connection string in Heroku config as `MONGO_CONNECTION_DATA`).

### Process model

- Single web dyno process (`Procfile`)
- Subscriber email cron runs **inside the web process** via `node-schedule` — be aware of multi-dyno duplication if you scale horizontally

---

## 8. Working conventions

### Git / GitHub

- Default branch: **`master`**
- Feature work typically goes through PRs into `master` (recent history includes Node 22 upgrade, pump/circulator upload fixes, QPL search, analytics)
- Older remotes mentioned in `package.json` (Bitbucket) are historical; **GitHub `edlpumps/hi-er` is the active remote**

### UI / templates

- Server-rendered Jade under `views/` with shared `layout.jade` / `global_includes.jade`
- Two client frameworks (both loaded from CDN in `views/global_includes.jade`, not npm packages):
  - **AngularJS 1.5.7** — older pump / PEI / admin / registration UIs (`public/scripts/er*.js`, `peiApp.js`, `regApp.js`, `erAdminApp.js`, `erParticipantApp.js`)
  - **Vue 2.5.16** — circulator and certificate UIs (see § Vue client apps below)
- Google Analytics ID `G-1RZZNP84J1` in `global_includes.jade`

### Vue client apps

Vue is **not** a build-step / SPA setup. It is classic Vue 2 mounted on a page root (`#vue`) after Jade renders HTML with `v-model` / `v-if` / etc.

**Load:** `https://cdn.jsdelivr.net/npm/vue@2.5.16/dist/vue.js` in `views/global_includes.jade` (global on every page that uses the main layout).

**Pattern:**

1. Jade renders a root `.container#vue` (often with `v-cloak`)
2. Server data is passed as `data-*` attributes via `JSON.stringify(...)` (e.g. `data-units`, `data-participants`, `data-pump`)
3. `mounted` / inline script reads those with `$('#vue').data('...')` into the Vue instance
4. Templates either live in the Jade markup on that page, or (for circulators) as `<script type="text/x-template">` blocks from the `vue_circulator_components` mixin

**Where Vue is used:**

| Area | Views / scripts | Notes |
|------|-----------------|-------|
| Circulator public search / detail / utilities | `views/ratings/circulator*.jade` | Inline `new Vue({ el: '#vue', ... })` |
| Circulator participant portal | `views/participant/p_circulator*.jade` | Same pattern; revise/upload UIs |
| Circulator admin detail | `views/admin/a_circulator.jade` | Same pattern |
| Shared circulator components | `views/common/circulators.jade` → mixin `vue_circulator_components()` | Registers `Vue.component(...)` for labels, PEI, control methods, details editors |
| Certificate search / create / cart / purchased | `views/ratings/certificates/*.jade` + `public/scripts/certificates/{search,create}.js` | External Vue entry scripts; `#vue` root with `v-cloak` |

**Not Vue:** pump QPL search, PEI calculator, registration, most admin/participant pump flows — those are AngularJS modules.

When editing circulator or certificate UI, change the Jade + the Vue instance/components together; there is no webpack/Vue CLI pipeline.

### When changing calculations or labels

1. Add/adjust unit tests or fixtures under `tests/` when possible  
2. Re-check English **and** French label output  
3. Re-check savings constants / DOE year messaging if product requirements changed  
4. For new label artwork, convert PNG → data URI into `views/svg/` as documented in README  

### When changing uploads

- Keep Excel templates and `*_template_map.json` in sync (see **Pump uploads & downloads** above)  
- Participant flows: `/participant/pumps/upload`, `/participant/pumps/upload_update`, `/participant/circulators/upload`  
- Participant listing download: `/participant/pumps/download`  
- Admin catalog dumps: `/downloads/*` (not the upload template)  
- Certificate upload template version notes appear in recent commit messages (e.g. template 1.5)

---

## 9. Operational checklist for a new developer

1. Get GitHub access to `edlpumps/hi-er`  
2. Install Node **22.17.0** and MongoDB  
3. Clone, `npm install`, create `.env`  
4. Restore a non-prod DB snapshot or create minimal admin/participant users  
5. Run `node index.js` and hit `/portal`, `/ratings/home`, `/participant`  
6. Confirm who owns Heroku (`hi-er`, `hi-er-beta`), Atlas, SMTP, and e-store API credentials  
7. Read `README.md` (labels, i18n, dump/restore) and `node-upgrade-22.17.0.md` (legacy dependency / audit context)  
8. Before first production deploy: practice a beta branch deploy  

---

## 10. Known risks / tech debt

Documented in `node-upgrade-22.17.0.md` and visible in the dependency tree:

- Large `npm audit` surface; many **unmaintained** packages still in use (`request`, `phantomjs-prebuilt` / `html-pdf`, old `helmet`, `nodemailer`, `connect-mongo`, etc.)
- Certificate PDFs depend on PhantomJS — fragile on modern OS/CI; prefer validating PDF generation when touching certificates
- `engines.node` exact pin can frustrate local patch upgrades  
- Sessions currently use default MemoryStore (`session_store = null`) — fine for single dyno, not for multi-dyno sticky-less scale-out  
- Circulator model check test failure may already exist; don’t assume green CI/tests without verifying  
- Secrets have historically lived in local env files — never commit `.env`, Atlas passwords, or SMTP/e-store keys  

---

## 11. Quick “where do I change X?”

| Goal | Start here |
|------|------------|
| Public pump search / detail | `routes/ratings.js`, `views/ratings/`, `public/scripts/erRatingsApp.js` |
| Public circulator search | `routes/circulator-ratings.js`, `views/ratings/circulator_search.jade` (Vue) |
| Participant pump upload / revise | `routes/participant.js` (`/pumps/upload`, `/pumps/upload_update`), `routes/template_map.json`, `routes/er_pump_listings.xlsx`, `calculator/` |
| Participant pump listing download | `routes/participant.js` (`/pumps/download`), `routes/common.js` → `build_pump_spreadsheet` |
| Admin pump/circulator/cert XLSX dumps | `routes/downloads.js`, `exporter.js` |
| Scheduled Full/QPL email dumps | `subscribers` collection, `/admin/subscriber`, `push_emails` in `index.js`, `utils/mailer.js` → `sendListings`, `exporter.js` |
| Participant circulator upload | `routes/circulator.js`, `controllers/circulator.js`, `views/participant/p_circulator*.jade` (Vue) |
| Circulator Vue components | `views/common/circulators.jade` (`vue_circulator_components`) |
| Admin participant tooling | `routes/admin.js`, `views/admin/` |
| Label look / DOE line | `utils/label_builder.js`, `views/svg/*.pug` |
| Savings constants | `routes/common.js` |
| Translations | `locales/en/translation.json`, `locales/fr/translation.json` |
| Email copy | `utils/mailer.js`, `views/registration/*`, `views/subscribers/*` |
| Subscriber cadence | Schedules at bottom of `index.js` |
| Mongoose shapes | `schemas.js` |
| Certificate purchase flow | `routes/certificates.js`, `certificate_calculator/`, `public/scripts/certificates/*.js` (Vue) |

---

## 12. Contacts / ownership (fill in as needed)

| Area | Contact |
|------|---------|
| Repo access (historical README) | pgaydon@pumps.org |
| Heroku / production ops | _TBD — HI / Intelliquip_ |
| Product / Energy Ratings program | _TBD — Hydraulic Institute_ |
| E-store / pumps.org API | _TBD_ |

---

*Generated as a developer handoff for the `hi-er` codebase. Prefer this document for architecture and maintenance; keep `README.md` for day-to-day local setup and content-oriented notes.*
