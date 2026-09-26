-- ============================================================
-- GreenTalk — Schema Constraint & Integrity Test Script
-- ============================================================
-- Usage : psql -U postgres -d blog -f test_schema.sql
-- Run   : AFTER schema.sql AND seed_data.sql
-- Output: Each test prints PASS or FAIL with a description.
-- ============================================================
-- Technique: Use DO $$ blocks with ASSERT statements.
--   On assertion failure, PostgreSQL raises an exception with
--   the message — visible in psql output.
--   On success the block completes silently; we print PASS.
-- ============================================================

\echo '========================================================'
\echo 'GreenTalk Schema Tests'
\echo '========================================================'

-- ============================================================
-- HELPER: print a pass message (failures raise exceptions)
-- ============================================================

-- ============================================================
-- TEST 1: Duplicate like on same post is rejected
-- ============================================================
\echo ''
\echo 'TEST 1: Duplicate post like rejected (UNIQUE constraint)'
DO $$
BEGIN
    -- user_id=1 already liked post_id=1 in seed data
    BEGIN
        INSERT INTO likes (user_id, post_id) VALUES (1, 1);
        RAISE EXCEPTION 'TEST 1 FAIL: Duplicate like was NOT rejected';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 1 PASS: Duplicate post like correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 2: Duplicate like on same comment is rejected
-- ============================================================
\echo 'TEST 2: Duplicate comment like rejected (UNIQUE constraint)'
DO $$
BEGIN
    -- user_id=1 already liked comment_id=1 in seed data
    BEGIN
        INSERT INTO likes (user_id, comment_id) VALUES (1, 1);
        RAISE EXCEPTION 'TEST 2 FAIL: Duplicate comment like was NOT rejected';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 2 PASS: Duplicate comment like correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 3: Like with BOTH post_id and comment_id is rejected
-- ============================================================
\echo 'TEST 3: Like targeting both post and comment rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO likes (user_id, post_id, comment_id) VALUES (6, 1, 1);
        RAISE EXCEPTION 'TEST 3 FAIL: Like with dual target was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 3 PASS: Like with dual target correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 4: Like with NEITHER post_id nor comment_id is rejected
-- ============================================================
\echo 'TEST 4: Like with no target rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO likes (user_id, post_id, comment_id) VALUES (6, NULL, NULL);
        RAISE EXCEPTION 'TEST 4 FAIL: Like with no target was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 4 PASS: Like with no target correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 5: Negative price on purchase listing rejected
-- ============================================================
\echo 'TEST 5: Negative price rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO purchase_listings (seller_id, title, price, currency, stock_quantity)
        VALUES (3, 'Bad listing', -10.00, 'INR', 5);
        RAISE EXCEPTION 'TEST 5 FAIL: Negative price was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 5 PASS: Negative price correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 6: Zero quantity on exchange listing rejected
-- ============================================================
\echo 'TEST 6: Zero quantity on exchange listing rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO exchange_listings (user_id, plant_id, quantity, listing_type)
        VALUES (3, 5, 0, 'free');
        RAISE EXCEPTION 'TEST 6 FAIL: Zero quantity was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 6 PASS: Zero quantity correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 7: Swap listing without swap_for_text is rejected
-- ============================================================
\echo 'TEST 7: Swap listing without swap_for_text rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO exchange_listings (user_id, plant_id, quantity, listing_type, swap_for_text)
        VALUES (3, 5, 2, 'swap', NULL);
        RAISE EXCEPTION 'TEST 7 FAIL: Swap listing without swap_for_text was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 7 PASS: Swap listing without swap_for_text correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 8: Exchange listing with no plant_id AND no plant_name rejected
-- ============================================================
\echo 'TEST 8: Exchange listing with no plant identifier rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO exchange_listings (user_id, plant_id, plant_name, quantity, listing_type)
        VALUES (3, NULL, NULL, 2, 'free');
        RAISE EXCEPTION 'TEST 8 FAIL: Listing with no plant identifier was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 8 PASS: Listing with no plant identifier correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 9: Duplicate username rejected
-- ============================================================
\echo 'TEST 9: Duplicate username rejected (UNIQUE constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO users (password, username, email, role)
        VALUES ('hash', 'rahul_green', 'unique@test.com', 'user');
        RAISE EXCEPTION 'TEST 9 FAIL: Duplicate username was NOT rejected';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 9 PASS: Duplicate username correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 10: Duplicate email rejected
-- ============================================================
\echo 'TEST 10: Duplicate email rejected (UNIQUE constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO users (password, username, email, role)
        VALUES ('hash', 'uniqueuser', 'rahul.verma@example.com', 'user');
        RAISE EXCEPTION 'TEST 10 FAIL: Duplicate email was NOT rejected';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 10 PASS: Duplicate email correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 11: Duplicate post slug rejected
-- ============================================================
\echo 'TEST 11: Duplicate post slug rejected (UNIQUE constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO posts (title, slug, content, author_id, status)
        VALUES ('Another Post', 'getting-started-balcony-gardening', 'content', 3, 'draft');
        RAISE EXCEPTION 'TEST 11 FAIL: Duplicate slug was NOT rejected';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 11 PASS: Duplicate post slug correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 12: Invalid slug format rejected
-- ============================================================
\echo 'TEST 12: Invalid slug format (uppercase/spaces) rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO posts (title, slug, content, author_id, status)
        VALUES ('Test Post', 'Invalid Slug With Spaces', 'content', 3, 'draft');
        RAISE EXCEPTION 'TEST 12 FAIL: Invalid slug format was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 12 PASS: Invalid slug format correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 13: Empty comment content rejected
-- ============================================================
\echo 'TEST 13: Empty/whitespace comment content rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO comments (post_id, user_id, content, status)
        VALUES (1, 3, '   ', 'visible');
        RAISE EXCEPTION 'TEST 13 FAIL: Empty comment content was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 13 PASS: Empty comment content correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 14: CASCADE — deleting a post removes its comments
-- ============================================================
\echo 'TEST 14: Cascade delete — post deletion removes comments'
DO $$
DECLARE
    v_post_id   BIGINT;
    v_comment_id BIGINT;
    v_count     INT;
BEGIN
    -- Create a temporary post
    INSERT INTO posts (title, slug, content, author_id, status)
    VALUES ('Temp Post for Cascade Test', 'temp-post-cascade-test-' || floor(random()*100000)::text, 'temp', 3, 'draft')
    RETURNING id INTO v_post_id;

    -- Add a comment to it
    INSERT INTO comments (post_id, user_id, content)
    VALUES (v_post_id, 3, 'Temporary comment')
    RETURNING id INTO v_comment_id;

    -- Delete the post
    DELETE FROM posts WHERE id = v_post_id;

    -- Check that the comment was also deleted
    SELECT COUNT(*) INTO v_count FROM comments WHERE id = v_comment_id;

    IF v_count = 0 THEN
        RAISE NOTICE 'TEST 14 PASS: Comment correctly cascade-deleted with post';
    ELSE
        RAISE EXCEPTION 'TEST 14 FAIL: Comment was NOT deleted when post was deleted';
    END IF;
END $$;

-- ============================================================
-- TEST 15: CASCADE — deleting a comment removes its replies
-- ============================================================
\echo 'TEST 15: Cascade delete — parent comment deletion removes replies'
DO $$
DECLARE
    v_parent_id BIGINT;
    v_reply_id  BIGINT;
    v_count     INT;
BEGIN
    -- Insert a parent comment on existing post 1
    INSERT INTO comments (post_id, user_id, content)
    VALUES (1, 3, 'Parent comment for cascade test')
    RETURNING id INTO v_parent_id;

    -- Insert a reply
    INSERT INTO comments (post_id, user_id, parent_comment_id, content)
    VALUES (1, 4, v_parent_id, 'Reply to parent')
    RETURNING id INTO v_reply_id;

    -- Delete parent
    DELETE FROM comments WHERE id = v_parent_id;

    -- Reply should also be gone
    SELECT COUNT(*) INTO v_count FROM comments WHERE id = v_reply_id;

    IF v_count = 0 THEN
        RAISE NOTICE 'TEST 15 PASS: Reply correctly cascade-deleted with parent comment';
    ELSE
        RAISE EXCEPTION 'TEST 15 FAIL: Reply was NOT deleted when parent comment was deleted';
    END IF;
END $$;

-- ============================================================
-- TEST 16: SET NULL — deleting a user preserves their posts
-- ============================================================
\echo 'TEST 16: SET NULL — user deletion sets post author_id to NULL (not deleted)'
DO $$
DECLARE
    v_user_id   BIGINT;
    v_post_id   BIGINT;
    v_author_id BIGINT;
BEGIN
    -- Create temp user
    INSERT INTO users (password, username, email, role)
    VALUES ('hash', 'temp_delete_user_' || floor(random()*100000)::text,
            'temp_del_' || floor(random()*100000)::text || '@test.com', 'user')
    RETURNING id INTO v_user_id;

    -- Create temp post by that user
    INSERT INTO posts (title, slug, content, author_id, status)
    VALUES ('Orphan Post Test', 'orphan-post-test-' || floor(random()*100000)::text,
            'content', v_user_id, 'draft')
    RETURNING id INTO v_post_id;

    -- Delete user
    DELETE FROM users WHERE id = v_user_id;

    -- Check post still exists with author_id = NULL
    SELECT author_id INTO v_author_id FROM posts WHERE id = v_post_id;

    IF v_author_id IS NULL THEN
        RAISE NOTICE 'TEST 16 PASS: Post preserved with author_id = NULL after user deletion';
        -- Clean up orphan post
        DELETE FROM posts WHERE id = v_post_id;
    ELSE
        RAISE EXCEPTION 'TEST 16 FAIL: Post author_id was not set to NULL after user deletion';
    END IF;
END $$;

-- ============================================================
-- TEST 17: Full-text search returns expected posts
-- ============================================================
\echo 'TEST 17: Full-text search finds seeded posts by keyword'
DO $$
DECLARE
    v_count INT;
BEGIN
    -- Search for 'balcony' — should match post 1
    SELECT COUNT(*) INTO v_count
    FROM posts
    WHERE search_vector @@ plainto_tsquery('english', 'balcony')
      AND status = 'published';

    IF v_count >= 1 THEN
        RAISE NOTICE 'TEST 17 PASS: Full-text search for "balcony" returned % result(s)', v_count;
    ELSE
        RAISE EXCEPTION 'TEST 17 FAIL: Full-text search for "balcony" returned 0 results';
    END IF;
END $$;

-- ============================================================
-- TEST 18: Full-text search for content keyword
-- ============================================================
\echo 'TEST 18: Full-text search finds posts by content keyword "neem"'
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM posts
    WHERE search_vector @@ plainto_tsquery('english', 'neem')
      AND status = 'published';

    IF v_count >= 1 THEN
        RAISE NOTICE 'TEST 18 PASS: Full-text search for "neem" returned % result(s)', v_count;
    ELSE
        RAISE EXCEPTION 'TEST 18 FAIL: Full-text search for "neem" returned 0 results';
    END IF;
END $$;

-- ============================================================
-- TEST 19: Trending posts materialized view populated
-- ============================================================
\echo 'TEST 19: trending_posts materialized view contains published posts'
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM trending_posts;

    IF v_count >= 1 THEN
        RAISE NOTICE 'TEST 19 PASS: trending_posts view has % row(s)', v_count;
    ELSE
        RAISE EXCEPTION 'TEST 19 FAIL: trending_posts view is empty — check seed data and view definition';
    END IF;
END $$;

-- ============================================================
-- TEST 20: Order quantity must be > 0
-- ============================================================
\echo 'TEST 20: Order quantity of 0 rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO orders (buyer_id, listing_id, quantity, total_price, status)
        VALUES (6, 1, 0, 0.00, 'pending');
        RAISE EXCEPTION 'TEST 20 FAIL: Zero order quantity was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 20 PASS: Zero order quantity correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 21: Negative total_price on order rejected
-- ============================================================
\echo 'TEST 21: Negative total_price on order rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO orders (buyer_id, listing_id, quantity, total_price, status)
        VALUES (6, 1, 1, -50.00, 'pending');
        RAISE EXCEPTION 'TEST 21 FAIL: Negative total_price was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 21 PASS: Negative total_price correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 22: Seed data integrity checks
-- ============================================================
\echo 'TEST 22: Seed data integrity — all 3 roles present'
DO $$
DECLARE
    v_super   INT;
    v_admin   INT;
    v_user    INT;
BEGIN
    SELECT COUNT(*) INTO v_super FROM users WHERE role = 'super_admin';
    SELECT COUNT(*) INTO v_admin FROM users WHERE role = 'blog_admin';
    SELECT COUNT(*) INTO v_user  FROM users WHERE role = 'user';

    IF v_super >= 1 AND v_admin >= 1 AND v_user >= 1 THEN
        RAISE NOTICE 'TEST 22 PASS: All 3 roles present (super_admin: %, blog_admin: %, user: %)',
                     v_super, v_admin, v_user;
    ELSE
        RAISE EXCEPTION 'TEST 22 FAIL: Missing roles (super_admin: %, blog_admin: %, user: %)',
                        v_super, v_admin, v_user;
    END IF;
END $$;

-- ============================================================
-- TEST 23: Seed data — published posts exist
-- ============================================================
\echo 'TEST 23: Seed data — published posts exist'
DO $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM posts WHERE status = 'published';
    IF v_count >= 4 THEN
        RAISE NOTICE 'TEST 23 PASS: % published posts found', v_count;
    ELSE
        RAISE EXCEPTION 'TEST 23 FAIL: Expected at least 4 published posts, found %', v_count;
    END IF;
END $$;

-- ============================================================
-- TEST 24: User profile one-to-one uniqueness enforced
-- ============================================================
\echo 'TEST 24: Duplicate user_profile for same user rejected (UNIQUE constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO user_profiles (user_id, city) VALUES (1, 'Mumbai');
        RAISE EXCEPTION 'TEST 24 FAIL: Duplicate user_profile was NOT rejected';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 24 PASS: Duplicate user_profile correctly rejected';
    END;
END $$;

-- ============================================================
-- TEST 25: Invalid category slug format rejected
-- ============================================================
\echo 'TEST 25: Invalid category slug (uppercase) rejected (CHECK constraint)'
DO $$
BEGIN
    BEGIN
        INSERT INTO categories (name, slug) VALUES ('Bad Category', 'Bad_Slug');
        RAISE EXCEPTION 'TEST 25 FAIL: Invalid category slug was NOT rejected';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'TEST 25 PASS: Invalid category slug correctly rejected';
    END;
END $$;

\echo ''
\echo '========================================================'
\echo 'All tests completed. Review PASS/FAIL notices above.'
\echo '========================================================'
