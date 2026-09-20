# LANDZO Staff User Management

## Scope

Step 3 adds staff user management APIs for authenticated Admin UI workflows. These endpoints manage internal LANDZO staff only.

Out of scope for this step:

- Public customer accounts
- Agent accounts
- Property owner accounts
- User self-registration
- Password reset email delivery
- Property, enquiry, blog, CMS, analytics, or notification workflows

## Authorization

Every staff user-management endpoint requires:

```text
authenticated staff session + user.manage
```

Authentication uses the Step 2 bearer access token. Authorization uses server-resolved RBAC permissions.

## Endpoints

```text
GET   /api/v1/admin/users
GET   /api/v1/admin/users/:userId
POST  /api/v1/admin/users
PATCH /api/v1/admin/users/:userId
PATCH /api/v1/admin/users/:userId/role
PATCH /api/v1/admin/users/:userId/status
PATCH /api/v1/admin/users/:userId/reset-password
```

## Staff User Creation

`POST /api/v1/admin/users` creates an active staff account with a hashed initial password.

Allowed creation fields:

```text
fullName
email
phone
role
initialPassword
```

Emails are normalized to lowercase. Duplicate normalized emails return:

```text
409 EMAIL_ALREADY_IN_USE
```

Invalid staff roles are rejected. Only an Owner can create an Owner account.

## Listing And Detail

`GET /api/v1/admin/users` supports pagination and optional filters:

```text
page
limit
search
role
status
```

Search covers staff name, email, and phone.

`GET /api/v1/admin/users/:userId` returns one safe staff DTO. Missing users return:

```text
404 USER_NOT_FOUND
```

## Profile Updates

`PATCH /api/v1/admin/users/:userId` is intentionally allowlisted.

Allowed update fields:

```text
fullName
email
phone
```

Mass assignment fields such as `role`, `status`, `passwordHash`, `authVersion`, lockout fields, and private authentication fields are rejected by validation.

## Role Updates

`PATCH /api/v1/admin/users/:userId/role` updates a staff user's fixed system role.

Changing a role:

- Validates the role against the approved system roles.
- Requires Owner actor privileges when assigning Owner.
- Requires Owner actor privileges when demoting an Owner.
- Prevents removing the final active Owner.
- Increments `authVersion`.
- Revokes active refresh sessions for the target user.

## Status Updates

`PATCH /api/v1/admin/users/:userId/status` supports:

```text
active
disabled
```

Disabling a staff user:

- Blocks self-disable with `SELF_DISABLE_BLOCKED`.
- Requires Owner actor privileges when disabling an Owner.
- Prevents disabling the final active Owner.
- Increments `authVersion`.
- Revokes active refresh sessions for the target user.

Disabled staff users cannot log in or refresh sessions.

## Password Reset

`PATCH /api/v1/admin/users/:userId/reset-password` lets authorized staff set a new password for another staff account.

Password reset:

- Stores only a bcrypt-compatible password hash.
- Never returns plaintext passwords.
- Requires another Owner when the target is an Owner.
- Increments `authVersion`.
- Revokes active refresh sessions for the target user.

Password reset email delivery remains deferred until a verified mail provider and reset-token workflow are selected.

## Response Safety

Staff user responses use explicit serializers. They do not expose:

```text
passwordHash
failedLoginAttempts
loginLockedUntil
lastPasswordChangeAt
authVersion
refresh token hashes
```

Refresh tokens remain HttpOnly cookies under the Step 2 authentication contract and are not returned in JSON responses.
