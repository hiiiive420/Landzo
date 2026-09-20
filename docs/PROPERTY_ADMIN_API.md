# LANDZO Property Admin API

## Scope

Step 7 exposes authenticated Admin Property draft-management APIs.

Step 9 adds Property media management backed by Cloudinary.

Step 10A adds explicit publish/unpublish endpoints.

Step 10B adds Featured, Explore Map, and operational status lifecycle controls.

Step 10C adds Trash, Restore, and permanent-purge eligibility.

No public Property APIs exist through Step 10C.

## Implemented Endpoints

```text
POST   /api/v1/admin/properties
GET    /api/v1/admin/properties
GET    /api/v1/admin/properties/trash
GET    /api/v1/admin/properties/:propertyId
PATCH  /api/v1/admin/properties/:propertyId
POST   /api/v1/admin/properties/:propertyId/duplicate

POST   /api/v1/admin/properties/:propertyId/media
DELETE /api/v1/admin/properties/:propertyId/media/:imageId
PATCH  /api/v1/admin/properties/:propertyId/media/:imageId/cover
PATCH  /api/v1/admin/properties/:propertyId/media/reorder

POST   /api/v1/admin/properties/:propertyId/publish
POST   /api/v1/admin/properties/:propertyId/unpublish
PATCH  /api/v1/admin/properties/:propertyId/featured
PATCH  /api/v1/admin/properties/:propertyId/explore-map
PATCH  /api/v1/admin/properties/:propertyId/status

POST   /api/v1/admin/properties/:propertyId/trash
POST   /api/v1/admin/properties/:propertyId/restore
```

## Permissions

Routes use staff authentication followed by RBAC permission checks.

```text
POST   /api/v1/admin/properties
property.create

GET    /api/v1/admin/properties
property.view

GET    /api/v1/admin/properties/trash
property.view

GET    /api/v1/admin/properties/:propertyId
property.view

PATCH  /api/v1/admin/properties/:propertyId
property.edit

POST   /api/v1/admin/properties/:propertyId/duplicate
property.create

POST   /api/v1/admin/properties/:propertyId/media
property.edit

DELETE /api/v1/admin/properties/:propertyId/media/:imageId
property.edit

PATCH  /api/v1/admin/properties/:propertyId/media/:imageId/cover
property.edit

PATCH  /api/v1/admin/properties/:propertyId/media/reorder
property.edit

POST   /api/v1/admin/properties/:propertyId/publish
property.publish

POST   /api/v1/admin/properties/:propertyId/unpublish
property.publish

PATCH  /api/v1/admin/properties/:propertyId/featured
property.publish

PATCH  /api/v1/admin/properties/:propertyId/explore-map
property.publish

PATCH  /api/v1/admin/properties/:propertyId/status
property.edit

PATCH  /api/v1/admin/properties/:propertyId/status
property.archive when target status is archived

POST   /api/v1/admin/properties/:propertyId/trash
property.delete

POST   /api/v1/admin/properties/:propertyId/restore
property.delete
```

No route hard-codes Owner or Admin roles.

## Create Draft

Required fields:

```text
type
transactionTypes
title
```

Optional draft-safe fields:

```text
description
location
details
pricing
map
```

Server-generated or blocked fields include:

```text
code
slug
createdBy
updatedBy
mapLocation
status
isPublic
exploreMapEnabled
featured
deletedAt
purgeAt
deletedBy
```

Created Properties start with:

```text
status=draft
isPublic=false
exploreMapEnabled=false
featured=false
deletedAt=null
purgeAt=null
```

## Admin List

Endpoint:

```text
GET /api/v1/admin/properties
```

Only non-trashed Properties are returned.

Pagination:

```text
page default 1
limit default 20
limit maximum 100
```

Filters:

```text
search
type
transactionType
status
provinceId
districtId
cityId
areaId
currency
hasMap
```

Search covers Property Code, title, and display address using escaped bounded regex input.

Sorting values:

```text
newest
oldest
updated_desc
updated_asc
code_asc
code_desc
```

The service maps sort names to server-defined Mongo sort objects and does not accept arbitrary sort fields.

## Trash List

Endpoint:

```text
GET /api/v1/admin/properties/trash
```

Requires:

```text
property.view
```

The Trash list returns trashed Properties separately from the normal Admin Property list.

Normal Admin list/detail workflows do not expose trashed Properties.

Trash DTOs expose safe lifecycle timestamps:

```text
deletedAt
purgeAt
```

Internal `deletedBy` is not exposed in the normal Property DTO.

## Admin Detail

Endpoint:

```text
GET /api/v1/admin/properties/:propertyId
```

A valid unknown ObjectId returns:

```text
404 PROPERTY_NOT_FOUND
```

Malformed ObjectId returns a request validation error.

A trashed Property is not returned by the normal Admin detail endpoint.

The detail DTO includes:

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

Location summaries include:

```text
id
name
level
slug
```

## PATCH Semantics

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId
```

Allowed editable concepts:

```text
transactionTypes
title
description
location
details
pricing
map
```

PATCH uses prospective-state validation:

1. Load the existing Property.
2. Merge allowed patch fields with the current state.
3. Validate type details, Location hierarchy, pricing, and map rules.
4. Save only after the combined state is valid.

Omitted fields remain unchanged.

Explicit null clears supported optional values:

```text
pricing: null
map: null
location.area: null
location.displayAddress: null
```

Location hierarchy must remain valid.

For example, clearing Province while retaining District, City, or Area is rejected.

Changing `transactionTypes` without replacing incompatible pricing is rejected with:

```text
PROPERTY_PRICING_TRANSACTION_MISMATCH
```

The service does not silently delete incompatible pricing.

Trashed Properties cannot be modified through normal generic PATCH management.

## Immutable And Server-Controlled Fields

Generic CRUD rejects client control over:

```text
code
type
slug
createdBy
updatedBy
status
isPublic
exploreMapEnabled
featured
raw mapLocation
deletedAt
purgeAt
deletedBy
```

`title` changes may regenerate `slug`.

Property Code remains stable.

## Duplicate Listing

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/duplicate
```

The duplicate copies editable listing content:

```text
type
transactionTypes
description
location
details
pricing
map
```

The duplicate receives:

```text
new Mongo ID
new Property Code
new timestamps
createdBy = current actor
updatedBy = current actor
status = draft
isPublic = false
exploreMapEnabled = false
featured = false
```

Title convention:

```text
Original Title (Copy)
```

Pricing amounts may be copied, but:

```text
priceVisible=false
```

Map pin may be copied, but public and Explore visibility remain disabled.

Cloudinary Property media is not copied.

A trashed Property cannot be duplicated through the normal lifecycle service.

## Property Media

Property public photography is managed through explicit media APIs.

Upload:

```text
POST /api/v1/admin/properties/:propertyId/media
```

Upload field:

```text
images
```

Maximum:

```text
20 images per Property
10 files per request
10 MB per image
```

Allowed source MIME types:

```text
image/jpeg
image/png
image/webp
```

Uploaded images are normalized through Cloudinary to optimized WebP.

Current transformation limits the longest dimension to approximately:

```text
2560 px
```

The transformation uses a limit-style resize, preserves aspect ratio, and does not upscale smaller images.

Cloudinary folder convention:

```text
landzo/properties/<PROPERTY_CODE>
```

The frontend never supplies trusted Cloudinary `publicId` or storage folder values.

## Cover Image

A Property with images must have exactly one cover image.

The first uploaded image becomes the cover automatically.

Selecting another cover clears the previous cover.

Deleting the current cover selects the lowest-order remaining image as the new cover.

Deleting the final image leaves the Property without a cover.

## Media Ordering

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId/media/reorder
```

The request must contain every current image ID exactly once.

Missing, duplicate, and unknown image IDs are rejected.

Changing order does not change the cover identity.

## Publication Safety

Publish endpoint:

```text
POST /api/v1/admin/properties/:propertyId/publish
```

Publishing requires the Property to pass publication readiness validation.

Current readiness includes:

- title
- description
- Province
- District
- City
- display address
- exact map location
- valid pricing for every selected transaction type
- required type-specific details
- at least one public Property image
- exactly one cover image

`area` remains optional where the current contract permits it.

`priceVisible=false` may still publish when pricing is otherwise valid.

`price_on_request` remains valid according to Property pricing rules.

If readiness validation fails:

```text
PROPERTY_NOT_READY_FOR_PUBLICATION
```

Successful publish sets:

```text
isPublic=true
```

If the Property is currently `draft`, publishing also moves it to:

```text
status=available
```

Publish is supported from:

```text
draft
available
```

A trashed Property cannot be published.

## Unpublish

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/unpublish
```

Successful unpublish sets:

```text
isPublic=false
```

Unpublish does not rewrite operational status.

A trashed Property cannot be managed through normal unpublish lifecycle control.

## Featured

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId/featured
```

Body:

```json
{
  "featured": true
}
```

Featured requires:

```text
property.publish
```

Enabling Featured requires:

```text
isPublic=true
```

Disabling Featured is allowed for public or unpublished Properties.

Featured changes do not alter status or Explore Map visibility.

A trashed Property cannot be Featured through the normal lifecycle API.

## Explore Map

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId/explore-map
```

Body:

```json
{
  "exploreMapEnabled": true
}
```

Explore Map requires:

```text
property.publish
```

Enabling requires:

```text
isPublic=true
exact mapLocation exists
```

Disabling is otherwise supported by the normal lifecycle API.

Explore Map changes do not alter Featured or status.

A trashed Property cannot be Explore-enabled.

## Operational Status

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId/status
```

Example body:

```json
{
  "status": "reserved"
}
```

Normal transitions require:

```text
property.edit
```

Transitioning to `archived` requires:

```text
property.archive
```

Current transition rules:

- `available` may move to `reserved`, `sold`, `rented`, `leased`, `unavailable`, or `archived`.
- `reserved` may move to `available`, `sold`, `rented`, `leased`, `unavailable`, or `archived`.
- `unavailable` may move to `available` or `archived`.
- `sold`, `rented`, `leased`, and `archived` cannot be reopened through this endpoint.
- `draft` is not exposed as a normal operational status transition.
- `sold` requires Sale.
- `rented` requires Rent.
- `leased` requires Lease.

Status changes do not automatically change:

```text
isPublic
featured
exploreMapEnabled
```

Those remain independent controls.

Trashed Properties cannot be status-managed through this endpoint.

## Trash

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/trash
```

Requires:

```text
property.delete
```

Moving a Property to Trash:

- keeps the Property document in MongoDB
- records `deletedAt` using server time
- records `deletedBy` internally
- calculates `purgeAt`
- preserves the immutable Property Code
- preserves Property media
- sets `isPublic=false`
- sets `featured=false`
- sets `exploreMapEnabled=false`

Retention calculation:

```text
purgeAt = deletedAt + 5 × 24 hours
```

Trash is idempotent.

Calling Trash again on an already trashed Property does not extend the retention window.

Cloudinary media is not deleted when a Property enters Trash.

## Restore

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/restore
```

Requires:

```text
property.delete
```

Restore is allowed before the permanent purge deadline.

Restore clears:

```text
deletedAt
purgeAt
deletedBy
```

Restore preserves:

```text
Property ID
Property Code
Property media
Property content
```

Restore intentionally leaves:

```text
isPublic=false
featured=false
exploreMapEnabled=false
```

A restored Property must be deliberately published again if it should become public.

If the restore window has expired:

```text
PROPERTY_RESTORE_WINDOW_EXPIRED
```

## Permanent Purge

Step 10C implements a reusable backend purge service.

A trashed Property becomes eligible when:

```text
purgeAt <= current server time
```

Permanent purge processing:

1. selects expired trashed Properties
2. deletes their Property Cloudinary images
3. deletes the MongoDB Property record
4. never decrements the Property Code counter

Property Codes are therefore not reused.

Cloudinary deletion treats both:

```text
ok
not found
```

as successful cleanup states.

This makes retrying cleanup safe when an asset was already removed during a previous partial attempt.

The reusable purge service exists through Step 10C.

Automatic periodic execution through a scheduler/cron worker is deferred to the later Scheduled Jobs module.

## Deferred

Still deferred:

```text
Automatic Trash purge scheduling / Scheduled Jobs
Private property records
Private documents
Public Property APIs
Public Explore Map APIs
```