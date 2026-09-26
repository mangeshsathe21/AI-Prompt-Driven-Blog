-- ============================================================
-- GreenTalk — Production Database Role
-- ============================================================
-- !! DO NOT RUN THIS AGAINST YOUR LOCAL DEV DATABASE !!
-- !! RUN THIS ONLY ONCE ON THE PRODUCTION SERVER     !!
-- !! BEFORE deploying the application.               !!
--
-- Steps:
--   1. SSH into your Ubuntu 24.04 LTS production server
--   2. Run:  sudo -u postgres psql -d blog -f create_production_role.sql
--   3. Note the password you set below in a password manager
--   4. Update your PRODUCTION .env file:
--         DB_USER=greentalk_app
--         DB_PASSWORD=<the strong password you set here>
--   5. Restart Gunicorn: sudo systemctl restart greentalk
--
-- After this, the application connects as greentalk_app (not postgres).
-- The postgres superuser is no longer used by the app in production.
-- ============================================================

-- 1. Create the dedicated application role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'greentalk_app') THEN
        -- IMPORTANT: Replace 'CHANGE_ME_STRONG_PROD_PASSWORD' with a real
        -- strong password (20+ chars, mixed case, numbers, symbols).
        -- Use: python -c "import secrets; print(secrets.token_urlsafe(32))"
        CREATE ROLE greentalk_app
            WITH LOGIN
            PASSWORD 'CHANGE_ME_STRONG_PROD_PASSWORD'
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE;
        RAISE NOTICE 'Role greentalk_app created.';
    ELSE
        RAISE NOTICE 'Role greentalk_app already exists — skipping CREATE.';
    END IF;
END
$$;

-- 2. Grant connection and schema access
GRANT CONNECT ON DATABASE blog TO greentalk_app;
GRANT USAGE ON SCHEMA public TO greentalk_app;

-- 3. Grant DML on all existing tables (run after Django migrate)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO greentalk_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO greentalk_app;

-- 4. Auto-grant DML on any future tables Django creates
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greentalk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO greentalk_app;

-- 5. Audit log is append-only — revoke UPDATE and DELETE for the app role
-- (inserts are still allowed; the model's save() also enforces this)
REVOKE UPDATE, DELETE ON audit_logs FROM greentalk_app;

-- ============================================================
-- Verification: after running, confirm with:
--   SELECT rolname, rolcanlogin, rolsuper FROM pg_roles
--   WHERE rolname = 'greentalk_app';
-- Expected: rolcanlogin=t, rolsuper=f
-- ============================================================
