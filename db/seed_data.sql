-- ============================================================
-- GreenTalk — Seed Data
-- Purpose : Populate the database with realistic sample data
--           for local development and testing.
-- Usage   : psql -U greentalk_app -d blog -f seed_data.sql
-- NOTE    : Run AFTER schema.sql. Safe to re-run (uses ON CONFLICT).
-- ============================================================
-- Password hash below is Django PBKDF2-SHA256 for "Test@1234"
-- Generated with: from django.contrib.auth.hashers import make_password
--                 make_password("Test@1234")
-- In production, NEVER seed real passwords this way.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. USERS  (3 roles: user, blog_admin, super_admin)
-- ============================================================
INSERT INTO users (
    id, password, last_login, is_superuser,
    username, first_name, last_name, email,
    is_staff, is_active, date_joined,
    role, is_verified, phone, bio, avatar_url,
    created_at, updated_at
) VALUES
-- Super Admin
(1, 'pbkdf2_sha256$600000$greentalk$abc123superadminhashplaceholder==',
 NOW(), TRUE,
 'superadmin', 'Arjun', 'Sharma', 'arjun.sharma@greentalk.io',
 TRUE, TRUE, NOW() - INTERVAL '180 days',
 'super_admin', TRUE, '+91-9876543210',
 'Platform founder and super administrator.',
 'https://ui-avatars.com/api/?name=Arjun+Sharma',
 NOW() - INTERVAL '180 days', NOW()),

-- Blog Admin
(2, 'pbkdf2_sha256$600000$greentalk$def456blogadminhashplaceholder==',
 NOW() - INTERVAL '1 day', FALSE,
 'blogadmin', 'Priya', 'Nair', 'priya.nair@greentalk.io',
 TRUE, TRUE, NOW() - INTERVAL '120 days',
 'blog_admin', TRUE, '+91-9845001234',
 'Content moderator and plant enthusiast. Loves home gardening.',
 'https://ui-avatars.com/api/?name=Priya+Nair',
 NOW() - INTERVAL '120 days', NOW()),

-- Regular Users
(3, 'pbkdf2_sha256$600000$greentalk$ghi789user1hashplaceholder==',
 NOW() - INTERVAL '2 days', FALSE,
 'rahul_green', 'Rahul', 'Verma', 'rahul.verma@example.com',
 FALSE, TRUE, NOW() - INTERVAL '90 days',
 'user', TRUE, '+91-9012345678',
 'Home gardener from Pune. Growing tomatoes and herbs on my balcony.',
 'https://ui-avatars.com/api/?name=Rahul+Verma',
 NOW() - INTERVAL '90 days', NOW()),

(4, 'pbkdf2_sha256$600000$greentalk$jkl012user2hashplaceholder==',
 NOW() - INTERVAL '3 days', FALSE,
 'sunita_plants', 'Sunita', 'Iyer', 'sunita.iyer@example.com',
 FALSE, TRUE, NOW() - INTERVAL '60 days',
 'user', TRUE, '+91-9123456789',
 'Passionate about reforestation. Planted 500+ trees on open land.',
 'https://ui-avatars.com/api/?name=Sunita+Iyer',
 NOW() - INTERVAL '60 days', NOW()),

(5, 'pbkdf2_sha256$600000$greentalk$mno345user3hashplaceholder==',
 NOW() - INTERVAL '5 days', FALSE,
 'deepak_farm', 'Deepak', 'Patil', 'deepak.patil@example.com',
 FALSE, TRUE, NOW() - INTERVAL '45 days',
 'user', FALSE, NULL,
 'Farmer experimenting with native plant restoration.',
 NULL,
 NOW() - INTERVAL '45 days', NOW()),

(6, 'pbkdf2_sha256$600000$greentalk$pqr678user4hashplaceholder==',
 NULL, FALSE,
 'meena_garden', 'Meena', 'Krishnan', 'meena.krishnan@example.com',
 FALSE, TRUE, NOW() - INTERVAL '10 days',
 'user', FALSE, '+91-8812345670',
 'New member. Just starting my terrace garden!',
 'https://ui-avatars.com/api/?name=Meena+Krishnan',
 NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Reset sequence to avoid PK conflicts on subsequent inserts
SELECT setval('users_id_seq', 10, true);

-- ============================================================
-- 2. USER PROFILES
-- ============================================================
INSERT INTO user_profiles (user_id, city, state, country, postal_code, garden_type, preferences) VALUES
(1, 'Bengaluru',  'Karnataka',     'India', '560001', 'both',      '{"newsletter": true,  "notifications": true}'),
(2, 'Kochi',      'Kerala',        'India', '682001', 'home',      '{"newsletter": true,  "notifications": true}'),
(3, 'Pune',       'Maharashtra',   'India', '411001', 'home',      '{"newsletter": true,  "notifications": true}'),
(4, 'Hyderabad',  'Telangana',     'India', '500001', 'open_land', '{"newsletter": false, "notifications": true}'),
(5, 'Nagpur',     'Maharashtra',   'India', '440001', 'open_land', '{"newsletter": false, "notifications": false}'),
(6, 'Chennai',    'Tamil Nadu',    'India', '600001', 'home',      '{"newsletter": true,  "notifications": true}')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 3. TAGS
-- ============================================================
INSERT INTO tags (id, name, slug) VALUES
( 1, 'Beginners',          'beginners'),
( 2, 'Organic',            'organic'),
( 3, 'Watering Tips',      'watering-tips'),
( 4, 'Native Plants',      'native-plants'),
( 5, 'Composting',         'composting'),
( 6, 'Reforestation',      'reforestation'),
( 7, 'Soil Health',        'soil-health'),
( 8, 'Monsoon Planting',   'monsoon-planting'),
( 9, 'Terrace Garden',     'terrace-garden'),
(10, 'Drought Resistant',  'drought-resistant'),
(11, 'Seeds',              'seeds'),
(12, 'Pests & Disease',    'pests-and-disease')
ON CONFLICT (id) DO NOTHING;
SELECT setval('tags_id_seq', 20, true);

-- ============================================================
-- 4. POSTS
-- ============================================================
-- Category IDs from seed in schema.sql:
--   1 = Home Gardening, 2 = Open Land Plantation,
--   3 = Land Restoration, 4 = Plant Care Guides
-- ============================================================
INSERT INTO posts (
    id, title, slug, content, excerpt,
    author_id, category_id, status,
    featured_image, views_count,
    seo_meta_title, seo_meta_description,
    created_at, updated_at, published_at
) VALUES
(1,
 'Getting Started with Balcony Gardening',
 'getting-started-balcony-gardening',
 '<h2>Introduction</h2><p>Balcony gardening is one of the most rewarding ways to bring greenery into urban living. Whether you have a tiny 4x6 balcony or a spacious terrace, you can grow herbs, vegetables, and flowering plants.</p><h2>Choosing the Right Containers</h2><p>Use lightweight containers with drainage holes. Fabric grow bags are excellent for vegetables like tomatoes and peppers.</p><h2>Soil Mix</h2><p>A good mix of 40% cocopeat, 40% compost, and 20% perlite works well for most balcony plants.</p><h2>Watering</h2><p>Water deeply but infrequently. Check soil moisture by inserting your finger 2 inches deep — water only when it feels dry.</p>',
 'A complete beginner''s guide to starting your balcony or terrace garden in India.',
 3, 1, 'published',
 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
 142, 'Balcony Gardening Guide for Beginners | GreenTalk',
 'Learn how to start a thriving balcony garden with tips on containers, soil, watering, and plant selection.',
 NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days', NOW() - INTERVAL '59 days'),

(2,
 'Planting Native Trees on Barren Land: A Step-by-Step Guide',
 'planting-native-trees-barren-land',
 '<h2>Why Native Trees?</h2><p>Native trees are adapted to local climate and soil conditions, requiring less water and maintenance once established. They also support local biodiversity and wildlife.</p><h2>Site Assessment</h2><p>Before planting, assess soil pH (aim for 6.0–7.5), drainage, and sunlight. Barren land often has compacted soil — loosen it to at least 30cm depth.</p><h2>Species Selection for Central India</h2><p>Consider Neem (Azadirachta indica), Peepal (Ficus religiosa), and Arjun (Terminalia arjuna) for their resilience and ecological value.</p><h2>Monsoon Planting Window</h2><p>June to August is the ideal window. Plant saplings at least 3m apart and mulch heavily to retain moisture.</p>',
 'A practical guide to selecting and planting native trees on open or barren land in India.',
 4, 2, 'published',
 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800',
 298, 'How to Plant Native Trees on Barren Land | GreenTalk',
 'Step-by-step guide to restoring barren land with native Indian trees. Learn species selection, soil prep, and monsoon planting.',
 NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days'),

(3,
 'Understanding Soil pH and Why It Matters',
 'understanding-soil-ph',
 '<h2>What is Soil pH?</h2><p>Soil pH is a measure of how acidic or alkaline your soil is, on a scale from 0 (very acidic) to 14 (very alkaline). Most plants prefer a pH of 6.0–7.0.</p><h2>Testing Your Soil</h2><p>Use a simple pH testing kit (available at garden stores for under ₹200) or send a sample to your local agricultural university for a detailed analysis.</p><h2>Correcting Soil pH</h2><p>To raise pH (make more alkaline): add agricultural lime. To lower pH (make more acidic): add sulfur or use organic matter like pine needles.</p>',
 'Learn what soil pH is, how to test it at home, and how to correct it for healthier plants.',
 2, 4, 'published',
 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=800',
 87,  'Soil pH Guide for Plant Care | GreenTalk',
 'Everything you need to know about soil pH — from testing methods to correcting acidity and alkalinity for optimal plant growth.',
 NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days'),

(4,
 'Ecological Land Restoration: Community Approach',
 'ecological-land-restoration-community',
 '<h2>Community-Led Restoration</h2><p>The most successful land restoration projects are community-driven. When local people take ownership, saplings survive at 3x the rate of externally-managed projects.</p><h2>Miyawaki Method</h2><p>The Miyawaki afforestation technique involves planting multiple native species densely together, mimicking natural forest structure. Results in 10x faster growth than conventional plantation.</p><h2>Water Harvesting</h2><p>Before planting, create simple check dams and contour bunds to harvest rainwater. This is the single highest-impact intervention for arid land restoration.</p>',
 'How communities can come together to restore degraded and barren land using proven ecological methods.',
 4, 3, 'published',
 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
 211, 'Community Ecological Land Restoration | GreenTalk',
 'Discover how community-led efforts using the Miyawaki method and water harvesting can restore barren land effectively.',
 NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),

(5,
 'Draft: My Composting Journey',
 'draft-my-composting-journey',
 '<p>I started composting 6 months ago and the results have been incredible. This post is a work in progress...</p>',
 'Personal journey into home composting.',
 3, 1, 'draft',
 NULL, 0, NULL, NULL,
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NULL),

(6,
 'Monsoon Planting Tips for Urban Gardeners',
 'monsoon-planting-tips-urban',
 '<h2>Making the Most of Monsoon</h2><p>The monsoon season (June–September) in India is the best time to establish new plants. Rainfall reduces irrigation need and cooler temperatures reduce transplant shock.</p><h2>Top 5 Plants to Plant in Monsoon</h2><ul><li>Hibiscus</li><li>Curry Leaf (Murraya koenigii)</li><li>Banana</li><li>Turmeric</li><li>Moringa (Drumstick)</li></ul><h2>Waterlogging Warning</h2><p>Ensure containers and garden beds have excellent drainage. Roots rotting from waterlogging is the #1 monsoon gardening mistake.</p>',
 'Top tips for urban gardeners to make the most of the monsoon season for planting.',
 3, 1, 'pending',
 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800',
 0, NULL, NULL,
 NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL)
ON CONFLICT (id) DO NOTHING;
SELECT setval('posts_id_seq', 20, true);

-- ============================================================
-- 5. POST TAGS
-- ============================================================
INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 9), (1, 3),          -- Balcony post: beginners, terrace-garden, watering-tips
(2, 4), (2, 6), (2, 8),          -- Native trees: native-plants, reforestation, monsoon
(3, 7), (3, 2),                  -- Soil pH: soil-health, organic
(4, 6), (4, 4), (4, 7),          -- Restoration: reforestation, native-plants, soil-health
(5, 5), (5, 2),                  -- Composting draft: composting, organic
(6, 8), (6, 9), (6, 1)           -- Monsoon tips: monsoon, terrace-garden, beginners
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. COMMENTS
-- ============================================================
INSERT INTO comments (id, post_id, user_id, parent_comment_id, content, status, created_at) VALUES
(1,  1, 4,    NULL, 'This is exactly what I needed! I''ve been struggling with my balcony tomatoes dying. The cocopeat mix tip is gold.', 'visible', NOW() - INTERVAL '58 days'),
(2,  1, 2,    NULL, 'Great article Rahul! I would also add — use self-watering planters if you travel frequently.', 'visible', NOW() - INTERVAL '57 days'),
(3,  1, 3,    1,    'Thank you Sunita! Yes, self-watering planters are a game changer. I use them for my herbs now.', 'visible', NOW() - INTERVAL '57 days'),
(4,  1, 5,    NULL, 'What about wind on high-rise balconies? My plants keep getting damaged.', 'visible', NOW() - INTERVAL '55 days'),
(5,  1, 3,    4,    'Good question Deepak. Use bamboo windbreaks or place plants close to the wall. Hardy plants like Portulaca handle wind well.', 'visible', NOW() - INTERVAL '54 days'),
(6,  2, 3,    NULL, 'The Miyawaki section is so useful. Do you know if this works in Maharashtra too?', 'visible', NOW() - INTERVAL '42 days'),
(7,  2, 4,    6,    'Absolutely! Miyawaki works anywhere. In Maharashtra, include Karanj and Behada in your mix.', 'visible', NOW() - INTERVAL '41 days'),
(8,  2, 5,    NULL, 'I tried this last monsoon on 2 acres. Lost 30% of saplings to waterlogging. The check dam advice is critical.', 'visible', NOW() - INTERVAL '40 days'),
(9,  3, 6,    NULL, 'I tested my soil and it was 5.2 — very acidic! Added lime and my roses are finally thriving.', 'visible', NOW() - INTERVAL '27 days'),
(10, 3, 3,    NULL, 'Flagged this comment as spam.', 'flagged', NOW() - INTERVAL '25 days'),
(11, 4, 5,    NULL, 'Community projects are so much more effective. Our village planted 800 trees last year — 95% survival rate!', 'visible', NOW() - INTERVAL '17 days'),
(12, 4, 6,    NULL, 'Can you share more about the water harvesting structures? What materials are needed?', 'visible', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;
SELECT setval('comments_id_seq', 20, true);

-- ============================================================
-- 7. LIKES
-- ============================================================
INSERT INTO likes (user_id, post_id, comment_id, created_at) VALUES
-- Post likes
(1, 1, NULL, NOW() - INTERVAL '58 days'),
(2, 1, NULL, NOW() - INTERVAL '57 days'),
(4, 1, NULL, NOW() - INTERVAL '56 days'),
(5, 1, NULL, NOW() - INTERVAL '55 days'),
(6, 1, NULL, NOW() - INTERVAL '10 days'),
(1, 2, NULL, NOW() - INTERVAL '44 days'),
(2, 2, NULL, NOW() - INTERVAL '43 days'),
(3, 2, NULL, NOW() - INTERVAL '43 days'),
(5, 2, NULL, NOW() - INTERVAL '42 days'),
(6, 2, NULL, NOW() - INTERVAL '10 days'),
(1, 3, NULL, NOW() - INTERVAL '28 days'),
(3, 3, NULL, NOW() - INTERVAL '27 days'),
(6, 3, NULL, NOW() - INTERVAL '10 days'),
(1, 4, NULL, NOW() - INTERVAL '19 days'),
(2, 4, NULL, NOW() - INTERVAL '18 days'),
(3, 4, NULL, NOW() - INTERVAL '17 days'),
(5, 4, NULL, NOW() - INTERVAL '16 days'),
-- Comment likes
(1, NULL, 1,  NOW() - INTERVAL '57 days'),
(3, NULL, 1,  NOW() - INTERVAL '56 days'),
(2, NULL, 7,  NOW() - INTERVAL '40 days'),
(3, NULL, 11, NOW() - INTERVAL '16 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. PLANTS (reference catalog)
-- ============================================================
INSERT INTO plants (id, name, scientific_name, category, climate_zone, soil_type, water_needs, sunlight_needs, growth_rate, native_status, description) VALUES
(1,  'Neem',          'Azadirachta indica',      'tree',   'tropical',   'loamy, sandy',    'low',    'full_sun',      'fast',     'native',     'Hardy native tree known for medicinal properties and pest-repelling ability.'),
(2,  'Peepal',        'Ficus religiosa',          'tree',   'tropical',   'loamy',           'medium', 'full_sun',      'fast',     'native',     'Sacred fig tree. Excellent for biodiversity — supports over 50 species.'),
(3,  'Arjun Tree',    'Terminalia arjuna',        'tree',   'tropical',   'riverine, loamy', 'high',   'full_sun',      'moderate', 'native',     'Medicinal tree ideal for riverbank and lowland restoration.'),
(4,  'Moringa',       'Moringa oleifera',         'tree',   'tropical',   'sandy, loamy',    'low',    'full_sun',      'fast',     'native',     'Drumstick tree. Highly nutritious, drought-resistant, and fast-growing.'),
(5,  'Tulsi',         'Ocimum tenuiflorum',       'herb',   'tropical',   'loamy',           'medium', 'full_sun',      'fast',     'native',     'Sacred basil. Easy to grow in pots. Medicinal and aromatic.'),
(6,  'Curry Leaf',    'Murraya koenigii',         'shrub',  'tropical',   'well-drained',    'medium', 'full_sun',      'moderate', 'native',     'Essential Indian kitchen plant. Thrives in pots and garden beds.'),
(7,  'Bamboo',        'Bambusa vulgaris',         'grass',  'tropical',   'loamy, clay',     'medium', 'full_sun',      'fast',     'native',     'Fast-growing grass ideal for windbreaks, erosion control, and construction.'),
(8,  'Hibiscus',      'Hibiscus rosa-sinensis',   'shrub',  'tropical',   'loamy',           'medium', 'full_sun',      'moderate', 'non-native', 'Popular ornamental shrub with large colorful flowers. Easy balcony plant.'),
(9,  'Aloe Vera',     'Aloe barbadensis miller',  'herb',   'arid',       'sandy, well-drained','low', 'partial_shade', 'slow',     'non-native', 'Succulent herb ideal for beginners. Medicinal gel for burns and skin care.'),
(10, 'Turmeric',      'Curcuma longa',            'herb',   'tropical',   'loamy, rich',     'high',   'partial_shade', 'moderate', 'native',     'Rhizome crop ideal for shaded balconies. Spice and medicinal uses.')
ON CONFLICT (id) DO NOTHING;
SELECT setval('plants_id_seq', 20, true);

-- ============================================================
-- 9. EXCHANGE LISTINGS
-- ============================================================
INSERT INTO exchange_listings (
    id, user_id, plant_id, plant_name, quantity, condition,
    listing_type, swap_for_text, location, status, images, description
) VALUES
(1,  3, 5,    NULL,         3,  'seedling', 'free', NULL,
    'Pune, Maharashtra',
    'available', '[]',
    'Giving away 3 healthy Tulsi seedlings from my balcony. Self-collect from Koregaon Park.'),

(2,  3, 6,    NULL,         2,  'sapling',  'swap', 'Aloe vera or Moringa seedlings',
    'Pune, Maharashtra',
    'available', '[]',
    'Have 2 curry leaf saplings (1 year old, ~30cm). Looking to swap for aloe vera or moringa.'),

(3,  5, 1,    NULL,         5,  'sapling',  'free', NULL,
    'Nagpur, Maharashtra',
    'available', '[]',
    '5 neem saplings ready for monsoon planting. Great for open land. You pick up or arrange courier.'),

(4,  4, NULL, 'Wild Jasmine', 4, 'mature',  'swap', 'Any native flowering shrub',
    'Hyderabad, Telangana',
    'available', '[]',
    'Wild jasmine cuttings from my garden, unknown variety but smells wonderful. Swap for any native flowering plant.'),

(5,  6, 9,    NULL,         2,  'mature',   'free', NULL,
    'Chennai, Tamil Nadu',
    'completed', '[]',
    'Two mature aloe vera plants in pots. Already given away.')
ON CONFLICT (id) DO NOTHING;
SELECT setval('exchange_listings_id_seq', 10, true);

-- ============================================================
-- 10. PURCHASE LISTINGS
-- ============================================================
INSERT INTO purchase_listings (
    id, seller_id, plant_id, title, description,
    price, currency, stock_quantity, status
) VALUES
(1,  3, 10, 'Organic Turmeric Rhizomes — 500g',
    'Fresh organic turmeric rhizomes harvested from my balcony garden. Ready to plant or use in cooking. Certified chemical-free.',
    150.00, 'INR', 20, 'active'),

(2,  4, 4,  'Moringa Seedlings — Set of 3',
    'Healthy 6-inch moringa (drumstick) seedlings in biodegradable pots. Ready to transplant. 15 days growth guarantee.',
    120.00, 'INR', 15, 'active'),

(3,  5, 1,  'Neem Saplings — 1 Year Old',
    'Field-grown neem saplings, approx 2 feet tall. Ideal for farm borders, open land, or large gardens. Minimum order: 5.',
    80.00,  'INR', 50, 'active'),

(4,  3, 5,  'Tulsi Seedlings — Set of 5',
    'Mixed variety Tulsi (Krishna and Rama Tulsi) seedlings in small pots. Freshly potted. Good for home altar or kitchen garden.',
    60.00,  'INR', 0,  'sold_out'),

(5,  6, 9,  'Aloe Vera — Large Potted Plant',
    'Mature aloe vera plant in a 8-inch pot with quality potting mix. Great for home use — skin care, burns. 3+ years old.',
    200.00, 'INR', 3,  'active')
ON CONFLICT (id) DO NOTHING;
SELECT setval('purchase_listings_id_seq', 10, true);

-- ============================================================
-- 11. ORDERS
-- ============================================================
INSERT INTO orders (id, buyer_id, listing_id, quantity, total_price, status, notes) VALUES
(1,  6, 1, 1, 150.00, 'completed', 'Received in good condition. Will plant this monsoon!'),
(2,  3, 2, 2, 240.00, 'confirmed', NULL),
(3,  4, 5, 1, 200.00, 'pending',   'Please pack carefully to avoid root damage.'),
(4,  6, 3, 5, 400.00, 'shipped',   NULL)
ON CONFLICT (id) DO NOTHING;
SELECT setval('orders_id_seq', 10, true);

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (user_id, type, message, is_read, related_object_type, related_object_id) VALUES
(3, 'comment_reply',  'Sunita Iyer replied to your comment on "Getting Started with Balcony Gardening".', FALSE, 'comment', 3),
(3, 'post_liked',     'Your post "Getting Started with Balcony Gardening" received 5 likes!',             TRUE,  'post',    1),
(3, 'post_approved',  'Your post "Monsoon Planting Tips for Urban Gardeners" is under review.',           FALSE, 'post',    6),
(4, 'comment_reply',  'Sunita Iyer replied to your comment on "Planting Native Trees on Barren Land".',  FALSE, 'comment', 7),
(4, 'order_update',   'Your order for "Organic Turmeric Rhizomes" has been confirmed.',                   TRUE,  'order',   2),
(5, 'listing_interest','Someone is interested in your exchange listing for Neem Saplings.',               FALSE, 'exchange_listing', 3),
(6, 'post_liked',     'Your comment on "Understanding Soil pH" received a like.',                         FALSE, 'comment', 9),
(1, 'system_message', 'Welcome to GreenTalk! The platform is now live.',                                  TRUE,  NULL,      NULL),
(2, 'post_approved',  'You approved the post "Ecological Land Restoration: Community Approach".',        TRUE,  'post',    4);

-- ============================================================
-- 13. AUDIT LOGS (moderation trail for super admin)
-- ============================================================
INSERT INTO audit_logs (actor_user_id, action, target_table, target_id, metadata, ip_address) VALUES
(2, 'post.approve',    'posts',    4, '{"reason": "Quality content, meets guidelines"}',        '192.168.1.10'),
(2, 'post.approve',    'posts',    3, '{"reason": "Accurate information verified"}',            '192.168.1.10'),
(2, 'post.approve',    'posts',    2, '{"reason": "Excellent native tree guide"}',              '192.168.1.10'),
(2, 'post.approve',    'posts',    1, '{"reason": "Good beginner content"}',                    '192.168.1.10'),
(2, 'comment.hide',    'comments', 10, '{"reason": "Spam content detected"}',                  '192.168.1.10'),
(1, 'user.role_change','users',    2, '{"old_role": "user", "new_role": "blog_admin"}',         '192.168.1.1'),
(1, 'site.settings',   'users',    1, '{"setting": "auto_publish", "value": "false"}',          '192.168.1.1');

-- ============================================================
-- 14. EMAIL VERIFICATION TOKENS (sample unverified user)
-- ============================================================
INSERT INTO email_verification_tokens (user_id, token, expires_at, used) VALUES
(5, 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5678901234abcd',
    NOW() + INTERVAL '24 hours', FALSE),
(6, 'xyz987wvu654tsr321qpo098nml765kji432hgf109edc876baz543yxw210vut9',
    NOW() + INTERVAL '24 hours', FALSE)
ON CONFLICT (token) DO NOTHING;

-- ============================================================
-- 15. REFRESH MATERIALIZED VIEW after seed
-- ============================================================
REFRESH MATERIALIZED VIEW trending_posts;

COMMIT;

-- ============================================================
-- Verification queries (run after seeding to confirm)
-- ============================================================
-- SELECT role, COUNT(*) FROM users GROUP BY role;
-- SELECT status, COUNT(*) FROM posts GROUP BY status;
-- SELECT * FROM trending_posts LIMIT 5;
-- SELECT p.title, COUNT(l.id) AS likes FROM posts p LEFT JOIN likes l ON l.post_id = p.id GROUP BY p.id;
