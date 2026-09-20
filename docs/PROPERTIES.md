# LANDZO Properties

## Scope

LANDZO Property management currently covers the core Property domain, pricing, Location Catalog relationships, exact GeoJSON map locations, Admin Property management, Cloudinary-based public Property photography, publication controls, operational lifecycle controls, Trash/Restore handling, and the first public Property API foundation.

Implemented through Step 11:

- Property model
- Property constants and enums
- Atomic server-generated Property Codes
- Draft-safe Property creation
- Type-specific Property details
- Location Catalog hierarchy validation
- Pricing contracts
- Exact GeoJSON Property map location
- Safe Admin Property serializers
- Admin Property CRUD
- Duplicate Property workflow
- Property media with Cloudinary
- optimized WebP Property image uploads
- Property cover and gallery ordering
- Publish and Unpublish
- Featured control
- Explore Map visibility control
- Operational Property status lifecycle
- Archive permission separation
- Trash
- Restore
- exact 5-day purge eligibility
- reusable permanent purge service
- Cloudinary cleanup during permanent purge
- Admin Trash and Restore UI
- Public Property list API
- Public Property detail API
- Public Property search
- Public Property filtering
- Public Property sorting
- Public Property pagination
- Public-safe Property serializers
- hidden-price protection for public DTOs
- stable public Property lookup using Property Code

Deferred:

- automatic Trash purge scheduling / Scheduled Jobs
- private seller records
- private documents
- Public Property frontend pages
- Public Explore Map experience
- advanced price-range filtering
- advanced geospatial search

## Property Types

LANDZO V1 supports exactly four top-level Property types:

```text
land
house
apartment
commercial
```

Property Code prefixes:

```text
land       -> LND
house      -> HSE
apartment  -> APT
commercial -> COM
```

Do not add top-level V1 types such as villa, condo, office, warehouse, shop, hotel, bungalow, or room.

Commercial variations belong under Commercial details.

## Transaction Types

A single Property can support multiple transaction types.

Supported values:

```text
sale
rent
lease
```

Stored example:

```json
["sale", "rent"]
```

Rules:

- At least one transaction type is required.
- Duplicate values are rejected.
- Unknown values are rejected.
- Request order has no business meaning.
- Internal services normalize transaction values to catalog order.
- Sale, Rent, and Lease stay on one Property record when they represent the same physical Property.

## Lifecycle Statuses

Supported statuses:

```text
draft
available
reserved
sold
rented
leased
unavailable
archived
```

Default:

```text
draft
```

Publishing may move a Draft Property to:

```text
available
```

Operational status transitions are handled through the explicit Admin status endpoint.

## Visibility Controls

These fields are independent:

```text
isPublic
exploreMapEnabled
featured
```

All default to:

```text
false
```

A Property may be public without being shown on Explore Map.

Explore Map visibility must not be automatically derived from public visibility.

Featured visibility is also independently controlled.

## Core Fields

The Property model includes concepts such as:

```text
code
type
transactionTypes
status
title
slug
description

province
district
city
area
displayAddress

pricing
mapLocation
details
media

isPublic
exploreMapEnabled
featured

deletedAt
purgeAt
deletedBy

createdBy
updatedBy
createdAt
updatedAt
```

`code` and `type` are immutable after creation.

`deletedBy` is internal lifecycle metadata and is not exposed through normal or public Property DTOs.

Private seller/customer information and private documents are not stored inside the current public Property contract.

## Property Codes

Property Codes are generated only by the backend.

Examples:

```text
LND-00001
HSE-00001
APT-00001
COM-00001
```

Architecture:

- Internal counter collection: `PropertyCodeCounter`.
- Counter key format: `property-code:<type>`.
- MongoDB atomic increment is used.
- Sequence is independent per Property type.
- Codes use five-digit zero padding until the sequence naturally exceeds `99999`.
- Codes do not truncate.
- Codes do not wrap.
- Codes are immutable.
- Counters never decrement in production lifecycle logic.

Property Codes are therefore never reused after Trash, permanent purge, or archive.

Client-supplied `code` is rejected.

## Slug

A generated `slug` is stored from the Property title.

A future frontend URL may use a shape such as:

```text
/property/APT-00042-modern-apartment-colombo-3
```

The Property Code remains the stable Property identity.

Slug is presentation and SEO metadata.

Slug may regenerate when the title changes and does not need to provide global identity by itself.

The Step 11 public detail API resolves Properties using Property Code rather than slug-only lookup.

## Location Catalog References

Properties reference canonical Location records:

```text
province
district
city
area
```

`area` is optional.

Drafts may hold a partial hierarchy.

Validation rules:

- Province must exist and have level `province`.
- District must belong to the selected Province.
- City must belong to the selected District.
- Area must belong to the selected City.
- New Location references must be active.
- District without Province is rejected.
- City without District is rejected.
- Area without City is rejected.

Inactive references are rejected using the Property Location validation contract.

The Property model does not replace canonical Location data with arbitrary province/district/city strings.

## Display Address

`displayAddress` is Property-specific text.

Example:

```text
No. 25, Galle Road, Colombo 03
```

It does not replace canonical Location Catalog references.

It does not contain the exact map coordinate storage contract.

## Type-Specific Details

Subtype data is stored under:

```text
details
```

Only the detail branch matching the Property type carries business meaning.

### Land

Fields include:

```text
landSize
landSizeUnit
landType
roadAccess
roadWidth
utilities
```

Land size units:

```text
perch
acre
squareFeet
```

Utilities:

```text
water
electricity
road
```

### House

Fields include:

```text
bedrooms
bathrooms
floors
landSize
landSizeUnit
houseSize
houseSizeUnit
parkingSpaces
furnishedStatus
```

### Apartment

Fields include:

```text
bedrooms
bathrooms
floorNumber
totalFloors
unitSize
unitSizeUnit
parkingSpaces
furnishedStatus
```

### Commercial

Fields include:

```text
commercialType
floorArea
floorAreaUnit
floorNumber
parkingSpaces
```

Commercial detail types:

```text
office
retail
warehouse
mixed_use
other
```

## Furnished Status

Supported House and Apartment furnished values:

```text
unfurnished
semi_furnished
furnished
```

## Pricing

Pricing is optional while a Property remains an incomplete Draft.

Supported currencies:

```text
LKR
USD
```

Rules:

- A pricing object declares one currency.
- No FX conversion is performed.
- `priceVisible` defaults to `false` when pricing exists.
- Hidden pricing may retain an internal amount.
- Pricing must align with selected transaction types.
- Drafts may temporarily be missing pricing for selected transaction types.
- Pricing for an unselected transaction type is rejected.
- Unknown pricing fields are rejected.
- Numeric amounts must be finite, positive, safe JavaScript integers.

Rejected amount forms include:

```text
zero
negative numbers
floats
numeric strings
NaN
Infinity
unsafe integers
```

Supported modes:

```text
fixed
negotiable
price_on_request
```

### Sale Pricing

Example:

```json
{
  "mode": "fixed",
  "amount": 25000000
}
```

Rules:

- Sale pricing has no period.
- `fixed` requires amount.
- `negotiable` requires amount.
- `price_on_request` may omit amount.
- An internal amount may still be retained for `price_on_request` where permitted by the pricing contract.

### Rent Pricing

Example:

```json
{
  "mode": "fixed",
  "period": "month",
  "amount": 150000
}
```

Supported periods:

```text
month
year
```

### Lease Pricing

Example:

```json
{
  "mode": "fixed",
  "period": "total",
  "amount": 9000000
}
```

Supported periods:

```text
total
month
year
```

## Multi-Transaction Pricing

Example:

```json
{
  "transactionTypes": ["sale", "rent"],
  "pricing": {
    "currency": "LKR",
    "sale": {
      "mode": "fixed",
      "amount": 25000000
    },
    "rent": {
      "mode": "fixed",
      "period": "month",
      "amount": 150000
    }
  }
}
```

The service does not automatically mutate transaction types based on pricing.

Pricing follows transaction selection.

## Exact Map Location

Admin/service input:

```json
{
  "map": {
    "lat": 6.9271,
    "lng": 79.8612
  }
}
```

MongoDB storage:

```json
{
  "mapLocation": {
    "type": "Point",
    "coordinates": [79.8612, 6.9271]
  }
}
```

GeoJSON coordinate order is:

```text
[longitude, latitude]
```

Rules:

- Drafts may omit map location.
- Admin input uses `lat` and `lng`.
- Client-supplied raw `mapLocation` is rejected.
- Latitude range is `-90` through `90`.
- Longitude range is `-180` through `180`.
- Strings, NaN, Infinity, and missing required coordinate values are rejected.
- Exact pins do not automatically derive Location Catalog references.
- Reverse geocoding is not currently part of the Property contract.

Safe API output:

```json
{
  "map": {
    "lat": 6.9271,
    "lng": 79.8612
  }
}
```

Raw GeoJSON is not exposed when the API contract uses the safe lat/lng DTO.

## Admin Property Draft APIs

Implemented:

```text
POST  /api/v1/admin/properties
GET   /api/v1/admin/properties
GET   /api/v1/admin/properties/:propertyId
PATCH /api/v1/admin/properties/:propertyId
POST  /api/v1/admin/properties/:propertyId/duplicate
```

Permissions:

```text
create     property.create
list       property.view
detail     property.view
update     property.edit
duplicate  property.create
```

Generic CRUD cannot directly control lifecycle fields.

Blocked concepts include:

```text
code
type
slug
status
isPublic
exploreMapEnabled
featured
deletedAt
purgeAt
deletedBy
raw mapLocation
```

## PATCH Behavior

PATCH uses prospective-state validation.

The service:

1. loads existing state
2. merges allowed changes
3. validates the combined state
4. saves only when the combined state is valid

Omitted values remain unchanged.

Explicit null may clear supported optional values such as:

```text
pricing
map
area
displayAddress
```

The resulting Property must continue to satisfy draft-safe cross-field rules.

Trashed Properties cannot be edited through the normal Admin PATCH workflow.

## Duplicate Behavior

Duplicate creates:

```text
new Mongo ID
new Property Code
new timestamps
new draft status
```

Visibility resets:

```text
isPublic=false
exploreMapEnabled=false
featured=false
```

Copied pricing visibility resets:

```text
priceVisible=false
```

Cloudinary media is not copied.

The duplicate title follows:

```text
Original Title (Copy)
```

A trashed Property cannot be duplicated through the normal lifecycle service.

## Property Media

Property public photography is stored in Cloudinary.

This media flow applies only to public Property photography.

It does not include private seller records, deeds, NIC files, survey plans, private PDFs, or other restricted documents.

### Cloudinary Storage

Property image folder:

```text
landzo/properties/<PROPERTY_CODE>
```

Example:

```text
landzo/properties/APT-00042
```

The backend determines the folder from the immutable Property Code.

Clients do not control the Cloudinary folder or persisted public ID.

### Image Schema

Property media is embedded as structured image metadata.

Conceptually:

```text
media.images[]
```

Each stored image tracks values such as:

```text
id
publicId
secureUrl
width
height
format
bytes
order
isCover
uploadedAt
originalFilename
```

Admin mutation APIs work with server-resolved image records rather than trusting client-supplied Cloudinary identifiers.

### Upload Limits

Maximum per Property:

```text
20 images
```

Maximum per request:

```text
10 images
```

Maximum per file:

```text
10 MB
```

Allowed input MIME types:

```text
image/jpeg
image/png
image/webp
```

SVG, PDF, ZIP, HTML, video, and private-document formats are rejected.

### WebP Optimization

New Property image uploads are normalized through Cloudinary.

Output format:

```text
webp
```

Quality:

```text
auto
```

Maximum transformation bounds:

```text
2560 × 2560
```

The Cloudinary transformation uses limit-style resizing.

Smaller source images are not upscaled.

Aspect ratio is preserved.

Previously stored images are not automatically migrated.

### Cover Invariant

A Property with no images has no cover.

The first image becomes the cover automatically.

When another image becomes cover, all other images are cleared as cover.

A Property with one or more images must have exactly one cover.

If the current cover is deleted and images remain, the lowest-order remaining image becomes the new cover.

If the final image is deleted, cover becomes null.

### Image Ordering

Order uses zero-based integer positions.

Reordering requires every current image ID exactly once.

Missing, duplicate, and unknown IDs are rejected.

Changing order does not automatically change cover identity.

### Admin Media APIs

```text
POST   /api/v1/admin/properties/:propertyId/media
DELETE /api/v1/admin/properties/:propertyId/media/:imageId
PATCH  /api/v1/admin/properties/:propertyId/media/:imageId/cover
PATCH  /api/v1/admin/properties/:propertyId/media/reorder
```

All require:

```text
property.edit
```

### Admin Media Serialization

Admin detail returns the full Admin media gallery.

Admin list returns lightweight cover information.

The full media gallery is not returned in every Admin list row.

## Publication Workflow

Explicit publish endpoint:

```text
POST /api/v1/admin/properties/:propertyId/publish
```

Requires:

```text
property.publish
```

Current publication readiness includes:

- title
- description
- Province
- District
- City
- display address
- exact map location
- valid pricing for every selected transaction type
- required type-specific details
- at least one Property image
- exactly one cover image

`area` remains optional.

Hidden valid pricing may publish.

If validation fails:

```text
PROPERTY_NOT_READY_FOR_PUBLICATION
```

Successful Draft publication sets:

```text
isPublic=true
status=available
```

Publishing is currently supported from:

```text
draft
available
```

Trashed Properties cannot be published.

## Unpublish

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/unpublish
```

Requires:

```text
property.publish
```

Unpublish sets:

```text
isPublic=false
```

It does not automatically change operational status.

Trashed Properties cannot be managed through the normal unpublish workflow.

## Featured

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId/featured
```

Requires:

```text
property.publish
```

Featured can be enabled only when:

```text
isPublic=true
```

Featured does not automatically change status or Explore Map visibility.

Trashed Properties cannot be Featured through the normal lifecycle workflow.

## Explore Map

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId/explore-map
```

Requires:

```text
property.publish
```

Explore Map can be enabled only for a public Property with an exact map location.

Explore visibility remains independent from Featured and lifecycle status.

Trashed Properties cannot be Explore-enabled.

## Operational Status

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId/status
```

Normal transitions require:

```text
property.edit
```

Archive requires:

```text
property.archive
```

Current transition rules:

- `available` → `reserved`, `sold`, `rented`, `leased`, `unavailable`, `archived`
- `reserved` → `available`, `sold`, `rented`, `leased`, `unavailable`, `archived`
- `unavailable` → `available`, `archived`
- `sold` is closed
- `rented` is closed
- `leased` is closed
- `archived` is closed
- `draft` is not a normal operational transition target

Transaction restrictions:

```text
sold   requires sale
rented requires rent
leased requires lease
```

Status changes do not automatically mutate:

```text
isPublic
featured
exploreMapEnabled
```

Trashed Properties cannot be status-managed through this endpoint.

## Trash

Step 10C adds Property soft deletion.

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/trash
```

Requires:

```text
property.delete
```

Moving to Trash records:

```text
deletedAt = server timestamp
purgeAt = deletedAt + exactly 5 × 24 hours
deletedBy = current staff user
```

Trash also forces:

```text
isPublic=false
featured=false
exploreMapEnabled=false
```

Trash preserves:

```text
Property Code
Property content
Property media
operational status
```

Cloudinary images are not deleted when moving to Trash.

The Property remains recoverable during the retention window.

Repeated Trash calls do not extend the purge deadline.

## Trash Listing

Endpoint:

```text
GET /api/v1/admin/properties/trash
```

Requires:

```text
property.view
```

Normal Admin Property lists exclude trashed Properties.

Normal Admin Property detail also excludes trashed Properties.

Trash list entries expose safe lifecycle timestamps:

```text
deletedAt
purgeAt
```

Internal `deletedBy` is not exposed.

## Restore

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/restore
```

Requires:

```text
property.delete
```

Restore before expiration clears:

```text
deletedAt
purgeAt
deletedBy
```

Restore preserves:

```text
Property Code
Property media
Property content
```

Restore deliberately leaves:

```text
isPublic=false
featured=false
exploreMapEnabled=false
```

Restore does not republish the Property.

Expired restore attempts fail with:

```text
PROPERTY_RESTORE_WINDOW_EXPIRED
```

## Permanent Purge

A reusable permanent-purge service is implemented.

Expired Trash eligibility:

```text
purgeAt <= current server time
```

Purge behavior:

1. locate expired trashed Properties
2. delete Property Cloudinary images
3. delete the MongoDB Property document
4. keep Property Code counters unchanged

Property Codes therefore remain permanently non-reusable.

Cloudinary delete handling accepts:

```text
ok
not found
```

as successful cleanup outcomes.

Treating `not found` as successful cleanup makes retrying purge safe when an image was already removed during a previous cleanup attempt.

Automatic scheduled execution of the purge service remains deferred to the Scheduled Jobs module.

## Admin Trash UI

The Admin Property list exposes Move to Trash only when the authenticated user has:

```text
property.delete
```

The Admin Trash page is available to staff with:

```text
property.view
```

Restore is shown only when the user has:

```text
property.delete
```

The Trash UI displays:

```text
deleted time
permanent deletion time
remaining retention time
```

There is intentionally no manual permanent-delete button in the Step 10C Admin UI.

# Public Property APIs

Step 11 adds the first unauthenticated public Property API foundation.

Implemented endpoints:

```text
GET /api/v1/properties
GET /api/v1/properties/:propertyCode
```

Public Property routes do not require staff authentication.

They remain behind LANDZO's normal global API middleware, including security headers, CORS, API rate limiting, dangerous-key rejection, request IDs, and centralized error handling.

## Public Visibility Boundary

All public Property database queries enforce:

```text
isPublic=true
deletedAt=null
```

This condition is backend controlled.

Clients cannot override public visibility using request parameters.

An unpublished Property is never returned.

A trashed Property is never returned even if inconsistent historical data still contains:

```text
isPublic=true
```

Both conditions must be satisfied.

## Public Property List

Endpoint:

```text
GET /api/v1/properties
```

The endpoint returns safe, paginated Property card data.

Supported query parameters:

```text
page
limit
search
type
transactionType
status
provinceId
districtId
cityId
areaId
currency
featured
sort
```

Pagination defaults:

```text
page=1
limit=20
```

Maximum:

```text
limit=100
```

## Public Search

Search covers:

```text
Property Code
title
displayAddress
```

Search text is bounded and escaped before use in backend regular-expression matching.

Example:

```text
GET /api/v1/properties?search=colombo
```

## Public Filters

Supported Property type values:

```text
land
house
apartment
commercial
```

Supported transaction types:

```text
sale
rent
lease
```

Location filters use canonical Location Catalog ObjectIds:

```text
provinceId
districtId
cityId
areaId
```

Supported currencies:

```text
LKR
USD
```

Featured filtering accepts:

```text
true
false
```

Public query parameters do not expose direct control over:

```text
isPublic
deletedAt
purgeAt
```

Unsupported query fields are rejected because the public query schema is strict.

## Public Sorting

Supported public sort values:

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

The API maps these values to server-controlled MongoDB sort objects.

Clients cannot specify arbitrary database sort fields.

## Public Property List DTO

A public Property list item contains safe card-level data such as:

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

The public list deliberately excludes:

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

Detail lookup enforces:

```text
code = requested Property Code
isPublic = true
deletedAt = null
```

The detail API does not perform slug-only Property lookup.

## Public Property Code Validation

Supported prefixes:

```text
LND
HSE
APT
COM
```

Codes require at least five sequence digits.

Valid examples:

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

Invalid examples include:

```text
APT-42
ABC-00001
APT00042
APT-0004X
modern-apartment-colombo
```

Malformed Property Codes are rejected by request validation before Property lookup.

## Public Not-Found Privacy Boundary

The public Property detail API intentionally returns the same response for:

```text
unknown Property
unpublished Property
trashed Property
```

Response contract:

```text
404 PROPERTY_NOT_FOUND
```

This prevents public callers from confirming whether an unpublished or trashed Property exists internally.

## Public Pricing Safety

Admin pricing may retain an internal amount even when:

```text
priceVisible=false
```

The public serializers must never expose those hidden amounts.

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

When the price is hidden, transaction-specific pricing sections and amounts are omitted from the public response.

When:

```text
priceVisible=true
```

valid public pricing sections may be returned.

## Public Property Detail DTO

The public detail response exposes safe website-facing fields such as:

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

It deliberately excludes:

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
private seller data
private documents
```

## Public Property Media

Public list responses expose lightweight cover data only.

Example:

```json
{
  "coverImage": {
    "id": "<IMAGE_ID>",
    "url": "https://..."
  }
}
```

Public Property detail exposes the safe image gallery.

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

Public image DTOs do not expose:

```text
Cloudinary publicId
bytes
uploadedAt
originalFilename
```

## Public Property Map

MongoDB continues to store exact coordinates as GeoJSON:

```text
[longitude, latitude]
```

The public detail response returns:

```json
{
  "map": {
    "lat": 6.9271,
    "lng": 79.8612
  }
}
```

Raw GeoJSON storage is not exposed.

## Public and Admin Serializer Separation

Admin and public Property responses use separate serializer boundaries.

Admin serializers may expose operational data required for staff management.

Public serializers expose only website-safe fields.

Admin serializers must not be reused directly for public Property routes.

This separation protects:

```text
hidden pricing
Trash metadata
internal staff references
Mongo identifiers
Cloudinary metadata
```

See:

```text
docs/PROPERTY_PUBLIC_API.md
```

for the complete Step 11 public HTTP contract.

## Serializer Safety

`serializeProperty` remains the Admin-facing Property serializer.

Public routes use dedicated public serializers.

Normal Admin-safe Property data includes concepts such as:

```text
id
code
type
transactionTypes
status
title
slug
description
location
details
pricing
map
media
isPublic
exploreMapEnabled
featured
deletedAt
purgeAt
createdAt
updatedAt
```

Admin serializers do not expose internal implementation values such as:

```text
__v
PropertyCodeCounter internals
createdBy
updatedBy
deletedBy
raw mapLocation GeoJSON
private seller data
private documents
```

Public serializers apply a stricter output boundary as defined above.

## Indexes

Property indexing includes:

```text
code unique
type
status
transactionTypes
isPublic
exploreMapEnabled
featured
province + district + city + area
mapLocation 2dsphere
createdAt
deletedAt
purgeAt
```

`purgeAt` is intentionally not a MongoDB TTL deletion mechanism because permanent purge must clean Cloudinary assets before removing the Property document.

The existing unique Property Code index also supports stable Step 11 public detail lookup.

## Draft vs Publish Validation

Draft creation requires:

```text
type
transactionTypes
title
```

Drafts may remain incomplete.

Whenever optional Property details are provided, those values must satisfy their draft-safe validation rules.

Publication completeness is enforced only through the explicit publish workflow.

Only Properties deliberately published by the Admin workflow may become eligible for the Step 11 public API.

## Private Records

Public Property media and Step 11 public Property APIs do not include private seller/customer records.

Still outside the current public Property contract:

```text
seller name
seller phone
seller email
private notes
NIC files
deeds
survey plans
private PDFs
other restricted documents
```

Private records require a separate restricted-storage, serializer, and permission design.

## Cleanup Lifecycle

Moving a Property to Trash does not delete its Cloudinary media.

This is intentional because the Property may still be restored.

Permanent purge deletes Property Cloudinary assets before deleting the MongoDB Property document.

Automatic scheduling of permanent purge remains deferred to the dedicated Scheduled Jobs implementation.

## Step 11 Verification

Focused public Property API tests:

```text
12 / 12 passed
```

Coverage includes:

```text
unauthenticated public access
public-only listing
Trash exclusion
unpublished Property exclusion
public pagination
public search
public filters
Featured filtering
server-defined sorting
unsupported-query rejection
hidden-price protection
safe public list DTO
stable Property Code detail lookup
lowercase code normalization
safe public detail DTO
safe Property gallery
safe map DTO
unknown Property protection
unpublished Property detail protection
trashed Property detail protection
malformed code rejection
slug-only lookup rejection
```

Final backend regression after Step 11:

```text
133 / 133 passed
```

Also passed:

```text
Backend lint
Frontend lint
Frontend production build
```

## Current Development Boundary

Through Step 11, LANDZO now has a complete server-side path from:

```text
Admin creates Property
        ↓
Admin adds details, pricing, location and media
        ↓
Admin validates and publishes Property
        ↓
Backend marks Property public
        ↓
Public Property list API can expose it
        ↓
Public Property detail API can expose it safely
        ↓
Unpublish or Trash removes it from public API results
```

The next development work should build on this existing boundary rather than duplicating Property logic in the frontend.

Public frontend pages should consume the Step 11 public DTOs and must not depend on Admin APIs or Admin serializers.