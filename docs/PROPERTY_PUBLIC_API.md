# LANDZO Public Property API

## Scope

Step 11 introduces the first unauthenticated public Property API for the LANDZO website.

The public API is deliberately separate from the authenticated Admin Property API.

Implemented endpoints:

```text
GET /api/v1/properties
GET /api/v1/properties/:propertyCode
```

These endpoints expose only Properties that satisfy the backend-controlled public visibility boundary:

```text
isPublic = true
deletedAt = null
```

Clients cannot override these conditions through query parameters.

## Authentication

Public Property endpoints do not require staff authentication.

They do not use:

```text
authenticateStaff
requirePermissions
```

The routes still pass through LANDZO's global middleware, including:

```text
request IDs
Helmet security headers
CORS
API rate limiting
dangerous-key rejection
error handling
```

## Public Property List

Endpoint:

```text
GET /api/v1/properties
```

The endpoint returns paginated public Property cards.

Only Properties satisfying:

```text
isPublic=true
deletedAt=null
```

are eligible.

Unpublished and trashed Properties are excluded even if other stored fields would otherwise match the request.

## Pagination

Supported parameters:

```text
page
limit
```

Defaults:

```text
page = 1
limit = 20
```

Maximum:

```text
limit = 100
```

Example:

```text
GET /api/v1/properties?page=2&limit=20
```

Response metadata:

```json
{
  "page": 2,
  "limit": 20,
  "total": 45,
  "totalPages": 3
}
```

## Search

Supported parameter:

```text
search
```

Search covers:

```text
Property Code
title
displayAddress
```

Search input is bounded and escaped before construction of the backend regex.

Example:

```text
GET /api/v1/properties?search=colombo
```

## Filters

Supported public filters:

```text
type
transactionType
status
provinceId
districtId
cityId
areaId
currency
featured
```

### Property Type

Supported values:

```text
land
house
apartment
commercial
```

Example:

```text
GET /api/v1/properties?type=apartment
```

### Transaction Type

Supported values:

```text
sale
rent
lease
```

Example:

```text
GET /api/v1/properties?transactionType=rent
```

### Status

The filter uses the registered LANDZO Property status catalog.

Example:

```text
GET /api/v1/properties?status=available
```

Public visibility remains controlled independently by:

```text
isPublic=true
deletedAt=null
```

The client cannot use the status filter to bypass public visibility.

### Location

Supported canonical Location Catalog filters:

```text
provinceId
districtId
cityId
areaId
```

Example:

```text
GET /api/v1/properties?provinceId=<OBJECT_ID>&districtId=<OBJECT_ID>&cityId=<OBJECT_ID>
```

The public API filters stored Location Catalog references rather than arbitrary location strings.

### Currency

Supported values:

```text
LKR
USD
```

Example:

```text
GET /api/v1/properties?currency=LKR
```

### Featured

Supported values:

```text
true
false
```

Example:

```text
GET /api/v1/properties?featured=true
```

Values other than the supported boolean strings are rejected.

## Sorting

Supported sort values:

```text
newest
oldest
updated_desc
updated_asc
code_asc
code_desc
```

Default:

```text
newest
```

Example:

```text
GET /api/v1/properties?sort=code_asc
```

Clients cannot supply arbitrary MongoDB sort fields.

Unsupported sort values are rejected by request validation.

## Unsupported Public Query Controls

The public API does not accept client control over internal visibility or Trash state.

Examples that are rejected include:

```text
isPublic=false
deletedAt=null
purgeAt=...
```

Public visibility is always determined by the backend.

## Public List DTO

A public Property list item exposes safe card-level information such as:

```text
code
slug
title
type
transactionTypes
status
location
pricing
featured
exploreMapEnabled
coverImage
createdAt
updatedAt
```

The public list DTO intentionally does not expose:

```text
Mongo Property ID
isPublic
deletedAt
purgeAt
deletedBy
createdBy
updatedBy
raw mapLocation
full media gallery
Cloudinary publicId
```

## Public Pricing Safety

Admin pricing may contain internal amounts even when:

```text
priceVisible=false
```

Those hidden amounts must never reach public clients.

Example internal/Admin pricing:

```json
{
  "currency": "LKR",
  "priceVisible": false,
  "sale": {
    "mode": "fixed",
    "amount": 25000000
  }
}
```

Public response:

```json
{
  "currency": "LKR",
  "priceVisible": false
}
```

The internal amount and transaction-specific pricing sections are omitted when public price visibility is disabled.

When:

```text
priceVisible=true
```

the valid public pricing sections may be returned.

## Public Cover Image

Public list responses expose lightweight cover-image information only.

Example:

```json
{
  "coverImage": {
    "id": "<IMAGE_ID>",
    "url": "https://..."
  }
}
```

Cloudinary `publicId` is not exposed.

The full gallery is reserved for public Property detail.

## Public Property Detail

Endpoint:

```text
GET /api/v1/properties/:propertyCode
```

Example:

```text
GET /api/v1/properties/APT-00042
```

The Property Code is the stable public lookup identity.

The lookup always requires:

```text
code = requested Property Code
isPublic = true
deletedAt = null
```

## Property Code Validation

Supported code prefixes:

```text
LND
HSE
APT
COM
```

Codes require at least five numeric sequence digits.

Examples:

```text
LND-00001
HSE-00042
APT-12345
COM-100000
```

Lowercase input is accepted and normalized.

Example:

```text
apt-00042
```

is normalized to:

```text
APT-00042
```

Invalid examples:

```text
APT-42
ABC-00001
APT00042
APT-0004X
modern-apartment-colombo
```

Malformed codes are rejected by request validation before Property lookup.

## Slug Behavior

Slug is included in public Property responses for future SEO-friendly frontend URLs.

However, slug is not the stable Property database identity.

The public detail endpoint does not perform slug-only lookup.

This is intentional because:

```text
Property Code = stable identifier
slug = presentation / SEO value
```

A future frontend URL may include both values while still resolving the Property by its stable code.

## Public Detail DTO

Public Property detail exposes:

```text
code
slug
title
type
transactionTypes
status
description
location
details
pricing
map
media
featured
exploreMapEnabled
createdAt
updatedAt
```

The public detail DTO intentionally excludes:

```text
Mongo Property ID
isPublic
deletedAt
purgeAt
deletedBy
createdBy
updatedBy
raw GeoJSON mapLocation
Cloudinary publicId
private Property records
private documents
```

## Public Map DTO

MongoDB stores exact Property coordinates as GeoJSON:

```json
{
  "type": "Point",
  "coordinates": [79.8612, 6.9271]
}
```

Public detail does not expose raw GeoJSON.

It returns:

```json
{
  "map": {
    "lat": 6.9271,
    "lng": 79.8612
  }
}
```

## Public Media Gallery

Public detail exposes the Property image gallery.

Safe public image fields include:

```text
id
url
width
height
format
order
isCover
```

The public gallery does not expose:

```text
Cloudinary publicId
bytes
uploadedAt
originalFilename
```

The media response includes:

```text
images
coverImage
```

## Not-Found Privacy Boundary

The public detail API returns the same not-found contract for:

```text
unknown Property
unpublished Property
trashed Property
```

Response:

```text
404 PROPERTY_NOT_FOUND
```

This prevents the public API from revealing whether a private or trashed Property exists internally.

## Public vs Admin Serialization

LANDZO uses separate public and Admin serializers.

Admin serializers may expose operational data required for staff workflows.

Public serializers expose only website-safe fields.

Do not reuse the Admin Property serializer directly for public routes.

This separation is especially important for:

```text
hidden pricing
Trash metadata
Mongo identifiers
Cloudinary metadata
internal staff references
```

## Security Rules

Public Property APIs must continue to follow these rules:

- Never trust `isPublic` from request input.
- Never expose trashed Properties.
- Never expose hidden pricing amounts.
- Never expose `deletedAt`, `purgeAt`, or `deletedBy`.
- Never expose `createdBy` or `updatedBy`.
- Never expose raw Cloudinary `publicId`.
- Never expose raw Mongoose documents.
- Never expose private Property records or documents.
- Use Property Code rather than slug as stable Property identity.
- Keep public and Admin DTOs separate.

## Step 11 Verification

Focused public Property API coverage verifies:

```text
unauthenticated public access
public-only list filtering
Trash exclusion
hidden-price protection
safe list DTO
pagination
search
filters
Featured filter
server-defined sorting
unsupported-query rejection
Property Code detail lookup
lowercase code normalization
safe public gallery
safe public map
unknown Property protection
unpublished Property protection
trashed Property protection
malformed code rejection
slug-only lookup rejection
```

Focused Step 11 suite:

```text
12 / 12 tests passed
```

Final backend regression after Step 11:

```text
133 / 133 tests passed
```

Backend lint, frontend lint, and frontend production build also passed.

## Deferred

Step 11 provides the backend public Property API foundation.

Still deferred to later deliberate steps:

```text
Public Property frontend pages
SEO routing using code + slug
Public Explore Map experience
advanced price-range filtering
advanced geospatial search
private seller/customer data
private Property documents
automatic Trash purge scheduling
```