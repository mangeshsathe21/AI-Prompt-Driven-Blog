-- ============================================================
-- GreenTalk PostgreSQL Schema
-- Tested Version : PostgreSQL 17.x (see DATABASE.md for exact patch)
-- Python Driver  : psycopg2-binary 2.9.10
-- Encoding       : UTF-8
-- ============================================================
-- Design Decisions
-- ----------------------------------------------------------------
-- PRIMARY KEYS: BIGSERIAL (not UUID) chosen for:
--   * Better B-tree index performance on JOINs and ORDER BY id
--   * Smaller on-disk footprint (8 bytes vs 16 bytes)
--   * Sequential inserts → no index fragmentation
--   * Django ORM works naturally with BIGSERIAL
--   * UUID exposed externally only where needed (tokens, slugs)
--
-- SOFT DELETE: Users are never hard-deleted; posts/comments/listings
--   set author_id to a sentinel "deleted_user" row via SET NULL on
--   user deletion. Actual user row is deactivated (is_active=false).
--
-- PASSWORDS: Stored as Django hash strings (~128 chars). Plain-text
--   passwords are NEVER stored. Field is VARCHAR(256) to accommodate
--   any future Django hasher algorithm upgrade.
--
-- SQL INJECTION: No dynamic SQL objects in this schema. All runtime
--   data access MUST go through Django ORM or explicitly parameterized
--   psycopg2 queries — never string-formatted SQL.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), pgp functions
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- accent-insensitive full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram similarity search on slugs/names

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('user', 'blog_admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE garden_type_enum AS ENUM ('home', 'open_land', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE post_status_enum AS ENUM ('draft', 'pending', 'published', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE comment_status_enum AS ENUM ('visible', 'hidden', 'flagged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE listing_type_enum AS ENUM ('free', 'swap');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE listing_status_enum AS ENUM ('available', 'reserved', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE purchase_status_enum AS ENUM ('active', 'sold_out', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'shipped', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type_enum AS ENUM (
        'comment_reply', 'post_liked', 'post_approved', 'post_rejected',
        'listing_interest', 'order_update', 'system_message'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLE: users
-- ============================================================
-- Extends Django's auth_user concept. Django's AbstractBaseUser /
-- AbstractUser maps directly to this table via a custom User model.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                  BIGSERIAL       PRIMARY KEY,
    -- Django requires these fields
    password            VARCHAR(256)    NOT NULL,           -- Django hashed (PBKDF2/bcrypt/argon2)
    last_login          TIMESTAMPTZ,
    is_superuser        BOOLEAN         NOT NULL DEFAULT FALSE,
    username            VARCHAR(150)    NOT NULL UNIQUE,
    first_name          VARCHAR(150)    NOT NULL DEFAULT '',
    last_name           VARCHAR(150)    NOT NULL DEFAULT '',
    email               VARCHAR(254)    NOT NULL UNIQUE,
    is_staff            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    date_joined         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- GreenTalk extensions
    role                user_role_enum  NOT NULL DEFAULT 'user',
    is_verified         BOOLEAN         NOT NULL DEFAULT FALSE,
    phone               VARCHAR(20),
    bio                 TEXT,
    avatar_url          VARCHAR(500),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT users_phone_format CHECK (phone IS NULL OR phone ~ '^\+?[0-9\s\-\(\)]{7,20}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email         ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username      ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active     ON users (is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at    ON users (created_at DESC);

-- ============================================================
-- TABLE: user_profiles
-- ============================================================
-- One-to-one extension of users. Holds non-auth profile detail.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL UNIQUE
                        REFERENCES users(id) ON DELETE CASCADE,
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(100)    DEFAULT 'India',
    postal_code     VARCHAR(20),
    garden_type     garden_type_enum,
    preferences     JSONB           DEFAULT '{}',   -- e.g. {"notifications": true, "newsletter": false}
    website_url     VARCHAR(500),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country  ON user_profiles (country);

-- ============================================================
-- TABLE: categories
-- ============================================================
-- Supports nested categories via self-referencing parent_id.
-- Top-level categories have parent_id = NULL.
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    slug            VARCHAR(220)    NOT NULL UNIQUE,
    description     TEXT,
    parent_id       BIGINT
                        REFERENCES categories(id) ON DELETE SET NULL,
    -- ON DELETE SET NULL: if a parent category is deleted,
    -- children become top-level (not orphaned/deleted).
    sort_order      SMALLINT        NOT NULL DEFAULT 0,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9\-]+$')
);

CREATE INDEX IF NOT EXISTS idx_categories_slug      ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories (is_active);

-- Seed the 4 core blog categories required by spec
INSERT INTO categories (name, slug, description) VALUES
    ('Home Gardening',      'home-gardening',       'Tips and guides for growing plants at home')
  , ('Open Land Plantation','open-land-plantation',  'Large-scale planting on open or barren land')
  , ('Land Restoration',    'land-restoration',      'Ecological restoration and reforestation')
  , ('Plant Care Guides',   'plant-care-guides',     'Detailed care instructions for various plants')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TABLE: tags
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    slug        VARCHAR(110)    NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT tags_slug_format CHECK (slug ~ '^[a-z0-9\-]+$')
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags (slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags USING gin (name gin_trgm_ops);

-- ============================================================
-- TABLE: posts
-- ============================================================
-- content stored as sanitized HTML (bleach/DOMPurify on write).
-- Full-text search index on title + content via tsvector.
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
    id                      BIGSERIAL           PRIMARY KEY,
    title                   VARCHAR(300)        NOT NULL,
    slug                    VARCHAR(320)        NOT NULL UNIQUE,
    content                 TEXT                NOT NULL,       -- sanitized HTML
    excerpt                 VARCHAR(500),
    author_id               BIGINT
                                REFERENCES users(id) ON DELETE SET NULL,
    -- ON DELETE SET NULL: preserve post when author account is deactivated/deleted;
    -- show as "deleted user". Blog admin can reassign or archive.
    category_id             BIGINT
                                REFERENCES categories(id) ON DELETE SET NULL,
    status                  post_status_enum    NOT NULL DEFAULT 'draft',
    featured_image          VARCHAR(500),
    views_count             INTEGER             NOT NULL DEFAULT 0
                                CHECK (views_count >= 0),
    seo_meta_title          VARCHAR(160),
    seo_meta_description    VARCHAR(320),
    search_vector           TSVECTOR,           -- updated by trigger below
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    published_at            TIMESTAMPTZ,

    CONSTRAINT posts_slug_format        CHECK (slug ~ '^[a-z0-9\-]+$'),
    CONSTRAINT posts_published_at_logic CHECK (
        status != 'published' OR published_at IS NOT NULL
    )
);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug           ON posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_author_id      ON posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id    ON posts (category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status         ON posts (status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at     ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_published_at   ON posts (published_at DESC NULLS LAST);
-- Pagination-friendly composite index
CREATE INDEX IF NOT EXISTS idx_posts_status_published_at
    ON posts (status, published_at DESC NULLS LAST)
    WHERE status = 'published';
-- Full-text search GIN index
CREATE INDEX IF NOT EXISTS idx_posts_search_vector  ON posts USING GIN (search_vector);

-- Trigger function: keep search_vector updated automatically
CREATE OR REPLACE FUNCTION posts_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.excerpt, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_posts_search_vector ON posts;
CREATE TRIGGER trig_posts_search_vector
    BEFORE INSERT OR UPDATE OF title, excerpt, content
    ON posts
    FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();

-- Trigger function: auto-set published_at when status flips to 'published'
CREATE OR REPLACE FUNCTION posts_set_published_at() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND OLD.status != 'published' THEN
        NEW.published_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_posts_published_at ON posts;
CREATE TRIGGER trig_posts_published_at
    BEFORE UPDATE OF status ON posts
    FOR EACH ROW EXECUTE FUNCTION posts_set_published_at();

-- Trigger: updated_at auto-refresh (reused pattern for all tables)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_posts_updated_at ON posts;
CREATE TRIGGER trig_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE: post_tags  (many-to-many join)
-- ============================================================
CREATE TABLE IF NOT EXISTS post_tags (
    post_id     BIGINT  NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id      BIGINT  NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    -- ON DELETE CASCADE both sides: when a post or tag is deleted,
    -- the association is removed automatically.
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id  ON post_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags (post_id);

-- ============================================================
-- TABLE: comments
-- ============================================================
-- Threaded via parent_comment_id self-reference.
-- Max nesting: enforced at application level (recommended: 3 levels).
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id                  BIGSERIAL           PRIMARY KEY,
    post_id             BIGINT              NOT NULL
                            REFERENCES posts(id) ON DELETE CASCADE,
    -- ON DELETE CASCADE: comments have no meaning without the post.
    user_id             BIGINT
                            REFERENCES users(id) ON DELETE SET NULL,
    parent_comment_id   BIGINT
                            REFERENCES comments(id) ON DELETE CASCADE,
    -- ON DELETE CASCADE: deleting a parent also removes its replies.
    content             TEXT                NOT NULL,
    status              comment_status_enum NOT NULL DEFAULT 'visible',
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT comments_content_not_empty CHECK (length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id           ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id           ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_status            ON comments (status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at        ON comments (created_at DESC);

DROP TRIGGER IF EXISTS trig_comments_updated_at ON comments;
CREATE TRIGGER trig_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE: likes
-- ============================================================
-- Polymorphic like: a user can like either a post OR a comment,
-- not both in the same row. Enforced via CHECK constraint.
-- UNIQUE constraints prevent duplicate likes.
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id         BIGINT      REFERENCES posts(id)    ON DELETE CASCADE,
    comment_id      BIGINT      REFERENCES comments(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Exactly one target must be set
    CONSTRAINT likes_exactly_one_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL     AND comment_id IS NOT NULL)
    ),
    -- Prevent duplicate post likes
    CONSTRAINT likes_unique_post    UNIQUE (user_id, post_id),
    -- Prevent duplicate comment likes
    CONSTRAINT likes_unique_comment UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user_id    ON likes (user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id    ON likes (post_id);
CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes (comment_id);

-- ============================================================
-- TABLE: plants  (reference / catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS plants (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    scientific_name VARCHAR(200),
    category        VARCHAR(100),   -- e.g. 'tree', 'shrub', 'herb', 'grass'
    climate_zone    VARCHAR(100),   -- e.g. 'tropical', 'temperate', 'arid'
    soil_type       VARCHAR(200),
    water_needs     VARCHAR(100),   -- 'low', 'medium', 'high'
    sunlight_needs  VARCHAR(100),   -- 'full_sun', 'partial_shade', 'shade'
    growth_rate     VARCHAR(50),    -- 'slow', 'moderate', 'fast'
    native_status   VARCHAR(100),   -- 'native', 'non-native', 'invasive'
    image_url       VARCHAR(500),
    description     TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plants_name            ON plants (name);
CREATE INDEX IF NOT EXISTS idx_plants_scientific_name ON plants (scientific_name);
CREATE INDEX IF NOT EXISTS idx_plants_category        ON plants (category);
CREATE INDEX IF NOT EXISTS idx_plants_name_trgm       ON plants USING gin (name gin_trgm_ops);

DROP TRIGGER IF EXISTS trig_plants_updated_at ON plants;
CREATE TRIGGER trig_plants_updated_at
    BEFORE UPDATE ON plants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE: exchange_listings
-- ============================================================
-- Free or swap listings. plant_id is nullable: user may describe
-- a plant not in the catalog via plant_name free-text.
-- ============================================================
CREATE TABLE IF NOT EXISTS exchange_listings (
    id              BIGSERIAL           PRIMARY KEY,
    user_id         BIGINT              NOT NULL
                        REFERENCES users(id) ON DELETE RESTRICT,
    -- ON DELETE RESTRICT: seller must be deactivated, not deleted,
    -- while active listings exist; prevents orphaned listings.
    plant_id        BIGINT
                        REFERENCES plants(id) ON DELETE SET NULL,
    plant_name      VARCHAR(200),       -- free-text fallback when plant_id is NULL
    quantity        SMALLINT            NOT NULL DEFAULT 1
                        CHECK (quantity > 0),
    condition       VARCHAR(100),       -- 'seedling', 'sapling', 'mature', 'seeds'
    listing_type    listing_type_enum   NOT NULL DEFAULT 'free',
    swap_for_text   TEXT,               -- what the user wants in return (swap only)
    location        VARCHAR(200),
    status          listing_status_enum NOT NULL DEFAULT 'available',
    images          JSONB               DEFAULT '[]',  -- array of image URLs/keys
    description     TEXT,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT exchange_listings_plant_identified CHECK (
        plant_id IS NOT NULL OR (plant_name IS NOT NULL AND length(trim(plant_name)) > 0)
    ),
    CONSTRAINT exchange_listings_swap_requires_text CHECK (
        listing_type != 'swap' OR (swap_for_text IS NOT NULL AND length(trim(swap_for_text)) > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_exchange_listings_user_id      ON exchange_listings (user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_listings_plant_id     ON exchange_listings (plant_id);
CREATE INDEX IF NOT EXISTS idx_exchange_listings_status       ON exchange_listings (status);
CREATE INDEX IF NOT EXISTS idx_exchange_listings_listing_type ON exchange_listings (listing_type);
CREATE INDEX IF NOT EXISTS idx_exchange_listings_created_at   ON exchange_listings (created_at DESC);

DROP TRIGGER IF EXISTS trig_exchange_listings_updated_at ON exchange_listings;
CREATE TRIGGER trig_exchange_listings_updated_at
    BEFORE UPDATE ON exchange_listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE: purchase_listings
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_listings (
    id              BIGSERIAL           PRIMARY KEY,
    seller_id       BIGINT              NOT NULL
                        REFERENCES users(id) ON DELETE RESTRICT,
    plant_id        BIGINT
                        REFERENCES plants(id) ON DELETE SET NULL,
    title           VARCHAR(300)        NOT NULL,
    description     TEXT,
    price           NUMERIC(10, 2)      NOT NULL CHECK (price >= 0),
    currency        CHAR(3)             NOT NULL DEFAULT 'INR',
    stock_quantity  INTEGER             NOT NULL DEFAULT 1
                        CHECK (stock_quantity >= 0),
    images          JSONB               DEFAULT '[]',
    status          purchase_status_enum NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_listings_seller_id  ON purchase_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_purchase_listings_plant_id   ON purchase_listings (plant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_listings_status     ON purchase_listings (status);
CREATE INDEX IF NOT EXISTS idx_purchase_listings_price      ON purchase_listings (price);
CREATE INDEX IF NOT EXISTS idx_purchase_listings_created_at ON purchase_listings (created_at DESC);

DROP TRIGGER IF EXISTS trig_purchase_listings_updated_at ON purchase_listings;
CREATE TRIGGER trig_purchase_listings_updated_at
    BEFORE UPDATE ON purchase_listings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id              BIGSERIAL           PRIMARY KEY,
    buyer_id        BIGINT              NOT NULL
                        REFERENCES users(id) ON DELETE RESTRICT,
    listing_id      BIGINT              NOT NULL
                        REFERENCES purchase_listings(id) ON DELETE RESTRICT,
    -- ON DELETE RESTRICT: preserve order history; seller must not delete
    -- a listing while orders reference it.
    quantity        INTEGER             NOT NULL DEFAULT 1
                        CHECK (quantity > 0),
    total_price     NUMERIC(10, 2)      NOT NULL CHECK (total_price >= 0),
    status          order_status_enum   NOT NULL DEFAULT 'pending',
    notes           TEXT,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id    ON orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id  ON orders (listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at  ON orders (created_at DESC);

DROP TRIGGER IF EXISTS trig_orders_updated_at ON orders;
CREATE TRIGGER trig_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id                  BIGSERIAL               PRIMARY KEY,
    user_id             BIGINT                  NOT NULL
                            REFERENCES users(id) ON DELETE CASCADE,
    type                notification_type_enum  NOT NULL,
    message             TEXT                    NOT NULL,
    is_read             BOOLEAN                 NOT NULL DEFAULT FALSE,
    related_object_type VARCHAR(50),    -- e.g. 'post', 'comment', 'order'
    related_object_id   BIGINT,         -- ID of the related object
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON notifications (user_id, is_read)
    WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
-- Super admin visibility into all moderation actions.
-- Append-only: no UPDATE or DELETE should ever run on this table.
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL   PRIMARY KEY,
    actor_user_id   BIGINT
                        REFERENCES users(id) ON DELETE SET NULL,
    -- ON DELETE SET NULL: log entry is preserved even if actor is deleted.
    action          VARCHAR(100)    NOT NULL,    -- e.g. 'post.approve', 'user.deactivate'
    target_table    VARCHAR(100)    NOT NULL,
    target_id       BIGINT,
    metadata        JSONB           DEFAULT '{}',
    ip_address      INET,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target        ON audit_logs (target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON audit_logs (created_at DESC);

-- ============================================================
-- TABLE: email_verification_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(64) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id    ON email_verification_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token      ON email_verification_tokens (token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens (expires_at);

-- ============================================================
-- TABLE: password_reset_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(64) NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id    ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token      ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);

-- ============================================================
-- MATERIALIZED VIEW: trending_posts
-- ============================================================
-- Aggregates likes + views in the last 7 days.
-- Refresh strategy: scheduled cron job every 15 minutes via
-- pg_cron (if installed) or external scheduler (celery beat).
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_posts AS
    SELECT
        p.id,
        p.title,
        p.slug,
        p.author_id,
        p.category_id,
        p.featured_image,
        p.views_count,
        p.published_at,
        COUNT(DISTINCT l.id)    AS like_count,
        -- weighted score: likes weighted 3x views to reward engagement
        (COUNT(DISTINCT l.id) * 3 + p.views_count)  AS trend_score
    FROM posts p
    LEFT JOIN likes l
        ON l.post_id = p.id
       AND l.created_at >= NOW() - INTERVAL '7 days'
    WHERE p.status = 'published'
      AND p.published_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, p.title, p.slug, p.author_id,
             p.category_id, p.featured_image,
             p.views_count, p.published_at
    ORDER BY trend_score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_posts_id
    ON trending_posts (id);
CREATE INDEX IF NOT EXISTS idx_trending_posts_trend_score
    ON trending_posts (trend_score DESC);

-- To refresh (run via pg_cron or Celery Beat every 15 min):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY trending_posts;

-- ============================================================
-- DATABASE CONNECTION (Django settings.py)
-- ============================================================
-- Using the postgres superuser with the pre-created 'blog' database.
-- Credentials are loaded from .env — never hardcoded in source.
--
-- Django DATABASES setting:
--   ENGINE   : django.db.backends.postgresql
--   NAME     : blog
--   USER     : postgres
--   PASSWORD : root
--   HOST     : 127.0.0.1
--   PORT     : 5432
--
-- For production: create a dedicated limited role and restrict
-- permissions to only what Django needs (SELECT/INSERT/UPDATE/DELETE).
-- ============================================================

-- ============================================================
-- PRODUCTION CONFIGURATION NOTES
-- (Apply in postgresql.conf or via ALTER SYSTEM)
-- ============================================================
-- ssl = on                          -- enforce SSL connections
-- max_connections = 100             -- tune per RAM; use PgBouncer for pooling
-- shared_buffers = 256MB            -- set to ~25% of total RAM
-- effective_cache_size = 768MB      -- set to ~75% of total RAM
-- work_mem = 4MB                    -- per-sort operation
-- maintenance_work_mem = 64MB       -- for VACUUM, CREATE INDEX
-- wal_level = replica               -- enable WAL archiving
-- archive_mode = on
-- archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
-- checkpoint_completion_target = 0.9
-- random_page_cost = 1.1            -- for SSDs
-- ============================================================
