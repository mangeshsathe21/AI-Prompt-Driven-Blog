# GreenTalk Frontend

React 19 + Vite SPA for the GreenTalk community blog and plant exchange platform.

---

<p align="center">
  <img src="./images/homepage.PNG" alt="Form Screenshot" width="800" />
</p>

## Table of Contents

1. [Tech Stack & Design Decisions](#tech-stack--design-decisions)
2. [SEO Caveat (SPA approach)](#seo-caveat-spa-approach)
3. [Project Structure](#project-structure)
4. [Prerequisites — Local Dev](#prerequisites--local-dev)
5. [Local Installation](#local-installation)
6. [Environment Variables](#environment-variables)
7. [Running Tests](#running-tests)
8. [Component Reference](#component-reference)
9. [Production Deployment — Ubuntu 24.04 LTS (No Docker)](#production-deployment--ubuntu-2404-lts-no-docker)
10. [Security Notes](#security-notes)

---

## Tech Stack & Design Decisions

| Package | Version | Why |
|---------|---------|-----|
| React | 19.1.0 | Latest stable |
| Vite | 6.3.5 | Fast HMR, native ESM, replaces deprecated CRA |
| React Router | 7.6.1 | Client-side routing with lazy loading |
| Axios | 1.9.0 | HTTP client; interceptor-based JWT + refresh flow |
| Zustand | 5.0.4 | Chosen over Redux Toolkit — lighter API, no boilerplate, sufficient for auth + notifications global state |
| TipTap | 2.11.7 | Rich text editor (MIT license); chosen over React-Quill (maintenance slowed in 2023) |
| react-helmet-async | 2.0.5 | Per-route `<title>` and meta tags for SEO |
| DOMPurify | 3.2.6 | Client-side XSS sanitization of server-rendered HTML |
| Tailwind CSS | 4.1.10 | Utility-first CSS; v4 uses CSS-first `@theme` config (no `tailwind.config.js`) |
| react-hot-toast | 2.5.2 | Lightweight toast notifications |
| Vitest + RTL | 3.2.4 + 16.3.0 | Test runner matched to Vite build tool; faster than Jest for Vite projects |

**State management choice — Zustand over Redux Toolkit:**
GreenTalk's global state is limited to two concerns: auth session and notifications. Zustand handles both with minimal boilerplate and no provider nesting beyond what's needed. Redux Toolkit would be justified for a much larger state surface.

---

## SEO Caveat (SPA approach)

GreenTalk frontend is a **plain Vite SPA** — no SSR, no Next.js.

This means:
- Search engine crawlers receive an empty `<div id="root">` initially and see content only after JavaScript executes.
- Modern Googlebot handles JavaScript rendering reasonably, but indexing may lag by days.
- Dynamic `<title>` and meta tags are injected per-route via `react-helmet-async`, pulling `seo_meta_title` / `seo_meta_description` from the backend API.
- A `/sitemap.xml` is served by the Django backend listing all published posts.

**To get full crawler-visible HTML in the future**, the app would need to be migrated to a framework with SSR (Next.js, Remix) or a static pre-rendering pipeline. That is deliberately out of scope for this project phase and is a separate, larger migration effort.

---

## Project Structure

```
frontend/
├── public/                  # Static assets (favicon, etc.)
├── src/
│   ├── api/                 # Axios API modules (client.js, auth, posts, blog, marketplace…)
│   ├── context/             # AuthContext, NotificationContext
│   ├── hooks/               # useApi, useForm
│   ├── routes/              # AppRouter, ProtectedRoute
│   ├── components/
│   │   ├── layout/          # Navbar, Footer, PageLayout
│   │   ├── ui/              # LoadingSpinner, Modal, Pagination, SearchBar, ErrorBoundary, ImageUploader
│   │   ├── blog/            # PostCard, CommentThread
│   │   ├── marketplace/     # ListingCard
│   │   └── editor/          # RichTextEditor (TipTap)
│   ├── pages/
│   │   ├── public/          # Home, BlogList, BlogDetail, Login, Register, …
│   │   ├── user/            # Profile, MyPosts, CreatePost, MyListings, …
│   │   ├── admin/           # ModerationDashboard, ManageCategories, UserManagement, AuditLogs
│   │   └── errors/          # NotFoundPage, ForbiddenPage
│   ├── utils/               # sanitize.js, validators.js, formatters.js
│   ├── styles/              # global.css (Tailwind v4 + design tokens)
│   ├── __tests__/           # Vitest + RTL test suite
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── package.json
├── .env.example
├── .env.development
└── .env.production
```

---

## Prerequisites — Local Dev

- **Node.js 22.x LTS** — install via nvm (recommended):
  ```bash
  # Install nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc   # or restart terminal

  # Install and use Node 22 LTS
  nvm install 22
  nvm use 22

  # Verify
  node --version   # v22.x.x
  npm --version    # 10.x.x
  ```

- **Django backend running** at `http://localhost:8000` (see `backend/README.md`)

---

## Local Installation

### 1. Clone and enter the frontend directory

```bash
cd AI-Prompt-Driven-Blog/frontend
```

### 2. Install dependencies

```bash
npm install
```

> Use `npm install` (not `npm ci`) on first setup — `package-lock.json` is generated on first run.
> In CI and production, always use `npm ci` for reproducible installs.

### 3. Configure environment variables

```bash
cp .env.example .env.development
```

The defaults in `.env.development` work out of the box with the Vite dev proxy:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=GreenTalk
VITE_APP_URL=http://localhost:3000
```

The Vite dev server proxies `/api/` and `/media/` to `http://localhost:8000` automatically (configured in `vite.config.js`), so no CORS issues during local development.

### 4. Start the development server

```bash
npm run dev
```

App is available at: `http://localhost:3000`

Make sure the Django backend is running (`python manage.py runserver`) before starting the frontend.

### 5. Connect to the local Django backend

The Vite proxy config in `vite.config.js` handles this automatically:
```js
proxy: {
  '/api':   { target: 'http://127.0.0.1:8000', changeOrigin: true },
  '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
}
```

No extra CORS or auth setup is needed for local development.

---

## Environment Variables

All variables must be prefixed with `VITE_` to be exposed to the browser bundle.
**Never put secrets in frontend environment variables** — they are visible in the built JS.

| Variable | Dev default | Production | Description |
|----------|------------|------------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | `https://yourdomain.com` | Django backend URL |
| `VITE_APP_NAME` | `GreenTalk` | `GreenTalk` | App name for titles |
| `VITE_APP_DESCRIPTION` | `Community blog…` | same | Default meta description |
| `VITE_APP_URL` | `http://localhost:3000` | `https://yourdomain.com` | Frontend canonical URL |

---

## Running Tests

```bash
# Run full test suite with coverage report
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# Open interactive Vitest UI
npm run test:ui
```

Coverage report is generated at `htmlcov/index.html` (open in browser).

**Coverage threshold:** 60% lines minimum (enforced in `vite.config.js`).

### Test coverage areas

| Test file | What it covers |
|-----------|---------------|
| `LoadingSpinner.test` | Rendering, size props, ARIA |
| `Pagination.test` | All page states, disabled buttons, ellipsis, ARIA |
| `SearchBar.test` | Controlled input, form submit, accessibility |
| `Modal.test` | Open/close, Escape key, backdrop, ARIA attrs |
| `PostCard.test` | Link href, category badge, status badge, author, stats |
| `validators.test` | All validator functions with edge cases |
| `sanitize.test` | XSS script/event/iframe removal, allowed tags |
| `formatters.test` | Date, price, truncate, roleLabel, statusVariant |
| `LoginPage.test` | Integration: fields, validation, API call, links |
| `ProtectedRoute.test` | Security: unauth redirect, role hierarchy, 403 |
| `RegisterPage.test` | Password mismatch, weak password, valid submit |

---

## Component Reference

### `<Navbar />`
Role-aware top navigation. Shows admin links only to `blog_admin`/`super_admin` users.
**Security note:** link hiding is UX only. The backend enforces permissions on every API call.

### `<ProtectedRoute role="blog_admin">`
Wraps routes requiring authentication. Optional `role` prop enforces minimum role.
- No `role` → any authenticated user
- `role="blog_admin"` → blog_admin or super_admin
- `role="super_admin"` → super_admin only

Redirects to `/login` if unauthenticated, `/403` if wrong role.

### `<RichTextEditor value onChange placeholder />`
TipTap-based editor. Outputs sanitized HTML. Use with `sanitize()` from `utils/sanitize.js` when rendering the output.

### `<ImageUploader onSelect currentUrl label />`
Validates file type (MIME + extension) and size (max 5MB) client-side before attaching to FormData. Server also validates independently.

### `<PostCard post />`
Displays a blog post summary. `post` must match the API response shape.

### `<ListingCard listing type />`
`type`: `'exchange'` or `'purchase'`. Adapts display accordingly.

### `<Pagination currentPage totalPages onPageChange />`
Renders nothing if `totalPages <= 1`. Uses smart ellipsis for large page counts.

### `<Modal isOpen onClose title size />`
Accessible dialog. Closes on Escape key or backdrop click. `size`: `'sm' | 'md' | 'lg' | 'xl'`.

### `<ErrorBoundary fallback />`
Class component (React requirement). Catches render errors, shows fallback UI with a "try again" button.

---

## Production Deployment — Ubuntu 24.04 LTS (No Docker)

**Architecture:** React SPA → `npm run build` → static `dist/` folder → served by nginx. nginx also reverse-proxies `/api/` to the Django/Gunicorn backend on the same server.

---

### Step 1: Install Node.js 22 via nvm

**Option A — Build on server (simpler):**
```bash
# On the Ubuntu 24.04 server
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

nvm install 22
nvm use 22
node --version   # v22.x.x
```

**Option B — Build locally / in CI, upload only `dist/`:**
```bash
# On your local machine or CI runner
npm ci              # reproducible install from package-lock.json
npm run build       # produces dist/

# Upload dist/ to server
rsync -avz dist/ user@yourserver:/var/www/greentalk/frontend/dist/
```
Option B is recommended for production — no Node.js required on the server at runtime.

---

### Step 2: Clone and install (if building on server)

```bash
cd /var/www/greentalk/frontend

# Reproducible install — uses exact versions from package-lock.json
npm ci
```

---

### Step 3: Configure production environment

```bash
cp .env.example .env.production
nano .env.production
```

```env
VITE_API_BASE_URL=https://yourdomain.com
VITE_APP_NAME=GreenTalk
VITE_APP_DESCRIPTION=Community blog and plant exchange platform
VITE_APP_URL=https://yourdomain.com
```

---

### Step 4: Build the production bundle

```bash
npm run build
```

This produces `dist/` — a folder of optimised static files (JS chunks, CSS, HTML).

Output includes:
- `dist/index.html` — entry point
- `dist/assets/` — hashed JS/CSS bundles (cache-forever headers safe)

---

### Step 5: Configure nginx

The nginx config does two things:
1. Serves the React SPA static files from `dist/`
2. Reverse-proxies `/api/` and `/media/` to the Django/Gunicorn backend

```bash
sudo nano /etc/nginx/sites-available/greentalk
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # SSL — managed by certbot
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options    "nosniff"                                       always;
    add_header X-Frame-Options           "DENY"                                          always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin"               always;
    # Content-Security-Policy — tighten further once CDN domains are known
    add_header Content-Security-Policy
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';"
      always;

    client_max_body_size 10M;

    # -------------------------------------------------------
    # 1. Serve React SPA static files
    # -------------------------------------------------------
    root /var/www/greentalk/frontend/dist;
    index index.html;

    location / {
        # SPA fallback: all non-file routes serve index.html
        # React Router handles routing client-side
        try_files $uri $uri/ /index.html;
    }

    # Cache hashed asset bundles forever (Vite adds content hash to filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # -------------------------------------------------------
    # 2. Proxy API calls to Django/Gunicorn backend
    # -------------------------------------------------------
    location /api/ {
        proxy_pass         http://unix:/run/greentalk/greentalk.sock;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120;
    }

    location /admin/ {
        proxy_pass         http://unix:/run/greentalk/greentalk.sock;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # -------------------------------------------------------
    # 3. Serve Django media files directly via nginx
    # -------------------------------------------------------
    location /media/ {
        alias /var/www/greentalk/backend/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Django static (if not using WhiteNoise)
    location /static/ {
        alias /var/www/greentalk/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SEO files served by Django
    location = /sitemap.xml {
        proxy_pass http://unix:/run/greentalk/greentalk.sock;
        proxy_set_header Host $host;
    }
    location = /robots.txt {
        proxy_pass http://unix:/run/greentalk/greentalk.sock;
        proxy_set_header Host $host;
    }
}
```

Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/greentalk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 6: SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### Step 7: Verify deployment

```bash
# Check nginx is serving SPA
curl -s https://yourdomain.com | grep '<div id="root">'

# Check API proxy is working
curl -s https://yourdomain.com/api/posts/ | head -c 200

# Check SPA routing fallback works
curl -s https://yourdomain.com/blog/some-post | grep '<div id="root">'
```

---

### Updating the frontend (re-deploy)

```bash
cd /var/www/greentalk/frontend
git pull origin main
npm ci
npm run build
# nginx serves the new dist/ immediately — no restart needed
```

---

## Security Notes

| Concern | Implementation |
|---------|---------------|
| XSS | DOMPurify sanitizes all user-generated HTML before `dangerouslySetInnerHTML` |
| Token storage | Access token in React memory only (never localStorage). Refresh token in HttpOnly cookie set by backend |
| Open redirect | Login page validates `from` path is relative before redirecting |
| Role-based UI | Admin controls hidden for non-admin roles — **UX only**. Backend enforces permissions on every API call |
| File uploads | Client validates MIME type, extension, and size (≤ 5MB) before sending. Server validates independently |
| CSP | nginx `Content-Security-Policy` header restricts script/style sources |
| HTTPS | Enforced via nginx redirect and HSTS header in production |
| Secrets | No secrets in frontend env vars (all `VITE_` vars are bundled into client JS and visible) |

---

## Running Commands Reference

```bash
npm run dev      # Start Vite dev server on :3000
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm test         # Run full Vitest test suite with coverage
npm run lint     # ESLint check
```
