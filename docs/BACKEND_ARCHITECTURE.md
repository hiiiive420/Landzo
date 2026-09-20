# LANDZO Backend Architecture

## Repository State At Step 0

This repository currently contains planning/specification files only:

- `Backedn Modules.txt`
- `Landzo admin panel Structure.txt`
- `Landzo_Backend_Initial_Specification_v2.pdf`

No application source code, package manifest, lockfile, environment template, test setup, lint setup, or deployment configuration exists in the workspace at the time of this audit.

## Locked Technical Baseline

The repository does not currently contain executable application code, but Step 0.1 locks the technical direction for implementation:

- Language: JavaScript
- Module system: ES Modules / ESM
- Package manager: pnpm
- Node runtime: Node.js 24.x LTS
- Backend framework: Express.js 5.x
- Database ODM: Mongoose 9.x
- Request/environment validation direction: Zod
- Testing direction: Vitest + Supertest
- Linting: ESLint
- Formatting: Prettier
- API base namespace: `/api/v1`

LANDZO is a JavaScript MERN project. Do not introduce TypeScript, `.ts`, `.tsx`, or `tsconfig.json` unless explicitly requested in a future step.

Step 0.1 does not create `package.json`, install dependencies, or scaffold an executable backend.

## Recommended Backend Boundaries

When backend implementation begins, LANDZO should use clear boundaries similar to:

```text
Route
  -> Controller
  -> Service
  -> Model / Repository
```

Supporting concerns should be kept separate:

- Validation
- Permissions
- Serialization / DTOs
- Error handling
- Security middleware
- Scheduled jobs
- Configuration and environment loading

If a future scaffold introduces a coherent equivalent architecture, preserve the local convention instead of forcing unnecessary rewrites.

Not every module needs a repository abstraction if Mongoose access through a clean service layer is sufficient. The architecture should remain pragmatic.

Future backend files should use clear JavaScript filenames such as:

```text
app.js
server.js
auth.routes.js
auth.controller.js
auth.service.js
property.model.js
property.routes.js
property.controller.js
property.service.js
property.validator.js
property.serializer.js
```

Prefer domain-specific filenames over vague filenames such as `controller.js`, `service.js`, or `model.js` when doing so improves maintainability.

Use ESM syntax when executable development begins:

```js
import express from "express";
import mongoose from "mongoose";

export default router;
```

## Module Organisation

Avoid empty architecture folders for future modules. Create modules only when they have real implementation or documentation value.

Planned high-level repository structure:

```text
Landzo/
  backend/
  admin/
  frontend/
  docs/
  Backedn Modules.txt
  Landzo admin panel Structure.txt
  Landzo_Backend_Initial_Specification_v2.pdf
```

Meanings:

- `backend/`: future Node.js, Express.js, MongoDB, and Mongoose backend.
- `admin/`: future React JavaScript Admin Panel.
- `frontend/`: future React JavaScript public website.

Do not create empty `backend/`, `admin/`, or `frontend/` folders until those implementation phases begin.

Likely implementation domains:

- `auth`
- `users`
- `roles-permissions`
- `properties`
- `explore`
- `search`
- `enquiries`
- `site-visits`
- `blogs`
- `cms`
- `analytics`
- `audit`
- `notifications`
- `settings`
- `locations`

The property domain should be capable of later separating concerns such as property codes, pricing, location, public media, private documents, and type-specific fields without duplicating sale/rent/lease listings.

Conceptual future backend source structure:

```text
backend/
  src/
    config/
    db/
    middleware/
    common/
    modules/
      auth/
      users/
      roles-permissions/
      properties/
      explore/
      search/
      enquiries/
      site-visits/
      blogs/
      cms/
      analytics/
      audit/
      notifications/
      settings/
      locations/
    jobs/
    app.js
    server.js
  tests/
```

This is documentation only. Do not create empty module folders in Step 0.1.

## API Versioning

Plan APIs under a versioned namespace:

```text
/api/v1/...
```

The backend should allow future separation between:

```text
/api/v1/admin/...
/api/v1/public/...
```

Step 0 does not create business routes. The purpose of this decision is to prevent early unversioned APIs from becoming difficult to evolve.

## Public/Admin Boundary

Public and admin API surfaces must be treated as separate contracts.

- Public endpoints return only information intended for visitors.
- Admin endpoints may expose operational/private fields only after authentication and permission checks.
- Private property records are restricted to Owner / Super Admin by default.
- Future RBAC may grant specifically approved access where requirements permit it.
- A property being publicly listed does not imply it is enabled for Explore Map.
- `publicVisibility` and `exploreMapEnabled` must remain independent concepts.
- Explore Map endpoints should return lightweight marker payloads, not full property records.

## Public DTO Requirement

Public property APIs must not return raw database documents. Public serializers/DTOs should explicitly include safe fields and exclude:

- Road frontage information
- Clear deed information
- Survey-plan information
- Facing/direction
- Internal nearby-landmark notes
- Survey plans
- Floor plans
- Deeds
- Internal PDFs
- Private property documents
- Internal property notes
- Any other internal notes or private files

This rule should be enforced in code structure, not left to controller discipline alone.

Bad:

```js
return res.json(property);
```

Preferred conceptual flow:

```text
Public route
  -> Controller
  -> Property service
  -> Database query
  -> Public property serializer
  -> Explicit allowlisted response
```

Public data exposure must be intentional because LANDZO properties can contain public information, sensitive admin information, and private documents.

## Pricing Visibility

The existence of a backend/internal property price does not mean that price is publicly visible.

LANDZO must support backend price storage with independent public price visibility.

Example:

```text
amount = 45000000
currency = LKR
priceVisible = false
```

Public APIs must not reveal the amount simply because it exists in MongoDB. Public DTOs/serializers must respect the public price-visibility setting.

Pricing architecture should preserve future states such as:

- Fixed price
- Monthly
- Annual
- Total lease
- Negotiable
- Price on request

## Geographic Data

Property coordinates should support MongoDB geospatial indexes. Store point data conceptually as:

```json
{
  "type": "Point",
  "coordinates": [79.8612, 6.9271]
}
```

Coordinate order is longitude first, latitude second.

```text
coordinates[0] = longitude
coordinates[1] = latitude
```

The future Admin UI should generate coordinates through location search and pin placement. Backend validation should reject invalid latitude/longitude values.

Future Admin workflow:

```text
Search location
  -> Map moves
  -> Admin selects / adjusts map pin
  -> Coordinates generated
  -> Backend receives coordinates
  -> Backend validates and stores coordinates
```

Admins should not be expected to manually type latitude and longitude.

## Property Codes

Future property codes should follow:

```text
Land: LND-00001
House: HSE-00001
Apartment: APT-00001
Commercial: COM-00001
```

The code system must eventually guarantee server-side generation, atomic generation, uniqueness, non-reuse, searchability, and stability across title/slug changes. Deleted property codes must not be recycled. Step 0.1 does not implement code generation.

## Deletion Model

Property deletion should be soft deletion first:

```text
Delete
  -> Soft Deleted / Trash
  -> Recoverable for 5 days
  -> Eligible for permanent deletion
```

The property should not immediately disappear permanently from the business database when an admin selects Delete. Scheduled permanent cleanup is a future job concern and is not implemented in Step 0.1.

## Environment Strategy

No `.env` or `.env.example` files currently exist.

When backend scaffolding begins:

- Use an environment example file for variable names only.
- Never store real credentials in the repository.
- Validate required environment variables at application startup.
- Avoid printing secret values in logs or reports.

Likely future variables include MongoDB connection URI, JWT/refresh-token secrets, cookie settings, CORS origins, storage provider credentials, email provider credentials, and map/geocoding provider settings. Provider choices are deferred until their dependent feature implementation.

Do not create `.env` before executable backend work requires it.

## Testing Strategy

No test framework is configured yet.

Because LANDZO is a JavaScript project, type checking status is:

```text
typecheck: N/A - JavaScript project
```

Do not introduce TypeScript solely to obtain type checking.

When implementation starts, add tests with the first executable backend behavior. Prioritize:

- Configuration loading and startup failure behavior
- Error response shape
- Validation behavior
- Public DTO/private-field exclusion
- Authentication and RBAC behavior when those modules are implemented
- Property visibility and Explore Map visibility separation
- Soft-delete lifecycle behavior

## Future Job Architecture

Scheduled jobs are not part of Step 0.

Future jobs may include:

- Permanent deletion of expired trash records
- Featured listing expiration
- Refresh-token cleanup
- Notification checks
- Data maintenance
- Backup verification

Jobs should share application configuration and logging conventions but remain isolated from HTTP route handlers.

## Security Baseline For Later Implementation

Future backend work should prepare for:

- Helmet/security headers
- CORS configuration
- Rate limiting
- Request validation
- Input sanitisation
- NoSQL injection protection
- Secure password hashing
- Refresh-token security
- Authentication middleware
- RBAC middleware
- Access-controlled private documents
- Safe file validation
- Standardized error responses
- No stack traces or secrets in production responses

No security libraries are installed in Step 0 because there is no executable backend yet.

## WhatsApp Scope

For current LANDZO V1 requirements, a third-party WhatsApp or SMS provider is not a blocking architecture decision.

Expected behavior:

```text
Property Detail
  -> User clicks WhatsApp
  -> LANDZO prepares a property-specific message
  -> WhatsApp opens
  -> User sends message through WhatsApp
```

LANDZO may additionally record property, timestamp, and WhatsApp click events for analytics. LANDZO does not currently need to send WhatsApp messages itself.

Do not integrate Twilio, Meta WhatsApp Business API, an SMS provider, or messaging dependencies unless explicitly requested later.

## Storage Decisions

Cloudinary applies only to future public media such as property images, thumbnails, blog images, homepage/CMS images, and staff/profile images. Cloudinary is not installed or configured in Step 1.

Private property documents remain separate and security-sensitive. Do not assume public Cloudinary delivery for deeds, survey plans, floor plans, internal PDFs, private brochures, or other owner/internal files.

## Deferred Decisions

The following decisions are deferred until before their dependent feature implementation:

- Public image/media storage provider: Cloudinary - LOCKED; integration deferred until Media implementation
- Private-document storage provider/strategy: DEFERRED - resolve before dependent feature implementation
- Email provider: DEFERRED - resolve before dependent feature implementation
- Leaflet location-search/geocoding provider: DEFERRED - resolve before dependent feature implementation
- Production backend hosting: DEFERRED - resolve before dependent feature implementation
- Admin frontend hosting: DEFERRED - resolve before dependent feature implementation
- Public frontend hosting: DEFERRED - resolve before dependent feature implementation
- Production MongoDB hosting/provider: DEFERRED - resolve before dependent feature implementation
- Backup infrastructure/provider: DEFERRED - resolve before dependent feature implementation

## YOGO Reference Rule

Where LANDZO and YOGO require equivalent infrastructure, inspect the actual YOGO implementation first and reuse the proven approach when secure and suitable.

See `docs/AUTHENTICATION.md` for Step 2 authentication design and YOGO audit findings.