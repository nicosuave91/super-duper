-- =========================
-- superapp – seed.sql (DEV ONLY)
-- =========================

-- Demo user (matches code expectations)
INSERT INTO users (auth0_sub, email)
VALUES ('auth0|demo', 'demo@example.com')
ON CONFLICT (auth0_sub) DO NOTHING;

-- Demo site
INSERT INTO sites (name, slug)
VALUES ('Demo Site', 'demo-site')
ON CONFLICT (slug) DO NOTHING;

-- Membership (demo user owns demo site)
INSERT INTO site_memberships (site_id, user_id, role)
SELECT s.id, u.id, 'owner'
FROM sites s
JOIN users u ON u.auth0_sub = 'auth0|demo'
WHERE s.slug = 'demo-site'
ON CONFLICT DO NOTHING;

-- Subscription (inactive by default)
INSERT INTO subscriptions (site_id, status)
SELECT id, 'inactive'
FROM sites
WHERE slug = 'demo-site'
ON CONFLICT (site_id) DO NOTHING;

