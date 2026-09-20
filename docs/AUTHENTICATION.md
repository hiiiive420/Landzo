# LANDZO Staff Authentication

## YOGO Reference Rule

Where LANDZO and YOGO require equivalent infrastructure, inspect the actual YOGO implementation first and reuse the proven approach when secure and suitable.

## YOGO Reference Audit

YOGO reference project inspected:

```text
D:\Hiiiive\YOGO_Travels\server
```

Relevant files inspected:

```text
controllers/authController.js
middleware/auth.js
models/User.js
routes/authRoutes.js
utils/token.js
package.json
```

Findings:

- YOGO uses ESM JavaScript.
- YOGO uses bcrypt-compatible password hashing through `bcryptjs` with cost factor 12.
- YOGO stores password hashes with `select: false` and compares candidate passwords through a model method.
- YOGO uses JWT bearer access tokens for admin authentication.
- YOGO returns a small user identity payload instead of the raw user model.

Patterns reused in LANDZO:

- ESM JavaScript style.
- bcrypt-compatible password hashing direction using `bcryptjs` with cost factor 12.
- Bearer access tokens.
- Safe user DTO/serializer boundary.
- Authentication middleware pattern that attaches a minimal user context.

Patterns intentionally not reused:

- YOGO fallback development secret/demo admin behavior is not reused.
- YOGO single-token session model is not reused because LANDZO requires logout/revocation and refresh-session handling.
- YOGO does not implement HttpOnly refresh cookies, refresh rotation, persistent refresh-session hashes, disabled-account refresh blocking, password-change invalidation, or failed-login lockout, so LANDZO implements those directly.
- YOGO uses `express-validator`; LANDZO remains on the locked Zod validation direction.

No YOGO secrets or environment values were copied.

## Staff Auth Scope

Step 2 implements staff authentication only for internal LANDZO users. Public customer accounts are not part of LANDZO V1 authentication.

Implemented endpoints:

```text
POST /api/v1/admin/auth/login
POST /api/v1/admin/auth/refresh
POST /api/v1/admin/auth/logout
GET /api/v1/admin/auth/me
PATCH /api/v1/admin/auth/change-password
```

No full User Management CRUD or granular RBAC permission management is implemented in Step 2. Step 3 adds those staff-only APIs; see `docs/RBAC.md` and `docs/USER_MANAGEMENT.md`.

## Staff Roles

The user model preserves the approved role concepts as constants:

```text
owner
admin
enquiry_support
content_manager
```

Roles are returned as staff identity data. Step 3 resolves permissions server-side from system role documents and includes current permissions in `/api/v1/admin/auth/me`.

## Password Policy

V1 staff passwords must be between 12 and 128 characters.

No arbitrary composition rules are enforced in Step 2. Passwords are never silently truncated.

Passwords are hashed with bcrypt-compatible `bcryptjs` at cost factor 12. Plaintext passwords are never stored.

## Failed Login Protection

Failed login protection is server-side:

```text
5 failed attempts -> account temporarily locked for 15 minutes
```

The lock is temporary and does not permanently disable the account. Successful login clears failed-login counters.

## Token And Session Strategy

Access token:

- JWT signed with `JWT_ACCESS_SECRET`.
- Short-lived using `JWT_ACCESS_EXPIRES_IN`.
- Contains minimal claims: staff user id (`sub`), role, and `authVersion`.
- Validates issuer and audience.

Refresh credential:

- Opaque random token.
- Sent only as an HttpOnly cookie named `landzo_refresh_token`.
- Not returned in JSON response bodies.
- Never logged.

Refresh persistence:

- MongoDB stores only an HMAC-SHA256 hash of the refresh token using `JWT_REFRESH_SECRET`.
- Raw refresh tokens are not stored in MongoDB.
- Refresh sessions include `expiresAt`, `revokedAt`, and replacement metadata.
- `expiresAt` has a MongoDB TTL index for natural cleanup.

Rotation:

- Refresh calls rotate the refresh token.
- The previous refresh session is revoked and linked to the replacement hash.
- Reusing an old refresh credential fails.

Revocation:

- Logout revokes the current persistent refresh session and clears the refresh cookie.
- Change password revokes all active refresh sessions for that staff user.

Cookie security:

- `httpOnly: true`
- `secure: true` in production
- `sameSite: lax`
- path: `/api/v1/admin/auth`
- max age follows `JWT_REFRESH_EXPIRES_IN`

Password-change invalidation:

- The user record has an `authVersion` counter.
- Access tokens include `authVersion`.
- Changing password increments `authVersion`, invalidating previously issued access tokens.
- Existing refresh sessions are revoked.

## Password Reset Status

Password reset email delivery:

```text
DEFERRED - no verified mail provider/reference required for safe delivery
```

YOGO's inspected auth implementation did not provide a reusable secure password-reset email architecture suitable for LANDZO Step 2. LANDZO does not return reset tokens through API responses and does not add a fake mail provider.

## Environment Variables

Step 2 adds these authentication environment variables:

```text
JWT_ACCESS_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN
JWT_ISSUER
JWT_AUDIENCE
```

Secrets must be explicit and at least 32 characters. Do not commit real secret values.
