# GreenTalk API Reference

Base URL: `http://localhost:8000/api/` (local) · `https://yourdomain.com/api/` (production)

Interactive docs: `/api/docs/` (Swagger UI) · `/api/docs/redoc/` (ReDoc)

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```
Access token is returned in the login response body.
Refresh token is stored automatically in an `HttpOnly` cookie — never handled by client JS.

---

## Error Response Format

All errors follow this shape:
```json
{
  "error": true,
  "code": "permission_denied",
  "message": "You do not have permission to perform this action.",
  "details": { ... }
}
```

---

## 1. Auth Endpoints (`/api/auth/`)

---

### POST `/api/auth/register/`
Register a new user account.

**Auth required:** No | **Throttle:** 5/hour

**Request:**
```json
{
  "email": "user@example.com",
  "username": "greenthumb",
  "first_name": "Rahul",
  "last_name": "Verma",
  "password": "StrongPass@1234",
  "password_confirm": "StrongPass@1234"
}
```

**Response 201:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user_id": 7,
  "email": "user@example.com"
}
```

**Errors:** `400` — duplicate email/username, weak password, password mismatch

---

### POST `/api/auth/login/`
Login with email + password.

**Auth required:** No | **Throttle:** 5/minute

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass@1234"
}
```

**Response 200:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 7,
    "email": "user@example.com",
    "username": "greenthumb",
    "role": "user",
    "is_verified": true,
    "full_name": "Rahul Verma"
  }
}
```
Sets `refresh_token` HttpOnly cookie automatically.

**Errors:** `401` — wrong credentials · `403` — account deactivated

---

### POST `/api/auth/logout/`
Logout and blacklist the refresh token.

**Auth required:** Yes

**Response 200:**
```json
{ "message": "Logged out successfully." }
```

---

### POST `/api/auth/token/refresh/`
Get a new access token using the HttpOnly refresh cookie.

**Auth required:** No (cookie required)

**Response 200:**
```json
{ "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Errors:** `401` — missing/expired/blacklisted refresh token

---

### POST `/api/auth/verify-email/`
Verify email address using the token from the verification email.

**Auth required:** No

**Request:**
```json
{ "token": "abc123def456..." }
```

**Response 200:**
```json
{ "message": "Email verified successfully." }
```

**Errors:** `400` — invalid/expired/used token

---

### POST `/api/auth/forgot-password/`
Send password reset email.

**Auth required:** No | **Throttle:** 3/hour

**Request:**
```json
{ "email": "user@example.com" }
```

**Response 200:**
```json
{ "message": "If an account with that email exists, a reset link has been sent." }
```
Always returns 200 to prevent user enumeration.

---

### POST `/api/auth/reset-password/`
Reset password using the token from the reset email.

**Auth required:** No | **Throttle:** 3/hour

**Request:**
```json
{
  "token": "xyz789...",
  "new_password": "NewStrongPass@5678",
  "new_password_confirm": "NewStrongPass@5678"
}
```

**Response 200:**
```json
{ "message": "Password reset successfully." }
```

---

### GET `/api/auth/profile/`
Get authenticated user's full profile.

**Auth required:** Yes

**Response 200:**
```json
{
  "id": 7,
  "email": "user@example.com",
  "username": "greenthumb",
  "first_name": "Rahul",
  "last_name": "Verma",
  "full_name": "Rahul Verma",
  "role": "user",
  "is_verified": true,
  "phone": "+91-9876543210",
  "bio": "Home gardener from Pune.",
  "avatar_url": "http://localhost:8000/media/avatars/uuid.jpg",
  "profile": {
    "city": "Pune",
    "state": "Maharashtra",
    "country": "India",
    "garden_type": "home",
    "preferences": {"notifications": true}
  },
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-09-01T12:00:00Z"
}
```

---

### PATCH `/api/auth/profile/`
Update own profile. Partial update supported.

**Auth required:** Yes

**Request:**
```json
{
  "first_name": "Rahul",
  "bio": "Updated bio text.",
  "profile": {
    "city": "Mumbai",
    "garden_type": "home"
  }
}
```

**Response 200:** Updated full profile (same shape as GET)

---

### PATCH `/api/auth/change-password/`

**Auth required:** Yes

**Request:**
```json
{
  "old_password": "OldPass@1234",
  "new_password": "NewPass@5678",
  "new_password_confirm": "NewPass@5678"
}
```

**Response 200:**
```json
{ "message": "Password changed successfully." }
```

---

## 2. Blog Endpoints

---

### GET `/api/posts/`
List published posts. Supports pagination, filtering, ordering.

**Auth required:** No

**Query params:**
- `?page=1` `?page_size=12`
- `?search=balcony` — searches title and excerpt
- `?ordering=-published_at` or `?ordering=views_count`
- `?category=<slug>` (filter by category)
- `?status=pending` — admins only (filter by status)

**Response 200:**
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/posts/?page=2",
  "previous": null,
  "total_pages": 4,
  "current_page": 1,
  "results": [
    {
      "id": 1,
      "title": "Getting Started with Balcony Gardening",
      "slug": "getting-started-balcony-gardening",
      "excerpt": "A complete beginner's guide...",
      "author": {
        "id": 3,
        "username": "rahul_green",
        "full_name": "Rahul Verma",
        "avatar_url": null,
        "role": "user",
        "created_at": "2026-06-15T10:00:00Z"
      },
      "category": {"id": 1, "name": "Home Gardening", "slug": "home-gardening"},
      "tags": [{"id": 1, "name": "Beginners", "slug": "beginners"}],
      "status": "published",
      "featured_image_url": "http://localhost:8000/media/posts/uuid.jpg",
      "views_count": 142,
      "like_count": 5,
      "comment_count": 3,
      "seo_meta_title": "Balcony Gardening Guide for Beginners | GreenTalk",
      "seo_meta_description": "Learn how to start a thriving balcony garden...",
      "created_at": "2026-07-15T10:00:00Z",
      "published_at": "2026-07-16T08:00:00Z"
    }
  ]
}
```

---

### POST `/api/posts/`
Create a new blog post.

**Auth required:** Yes (verified users only)

**Status workflow (enforced server-side):**
- `role=user` → saved as `status=pending`
- `role=blog_admin` / `role=super_admin` → saved as `status=published`
- Client-sent `status` field is ignored.

**Request:**
```json
{
  "title": "My Monsoon Garden",
  "content": "<h2>Introduction</h2><p>The monsoon season...</p>",
  "excerpt": "Tips for monsoon gardening.",
  "category": 1,
  "tag_ids": [1, 8],
  "seo_meta_title": "Monsoon Garden Tips | GreenTalk",
  "seo_meta_description": "Make the most of monsoon for your garden."
}
```

**Response 201:**
```json
{
  "id": 7,
  "title": "My Monsoon Garden",
  "slug": "my-monsoon-garden",
  "status": "pending",
  ...
}
```

---

### GET `/api/posts/<slug>/`
Get post detail. Increments `views_count` for published posts.

**Auth required:** No

---

### PATCH `/api/posts/<slug>/`
Update post. Owner or blog_admin+.

---

### DELETE `/api/posts/<slug>/`
Delete post. Owner or blog_admin+.

---

### POST `/api/posts/<slug>/approve/`
Approve and publish a pending post.

**Auth required:** Yes (blog_admin or super_admin)

**Response 200:**
```json
{ "message": "Post approved and published.", "status": "published" }
```

---

### POST `/api/posts/<slug>/reject/`
Reject a pending post.

**Auth required:** Yes (blog_admin or super_admin)

**Request:**
```json
{ "reason": "Off-topic content." }
```

**Response 200:**
```json
{ "message": "Post rejected.", "status": "rejected" }
```

---

### POST `/api/posts/<slug>/unpublish/`
Unpublish a post back to draft status.

**Auth required:** Yes (blog_admin or super_admin)

---

### GET `/api/categories/`
List all active categories (hierarchical, includes children).

**Auth required:** No

---

### POST `/api/categories/`
Create a category. **blog_admin+ only.**

**Request:**
```json
{ "name": "Herb Gardening", "description": "Growing herbs at home." }
```

---

### GET `/api/tags/`
List all tags. Supports `?search=native`.

---

### POST `/api/tags/`
Create a tag. **blog_admin+ only.**

---

### GET `/api/comments/?post=<id>`
List top-level comments for a post (with nested replies).

**Auth required:** No

**Response 200:**
```json
{
  "results": [
    {
      "id": 1,
      "post": 1,
      "author": {"id": 4, "username": "sunita_plants", ...},
      "parent": null,
      "content": "This is exactly what I needed!",
      "status": "visible",
      "like_count": 2,
      "replies": [
        {
          "id": 3,
          "author": {"id": 3, "username": "rahul_green", ...},
          "parent": 1,
          "content": "Glad it helped!"
        }
      ],
      "created_at": "2026-07-17T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/comments/`
Create a comment or reply.

**Auth required:** Yes (verified users only)

**Request:**
```json
{
  "post": 1,
  "parent": null,
  "content": "Great article!"
}
```

---

### DELETE `/api/comments/<id>/`
Delete a comment. Owner or blog_admin+.

---

### POST `/api/comments/<id>/moderate/`
Change comment visibility status. **blog_admin+ only.**

**Request:**
```json
{ "status": "hidden" }
```

---

### POST `/api/likes/`
Toggle like/unlike on a post or comment.

**Auth required:** Yes

**Request (like a post):**
```json
{ "post": 1 }
```

**Request (like a comment):**
```json
{ "comment": 3 }
```

**Response 201 (liked):**
```json
{ "liked": true, "count": 6 }
```

**Response 200 (unliked):**
```json
{ "liked": false, "count": 5 }
```

---

### GET `/api/search/?q=<query>`
Full-text search on published posts using PostgreSQL tsvector.

**Auth required:** No

**Query params:**
- `?q=balcony gardening` — required search term
- `?category=home-gardening` — optional category filter
- `?page=1` `?page_size=12`

**Response 200:** Same shape as post list, ordered by relevance rank.

---

## 3. Marketplace Endpoints

---

### GET `/api/plants/`
List plant catalog. Supports filtering and search.

**Auth required:** No

**Filter params:** `?climate_zone=tropical` `?water_needs=low` `?soil_type=sandy` `?category=tree` `?native_status=native`

---

### GET `/api/exchange-listings/`
List plant exchange listings.

**Auth required:** No (shows `available` only for anonymous; all statuses for admins)

**Filter params:** `?location=Pune` `?plant=5` `?listing_type=swap` `?status=available`

---

### POST `/api/exchange-listings/`
Create an exchange listing.

**Auth required:** Yes (verified users only)

**Request:**
```json
{
  "plant": 5,
  "plant_name": "",
  "quantity": 3,
  "condition": "seedling",
  "listing_type": "free",
  "location": "Pune, Maharashtra",
  "description": "3 healthy Tulsi seedlings."
}
```

**Response 201:**
```json
{
  "id": 6,
  "user": {"id": 3, "username": "rahul_green", ...},
  "plant": 5,
  "plant_display": {"name": "Tulsi", ...},
  "quantity": 3,
  "listing_type": "free",
  "status": "available",
  ...
}
```

---

### PATCH `/api/exchange-listings/<id>/update-status/`
Update listing status. **Owner only.**

**Request:**
```json
{ "status": "reserved" }
```

Allowed transitions: `available → reserved`, `reserved → available/completed`

---

### GET `/api/purchase-listings/`
List marketplace plant listings.

**Auth required:** No

**Filter params:** `?min_price=50` `?max_price=200` `?plant=4` `?status=active`

---

### POST `/api/purchase-listings/`
Create a purchase listing.

**Auth required:** Yes (verified users only)

**Request:**
```json
{
  "plant": 10,
  "title": "Organic Turmeric Rhizomes — 500g",
  "description": "Fresh organic turmeric from my balcony.",
  "price": "150.00",
  "currency": "INR",
  "stock_quantity": 20
}
```

---

### GET `/api/orders/`
List own orders (as buyer or seller).

**Auth required:** Yes

---

### POST `/api/orders/`
Place an order (record buyer interest — no payment).

**Auth required:** Yes

**Request:**
```json
{
  "listing": 1,
  "quantity": 2,
  "notes": "Please pack carefully."
}
```

**Response 201:**
```json
{
  "id": 5,
  "buyer": {"id": 6, "username": "meena_garden", ...},
  "listing": 1,
  "listing_detail": {"title": "Organic Turmeric Rhizomes — 500g", "price": "150.00", ...},
  "quantity": 2,
  "total_price": "300.00",
  "status": "pending",
  "notes": "Please pack carefully.",
  "created_at": "2026-09-26T14:00:00Z"
}
```

Note: `total_price` is calculated server-side (`listing.price × quantity`).

---

### PATCH `/api/orders/<id>/update-status/`
Seller or buyer updates order status.

**Auth required:** Yes

**Seller allowed transitions:** `pending → confirmed`, `confirmed → shipped`, `shipped → completed`, any → `cancelled`
**Buyer allowed transitions:** `pending → cancelled`

**Request:**
```json
{ "status": "confirmed" }
```

---

## 4. Notifications (`/api/notifications/`)

---

### GET `/api/notifications/`
List own notifications, newest first.

**Auth required:** Yes

**Query params:** `?unread=1` — filter unread only

**Response 200:**
```json
{
  "count": 3,
  "results": [
    {
      "id": 1,
      "type": "comment_reply",
      "message": "Sunita Iyer replied to your comment.",
      "is_read": false,
      "related_object_type": "comment",
      "related_object_id": 3,
      "created_at": "2026-09-25T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/notifications/mark-read/`
Mark specific or all notifications as read.

**Auth required:** Yes

**Request (specific):**
```json
{ "ids": [1, 2, 3] }
```

**Request (all):**
```json
{}
```

**Response 200:**
```json
{ "marked_read": 3 }
```

---

## 5. Admin Endpoints

All admin endpoints require `role=super_admin`.

---

### GET `/api/admin/users/`
List all users. Supports `?search=email` and ordering.

**Auth required:** Yes (super_admin only)

---

### POST `/api/admin/users/`
Create a user account.

**Auth required:** Yes (super_admin only)

---

### GET `/api/admin/users/<id>/`
Get user details.

**Auth required:** Yes (super_admin only)

---

### PATCH `/api/admin/users/<id>/`
Update user role, activate/deactivate.

**Auth required:** Yes (super_admin only)

**Request:**
```json
{
  "role": "blog_admin",
  "is_active": true
}
```

---

### GET `/api/admin/audit-logs/`
List audit log entries. Read-only, paginated (50/page).

**Auth required:** Yes (super_admin only)

**Query params:** `?action=post.approve` `?table=posts` `?search=email`

**Response 200:**
```json
{
  "count": 120,
  "results": [
    {
      "id": 1,
      "actor": {"id": 2, "username": "blogadmin", ...},
      "action": "post.approve",
      "target_table": "posts",
      "target_id": 4,
      "metadata": {"reason": "Quality content"},
      "ip_address": "192.168.1.10",
      "created_at": "2026-09-01T09:00:00Z"
    }
  ]
}
```

---

## 6. SEO Endpoints

### GET `/sitemap.xml`
XML sitemap of all published posts and categories (for search engine crawlers).

### GET `/robots.txt`
Robots exclusion rules — disallows `/admin/` and `/api/` from crawlers.

---

## HTTP Status Code Reference

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete success) |
| 400 | Bad Request — validation error |
| 401 | Unauthorized — missing/invalid token |
| 403 | Forbidden — authenticated but insufficient role |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 429 | Too Many Requests — rate limit hit |
| 500 | Internal Server Error |

---

## Pagination

All list endpoints return:
```json
{
  "count": 100,
  "next": "https://domain.com/api/posts/?page=2",
  "previous": null,
  "total_pages": 9,
  "current_page": 1,
  "results": [...]
}
```

Default page size: 12. Max page size: 100. Override with `?page_size=25`.
