# PX-Reader API Documentation

> Base URL: Deployed on Cloudflare Workers (syumai/workers Go runtime)
> All responses use `Content-Type: application/json; charset=utf-8` unless otherwise noted.
> CORS is enabled for all origins with credentials support.

---

## Authentication

Authentication is handled via Pixiv OAuth2 PKCE flow. Tokens are stored as HttpOnly cookies on the client browser.

### Cookies

| Cookie Name | Description | MaxAge | HttpOnly | Secure |
|---|---|---|---|---|
| `pixiv_access_token` | Pixiv API access token | 3600s (1 hour) | Yes | Yes |
| `pixiv_refresh_token` | Pixiv refresh token | 34560000s (400 days) | Yes | Yes |
| `pixiv_cv` | Temporary PKCE code_verifier (login flow only) | 300s (5 min) | Yes | Yes |

### Auth Flow

1. Frontend calls `GET /login` to get the Pixiv login URL
2. User completes login on Pixiv, gets redirected with an authorization `code`
3. Frontend calls `GET /callback?code=xxx` (or `POST /callback` with form body `code=xxx`)
4. Backend exchanges code for tokens, stores them in cookies
5. All subsequent API calls automatically include cookies for authentication

---

## Endpoints

### GET /

Health check / root endpoint.

- **Auth Required**: No
- **Response**: Plain text greeting

---

### GET /login

Initiate Pixiv OAuth2 PKCE login flow. Generates a code_verifier, stores it in a short-lived cookie, and returns the Pixiv login URL.

- **Auth Required**: No
- **Response (200)**:
```json
{
  "login_url": "https://app-api.pixiv.net/web/v1/login?code_challenge=xxx&code_challenge_method=S256&client=pixiv-android"
}
```
- **Error (500)**:
```json
{
  "error": "failed to generate PKCE: <details>"
}
```

---

### GET /callback

Handle OAuth callback with authorization code. Accepts code via query parameter or form body.

- **Auth Required**: No (but requires `pixiv_cv` cookie from prior `/login` call)
- **Query Parameters**:
  - `code` (string, required) — The authorization code from Pixiv
- **Form Body** (alternative):
  - `code` (string, required) — The authorization code from Pixiv
- **Response (200)**:
```json
{
  "message": "login successful"
}
```
- **Errors**:
  - `400` — Missing code parameter, or missing/expired login session cookie
  - `502` — Token exchange failed or no access_token in response

---

### GET /refresh

Refresh the access token using the stored refresh_token cookie.

- **Auth Required**: Yes (requires `pixiv_refresh_token` cookie)
- **Response (200)**:
```json
{
  "message": "token refreshed"
}
```
- **Errors**:
  - `401` — No refresh_token found
  - `502` — Token refresh failed

---

### GET /novel/recommended

Get personalized novel recommendations for the current account. Proxies to Pixiv `GET /v1/novel/recommended`.

- **Auth Required**: Yes (requires `pixiv_access_token` cookie)
- **Query Parameters**:
  - `filter` (string, optional, default: `"for_ios"`)
  - `include_privacy_policy` (string, optional)
  - `include_ranking_novels` (string, optional) — Set to `"true"` to include ranking novels
- **Response (200)**:
```json
{
  "novels": [
    {
      "id": 12345678,
      "title": "Novel Title",
      "caption": "Novel description/caption",
      "restrict": 0,
      "x_restrict": 0,
      "is_original": false,
      "image_urls": {
        "square_medium": "https://i.pximg.net/c/128x128/...",
        "medium": "https://i.pximg.net/c/176x352/...",
        "large": "https://i.pximg.net/c/240x480_80/..."
      },
      "create_date": "2023-01-01T00:00:00+09:00",
      "tags": [
        {
          "name": "tag_name",
          "translated_name": null,
          "added_by_uploaded_user": true
        }
      ],
      "page_count": 1,
      "text_length": 10000,
      "user": {
        "id": 12345,
        "name": "Author Name",
        "account": "author_account",
        "profile_image_urls": {
          "medium": "https://i.pximg.net/user-profile/img/..."
        },
        "is_followed": false
      },
      "series": {
        "id": 12345,
        "title": "Series Title"
      },
      "is_bookmarked": false,
      "total_bookmarks": 500,
      "total_view": 3000,
      "visible": true,
      "total_comments": 10,
      "is_muted": false,
      "is_mypixiv_only": false,
      "is_x_restricted": false,
      "novel_ai_type": 0
    }
  ],
  "ranking_novels": [],
  "privacy_policy": {
    "version": "1.0",
    "message": "...",
    "url": "..."
  },
  "next_url": "https://app-api.pixiv.net/v1/novel/recommended?offset=30"
}
```
- **Errors**:
  - `401` — Not logged in
  - `502` — Pixiv API request failed

---

### GET /novel/follow

Get novel updates from followed users. Proxies to Pixiv `GET /v1/novel/follow`.

- **Auth Required**: Yes (requires `pixiv_access_token` cookie)
- **Query Parameters**:
  - `restrict` (string, optional, default: `"public"`) — `"public"` or `"private"`
- **Response (200)**:
```json
{
  "novels": [
    {
      "id": 12345678,
      "title": "Novel Title",
      "caption": "...",
      "restrict": 0,
      "x_restrict": 0,
      "is_original": false,
      "image_urls": {
        "square_medium": "https://i.pximg.net/...",
        "medium": "https://i.pximg.net/...",
        "large": "https://i.pximg.net/..."
      },
      "create_date": "2023-01-01T00:00:00+09:00",
      "tags": [],
      "page_count": 1,
      "text_length": 5000,
      "user": {},
      "series": {},
      "is_bookmarked": false,
      "total_bookmarks": 100,
      "total_view": 500,
      "visible": true,
      "total_comments": 5,
      "is_muted": false,
      "is_mypixiv_only": false,
      "is_x_restricted": false,
      "novel_ai_type": 0
    }
  ],
  "next_url": "https://app-api.pixiv.net/v1/novel/follow?restrict=public&offset=30"
}
```
- **Errors**:
  - `401` — Not logged in
  - `502` — Pixiv API request failed

---

### GET /novel/text

Get novel text content by ID. Proxies to Pixiv `GET /webview/v2/novel`.

- **Auth Required**: Yes (requires `pixiv_access_token` cookie)
- **Query Parameters**:
  - `id` (string, **required**) — The novel ID
- **Response (200)**:
```json
{
  "novel_marker": {},
  "novel_text": "Full text content of the novel...",
  "series_prev": {},
  "series_next": {}
}
```
- **Errors**:
  - `400` — Missing `id` parameter
  - `401` — Not logged in
  - `502` — Pixiv API request failed

---

### GET /novel/user

Get a specific user's novel list. Proxies to Pixiv `GET /v1/user/novels`.

- **Auth Required**: Yes (requires `pixiv_access_token` cookie)
- **Query Parameters**:
  - `user_id` (string, **required**) — The Pixiv user ID
- **Response (200)**:
```json
{
  "user": {
    "id": 12345,
    "name": "Author Name",
    "account": "author_account",
    "profile_image_urls": {
      "medium": "https://i.pximg.net/user-profile/img/..."
    },
    "is_followed": true,
    "is_access_blocking_user": false
  },
  "novels": [
    {
      "id": 12345678,
      "title": "Novel Title",
      "caption": "...",
      "restrict": 0,
      "x_restrict": 1,
      "is_original": false,
      "image_urls": {
        "square_medium": "https://i.pximg.net/...",
        "medium": "https://i.pximg.net/...",
        "large": "https://i.pximg.net/..."
      },
      "create_date": "2023-01-01T00:00:00+09:00",
      "tags": [],
      "page_count": 1,
      "text_length": 10000,
      "user": {},
      "series": {},
      "is_bookmarked": false,
      "total_bookmarks": 500,
      "total_view": 3000,
      "visible": true,
      "total_comments": 10,
      "is_muted": false,
      "is_mypixiv_only": false,
      "is_x_restricted": false,
      "novel_ai_type": 0
    }
  ],
  "next_url": "https://app-api.pixiv.net/v1/user/novels?user_id=12345&offset=30"
}
```
- **Errors**:
  - `400` — Missing `user_id` parameter
  - `401` — Not logged in
  - `502` — Pixiv API request failed

---

### GET /novel/proxy

Image proxy for Pixiv images. Solves the `i.pximg.net` hotlink protection issue by adding the required `Referer` header.

- **Auth Required**: No
- **Query Parameters**:
  - `url` (string, **required**) — The full Pixiv image URL (must contain `pximg.net`)
- **Response**: Binary image data with original `Content-Type` header
  - `Cache-Control: public, max-age=86400` (cached for 24 hours)
- **Usage Example**:
  ```
  GET /novel/proxy?url=https://i.pximg.net/c/240x480_80/novel-cover-master/img/2023/01/01/00/00/00/ci12345678_xxx_master1200.jpg
  ```
- **Errors**:
  - `400` — Missing `url` parameter, or URL is not a Pixiv domain
  - `502` — Image proxy request failed

---

## Pagination

All list endpoints (`/novel/recommended`, `/novel/follow`, `/novel/user`) return a `next_url` field in the response when more results are available. To load the next page:

1. Read the `next_url` value from the response
2. Call the same endpoint but pass the `next_url` as a query parameter, or extract the `offset` parameter from `next_url` and pass it directly

Example: If response contains `"next_url": "https://app-api.pixiv.net/v1/novel/recommended?offset=30"`, the next page can be fetched via:
```
GET /novel/recommended?offset=30
```

---

## Error Response Format

All error responses follow one of two formats:

**JSON error** (from novel/auth endpoints):
```json
{
  "error": "Human-readable error message"
}
```

**Plain text error** (from callback endpoint):
```
missing code parameter
```

---

## CORS

All endpoints support CORS with the following configuration:
- `Access-Control-Allow-Origin`: Reflects the request `Origin` header (falls back to `*` if no Origin)
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization`
- `Access-Control-Allow-Credentials`: `true`
- `Access-Control-Max-Age`: `86400`
- Preflight `OPTIONS` requests return `204 No Content`

---

## Frontend Integration Notes

### Image Loading
Pixiv image URLs (`i.pximg.net`) cannot be loaded directly from the browser due to hotlink protection. Use the proxy endpoint:
```
<img src="/novel/proxy?url={encodeURIComponent(imageUrl)}" />
```

### Waterfall/Infinite Scroll
1. Call `GET /novel/recommended` for initial load
2. Store the `next_url` from the response
3. When user scrolls near the bottom, call `GET /novel/recommended?offset=<extracted_offset>` for next page
4. Append new novels to the existing list
5. Repeat until `next_url` is empty/null

### Login Check
Before calling authenticated endpoints, check if the user is logged in by calling `GET /novel/recommended`. If it returns `401`, redirect to login flow.
