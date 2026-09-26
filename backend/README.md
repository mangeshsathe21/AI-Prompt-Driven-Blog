# GreenTalk Backend

A community blog and plant exchange/marketplace platform built with Django + Django REST Framework.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack & Versions](#tech-stack--versions)
3. [Prerequisites](#prerequisites)
4. [Local Development Setup](#local-development-setup)
5. [Running Tests](#running-tests)
6. [Gmail SMTP Setup (Production Email)](#gmail-smtp-setup-production-email)
7. [Production Deployment — Ubuntu 24.04 LTS](#production-deployment--ubuntu-2404-lts)
8. [Security Notes](#security-notes)
9. [Environment Variable Checklist](#environment-variable-checklist)

---

## Architecture Overview

```
backend/
├── greentalk/              # Django project package
│   ├── settings/
│   │   ├── base.py         # Shared settings (all environments)
│   │   ├── local.py        # Local dev overrides
│   │   └── production.py   # Production hardened settings
│   ├── urls.py             # Root URL configuration
│   └── wsgi.py
├── apps/
│   ├── core/               # Shared: permissions, sanitizer, pagination, utils
│   ├── accounts/           # User model, JWT auth, email verification
│   ├── blog/               # Posts, categories, tags, comments, likes
│   ├── marketplace/        # Plants, exchange listings, purchase listings, orders
│   ├── notifications/      # In-app notifications
│   └── audit/              # Append-only audit log
├── templates/
│   └── email/              # HTML email templates
├── tests/                  # pytest test suite
├── media/                  # Uploaded files (gitignored)
├── staticfiles/            # Collected static files (gitignored)
├── requirements.txt        # Pinned == dependencies
├── .env.example            # Environment variable template
├── pytest.ini
└── manage.py
```

**Request flow:**
```
Client (React) → nginx (prod) / Django dev server (local)
    → JWT middleware (validates Bearer token)
    → DRF View → Permission check → Serializer (validate + sanitize)
    → Model / ORM (parameterized queries only)
    → PostgreSQL
    → Response JSON
```

**Auth flow:**
- Access token: returned in JSON body → frontend keeps in memory (never localStorage)
- Refresh token: set as `HttpOnly; Secure; SameSite=Strict` cookie → frontend never touches it

---

## Tech Stack & Versions

| Component | Version | License |
|-----------|---------|---------|
| Python | 3.12.x | PSF |
| Django | 5.2.1 (LTS) | BSD |
| djangorestframework | 3.16.0 | BSD |
| djangorestframework-simplejwt | 5.5.0 | MIT |
| psycopg2-binary | 2.9.10 | LGPL |
| django-environ | 0.11.2 | MIT |
| django-cors-headers | 4.7.0 | MIT |
| nh3 | 0.2.18 | MIT |
| python-slugify | 8.0.4 | MIT |
| Pillow | 11.2.1 | HPND |
| drf-spectacular | 0.28.0 | BSD |
| gunicorn | 23.0.0 | MIT |
| whitenoise | 6.9.0 | MIT |
| pytest-django | 4.10.0 | BSD |
| PostgreSQL | 17.x | PostgreSQL |

---

## Prerequisites

- Python 3.12.x
- PostgreSQL 17.x (database `blog` already created)
- Git

---

## Local Development Setup

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd AI-Prompt-Driven-Blog/backend
```

### 2. Create and activate virtual environment

```bash
# Windows (PowerShell)
python -m venv venv
venv\Scripts\Activate.ps1

# macOS / Linux
python3.12 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env` and set at minimum:
```env
DJANGO_SECRET_KEY=your-50-plus-char-random-secret-key
DJANGO_DEBUG=True
DJANGO_SETTINGS_MODULE=greentalk.settings.local
DB_NAME=blog
DB_USER=postgres
DB_PASSWORD=root
DB_HOST=127.0.0.1
DB_PORT=5432
SITE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

Generate a strong secret key:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5. Run database migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Create a superuser

```bash
python manage.py createsuperuser
```

When prompted, set:
- Email: `admin@greentalk.io`
- Username: `superadmin`
- Password: something strong

Then in the Django shell, set the role to `super_admin`:

```bash
python manage.py shell
```
```python
from apps.accounts.models import User
u = User.objects.get(email='admin@greentalk.io')
u.role = 'super_admin'
u.is_verified = True
u.save()
exit()
```

### 7. (Optional) Load seed data from Prompt 1

```bash
# Load the DB seed data from the db/ directory
psql -U postgres -d blog -f ../db/seed_data.sql
```

### 8. Run the development server

```bash
python manage.py runserver
```

API available at: `http://localhost:8000/api/`
Django Admin: `http://localhost:8000/admin/`
Swagger UI: `http://localhost:8000/api/docs/`
ReDoc: `http://localhost:8000/api/docs/redoc/`

---

## Running Tests

```bash
# Full test suite with coverage report
pytest

# Run specific module
pytest tests/accounts/
pytest tests/security/

# Run without coverage (faster during development)
pytest --no-cov

# Show coverage HTML report
open htmlcov/index.html   # macOS
start htmlcov/index.html  # Windows
```

**Coverage target:** 70% minimum (enforced by `--cov-fail-under=70` in pytest.ini).

### Security audit

```bash
# Check all installed packages for known vulnerabilities
pip-audit

# Alternative
safety check -r requirements.txt
```

---

## Gmail SMTP Setup (Production Email)

GreenTalk uses Gmail SMTP with an App Password for production emails (no paid service required).

### Step 1: Enable 2-Factor Authentication on your Gmail account

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification → Turn On

### Step 2: Generate an App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other** → type "GreenTalk"
4. Click **Generate**
5. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Step 3: Configure production .env

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_gmail@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
DEFAULT_FROM_EMAIL=GreenTalk <your_gmail@gmail.com>
```

### Step 4: Test email sending

```bash
python manage.py shell
```
```python
from django.core.mail import send_mail
send_mail('Test', 'Hello from GreenTalk!', None, ['your@email.com'])
```

**Note:** Gmail free tier allows ~500 emails/day. For higher volume, consider Brevo (formerly Sendinblue) or Mailgun free tier — both have SMTP APIs compatible with Django's email backend.

---

## Production Deployment — Ubuntu 24.04 LTS

> **No Docker.** Direct installation on the server using `pyenv`, PGDG PostgreSQL, gunicorn, and nginx.

### Prerequisites

- Ubuntu 24.04 LTS server (minimum 1GB RAM, 1 vCPU)
- Domain name pointing to server IP
- SSH access as a non-root sudo user

---

### Step 1: System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
    git curl wget build-essential libssl-dev \
    libffi-dev libbz2-dev libreadline-dev libsqlite3-dev \
    zlib1g-dev liblzma-dev libncurses-dev libxml2-dev \
    libxmlsec1-dev llvm xz-utils tk-dev \
    nginx certbot python3-certbot-nginx
```

---

### Step 2: Install Python 3.12 via pyenv

```bash
# Install pyenv
curl https://pyenv.run | bash

# Add to shell (add these 3 lines to ~/.bashrc or ~/.bash_profile)
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init - bash)"

# Reload shell
source ~/.bashrc

# Install Python 3.12 (latest patch)
pyenv install 3.12.10
pyenv global 3.12.10

# Verify
python --version
# Python 3.12.10
```

---

### Step 3: Install PostgreSQL 17 via PGDG

```bash
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
     --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc

sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
> /etc/apt/sources.list.d/pgdg.list'

sudo apt update
sudo apt install -y postgresql-17

# Start and enable
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and set password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_strong_prod_password';"
sudo -u postgres createdb blog

# Verify
psql --version
# psql (PostgreSQL) 17.x
```

---

### Step 4: Set Up Application Directory

```bash
# Create app user (no login shell, security best practice)
sudo useradd --system --no-create-home --shell /usr/sbin/nologin greentalk

# Create app directory
sudo mkdir -p /var/www/greentalk
sudo chown $USER:$USER /var/www/greentalk

# Clone repository
cd /var/www/greentalk
git clone <repo-url> .
```

---

### Step 5: Create Production Virtual Environment

```bash
cd /var/www/greentalk/backend

# Create venv using pyenv Python
python -m venv venv
source venv/bin/activate

# Install exact pinned dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Verify key package versions
pip show django djangorestframework djangorestframework-simplejwt
```

---

### Step 6: Configure Production Environment

```bash
cp .env.example .env
nano .env
```

Set ALL production values (see [Environment Variable Checklist](#environment-variable-checklist)):

```env
DJANGO_SECRET_KEY=<your-50+-char-secret>
DJANGO_DEBUG=False
DJANGO_SETTINGS_MODULE=greentalk.settings.production
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

DB_NAME=blog
DB_USER=postgres
DB_PASSWORD=your_strong_prod_password
DB_HOST=127.0.0.1
DB_PORT=5432

CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_gmail@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
DEFAULT_FROM_EMAIL=GreenTalk <your_gmail@gmail.com>

SITE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

---

### Step 7: Collect Static Files and Run Migrations

```bash
cd /var/www/greentalk/backend
source venv/bin/activate

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

Create log directory:
```bash
sudo mkdir -p /var/log/greentalk
sudo chown greentalk:greentalk /var/log/greentalk
```

---

### Step 8: Configure Gunicorn as a systemd Service

```bash
sudo nano /etc/systemd/system/greentalk.service
```

Paste the following (adjust paths if different):

```ini
[Unit]
Description=GreenTalk Django Application (Gunicorn)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
User=greentalk
Group=www-data
WorkingDirectory=/var/www/greentalk/backend
EnvironmentFile=/var/www/greentalk/backend/.env
ExecStart=/var/www/greentalk/backend/venv/bin/gunicorn \
    --workers 3 \
    --worker-class sync \
    --bind unix:/run/greentalk/greentalk.sock \
    --timeout 120 \
    --access-logfile /var/log/greentalk/access.log \
    --error-logfile /var/log/greentalk/error.log \
    greentalk.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create the socket directory:
```bash
sudo mkdir -p /run/greentalk
sudo chown greentalk:www-data /run/greentalk
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable greentalk
sudo systemctl start greentalk

# Verify it's running
sudo systemctl status greentalk
```

---

### Step 9: Configure nginx as Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/greentalk
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    # Redirect HTTP to HTTPS (certbot will update this after SSL setup)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 10M;

    # Static files served directly by nginx (or via WhiteNoise — see below)
    location /static/ {
        alias /var/www/greentalk/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files served by nginx
    location /media/ {
        alias /var/www/greentalk/backend/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # All other requests proxy to Gunicorn
    location / {
        proxy_pass http://unix:/run/greentalk/greentalk.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120;
        proxy_connect_timeout 10;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/greentalk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 10: SSL Certificate with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot auto-renews every 90 days. Test renewal:
```bash
sudo certbot renew --dry-run
```

---

### Step 11: Verify Deployment

```bash
# Check services
sudo systemctl status greentalk
sudo systemctl status nginx
sudo systemctl status postgresql

# Test API
curl https://yourdomain.com/api/posts/
curl https://yourdomain.com/robots.txt

# Check logs
sudo journalctl -u greentalk -f
tail -f /var/log/greentalk/error.log
```

---

### Deployment Updates (CI/CD pattern)

```bash
cd /var/www/greentalk
git pull origin main

cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

sudo systemctl restart greentalk
```

---

### WhiteNoise vs nginx for Static Files

Both are configured. The default in `production.py` uses **WhiteNoise** (simpler, no separate nginx config needed):

- WhiteNoise serves `/static/` directly from Django/Gunicorn with compression and caching
- nginx config above has `/static/` location block too — the first to match wins
- For high-traffic sites, nginx direct serving is faster; for small-medium sites, WhiteNoise is fine

To use **nginx only** for static files, remove `whitenoise.middleware.WhiteNoiseMiddleware` from `MIDDLEWARE` in production settings. Both approaches are production-ready.

---

## Security Notes

| Concern | Implementation |
|---------|---------------|
| XSS | `nh3` sanitizes all HTML post/comment content server-side before DB storage |
| SQL Injection | Django ORM + parameterized queries only; no string-formatted SQL |
| CSRF | Django `CsrfViewMiddleware` for session-based views; JWT API is stateless; refresh token cookie is `SameSite=Strict` |
| Auth tokens | Access token in memory only; refresh token in `HttpOnly; Secure; SameSite=Strict` cookie |
| Password hashing | Django PBKDF2-SHA256 (configurable to argon2/bcrypt) |
| Rate limiting | DRF throttling: login 5/min, register 5/hr, password reset 3/hr |
| HSTS | 1 year, includeSubDomains, preload (production only) |
| File uploads | Extension + MIME magic-byte check, 5MB limit, UUID filenames, ClamAV hook |
| Audit logs | Append-only DB table + Python-level `save()`/`delete()` guards |
| Secrets | All in `.env` — never in source control |

---

## Environment Variable Checklist

### Local development (.env)

| Variable | Example | Required |
|----------|---------|----------|
| `DJANGO_SECRET_KEY` | `50-char-random` | ✅ |
| `DJANGO_DEBUG` | `True` | ✅ |
| `DJANGO_SETTINGS_MODULE` | `greentalk.settings.local` | ✅ |
| `DB_NAME` | `blog` | ✅ |
| `DB_USER` | `postgres` | ✅ |
| `DB_PASSWORD` | `root` | ✅ |
| `DB_HOST` | `127.0.0.1` | ✅ |
| `DB_PORT` | `5432` | ✅ |
| `EMAIL_BACKEND` | `console.EmailBackend` | ✅ |
| `SITE_URL` | `http://localhost:8000` | ✅ |
| `FRONTEND_URL` | `http://localhost:3000` | ✅ |

### Production additions

| Variable | Example | Required |
|----------|---------|----------|
| `DJANGO_DEBUG` | `False` | ✅ |
| `DJANGO_SETTINGS_MODULE` | `greentalk.settings.production` | ✅ |
| `DJANGO_ALLOWED_HOSTS` | `yourdomain.com,www.yourdomain.com` | ✅ |
| `CORS_ALLOWED_ORIGINS` | `https://yourdomain.com` | ✅ |
| `EMAIL_BACKEND` | `smtp.EmailBackend` | ✅ |
| `EMAIL_HOST` | `smtp.gmail.com` | ✅ |
| `EMAIL_PORT` | `587` | ✅ |
| `EMAIL_USE_TLS` | `True` | ✅ |
| `EMAIL_HOST_USER` | `you@gmail.com` | ✅ |
| `EMAIL_HOST_PASSWORD` | `xxxx xxxx xxxx xxxx` | ✅ |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `60` | optional |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | `7` | optional |
| `POST_AUTO_PUBLISH_FOR_ADMINS` | `True` | optional |

---

## Remediation Notes (Prompt 4 — What Was Found and Fixed)

### Migration State at Time of Remediation

**Scenario classified as: (b) — Models existed but no migrations had been generated.**

All 5 local app migration folders (`accounts`, `blog`, `marketplace`, `notifications`, `audit`) contained only `__init__.py`. No `0001_initial.py` existed in any of them. The tables in the `blog` database had been created by running `db/schema.sql` directly (raw SQL from Prompt 1), which Django's migration system had no record of.

**Action taken:**

1. `python manage.py makemigrations` — generated initial migrations for all 5 apps.
2. `python manage.py migrate` — applied all migrations cleanly to the existing database.
3. `python manage.py makemigrations --check` — confirmed zero pending changes after migration.

### Additional Fixes Applied

| Issue | Fix |
|-------|-----|
| `backend/.env` did not exist | Created with current local dev values (`postgres`/`root`/`blog`) |
| `imghdr` removed in Python 3.13 | Replaced with Pillow-based image format detection in `core/file_upload.py` |
| `django.contrib.postgres` missing from `INSTALLED_APPS` | Added to `base.py` (required for `SearchVectorField`, `GinIndex`) |
| `STATICFILES_STORAGE` deprecated in Django 4.2 | Replaced with `STORAGES` dict in `base.py` and `production.py` |
| `local.py` used wrong `REST_FRAMEWORK` merge pattern | Fixed to mutate `REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]` directly |
| No `.gitignore` existed | Created root `.gitignore` (excludes `.env`, `media/`, `staticfiles/`, `node_modules/`, `*.dump`) |
| No `create_production_role.sql` | Created at `db/create_production_role.sql` (clearly labeled production-only) |

### Before Deploying to Production

1. Run `db/create_production_role.sql` once on the production PostgreSQL server:
   ```bash
   sudo -u postgres psql -d blog -f db/create_production_role.sql
   ```
2. Update your **production `.env`** only:
   ```env
   DB_USER=greentalk_app
   DB_PASSWORD=<the strong password from create_production_role.sql>
   ```
3. **Never use `postgres`/`root` credentials in production.**
4. The `db/create_production_role.sql` script is clearly labeled — do not run it locally.

### Quick Start (after this remediation)

```bash
# 1. Activate venv
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy env file (already done — .env exists with local values)
# cp .env.example .env   # only needed on fresh clone

# 4. Run migrations (already applied — run on fresh clone)
python manage.py migrate --settings=greentalk.settings.local

# 5. Create superuser
python manage.py createsuperuser --settings=greentalk.settings.local

# 6. Run dev server
python manage.py runserver --settings=greentalk.settings.local
# API: http://localhost:8000/api/
# Admin: http://localhost:8000/admin/
# Swagger: http://localhost:8000/api/docs/
```
