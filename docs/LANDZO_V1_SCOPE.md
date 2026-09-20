# LANDZO V1 Scope

## Purpose

LANDZO V1 is a Sri Lankan property discovery and advisory platform. The first production track is backend-first so the future Admin UI and public responsive website can consume stable APIs.

Planned baseline:

- Frontend: React and JavaScript
- Admin Panel: React and JavaScript
- Backend: Node.js, Express.js, and JavaScript
- Database: MongoDB and Mongoose
- Map engine: Leaflet
- Architecture: MERN
- V1 language: English
- Supported currencies: LKR and USD

LANDZO is a JavaScript MERN project. It is not a TypeScript project.

## Supported Property Types

V1 property listings support:

- Land
- House
- Apartment
- Commercial

Commercial property subtypes should remain expandable without splitting the main property concept into unrelated models too early.

## Supported Transaction Types

V1 transaction types are:

- Sale
- Rent
- Lease

A property may support multiple transaction types at the same time. Sale, rent, and lease must not be represented as duplicate property records.

Example:

```json
{
  "transactionTypes": ["sale", "rent"]
}
```

## Public Modules

The public platform is expected to include:

- Home
- Properties
- Explore
- Saved Properties
- Blogs
- Enquiries / Contact

Saved Properties in V1 should be browser/device based and must not force public customer authentication.

## Major Admin Domains

The future Admin UI should support operational workflows around:

- Dashboard and property operations
- Property creation, editing, publishing, featuring, status changes, Explore Map visibility, archive, trash, and restore
- Enquiry pipeline, assignment, notes, and site visits
- Blogs, categories, tags, homepage CMS, media, and SEO content
- Locations
- Private documents
- Users, roles, and permissions
- Audit logs, analytics, notifications, and settings

These are product domains, not permission to create empty folders or implement every domain in Step 0.

## Key V1 Invariants

- Public listing visibility and Explore Map visibility are separate flags or concepts.
- A property may be publicly visible without being enabled for Explore Map.
- `publicVisibility` and `exploreMapEnabled` must remain independent.
- Private property information must never be returned from public property APIs.
- Public APIs must use explicit DTO/serialization boundaries instead of returning raw database documents.
- The existence of a backend/internal property price does not mean that price is publicly visible.
- Public property serializers must respect independent price visibility settings such as `priceVisible = false`.
- Pricing must preserve future states such as fixed price, monthly, annual, total lease, negotiable, and price on request.
- Map coordinates must be stored in a MongoDB geospatial-friendly structure such as GeoJSON Point.
- GeoJSON point coordinates use `[longitude, latitude]`, not `[latitude, longitude]`.
- `coordinates[0] = longitude` and `coordinates[1] = latitude`.
- Admins should not manually type coordinates in the future UI; coordinates should come from map search and pin placement.
- Property codes must eventually be server-generated, atomic, unique, never reused, searchable, and stable across title or slug changes.
- Deleted property codes must not be recycled.
- Property deletion should use soft deletion with a 5-day trash recovery period before records become eligible for permanent deletion.
- Future customer accounts must remain possible, but they are not required for V1 saved properties.
- Future owner submissions, agents, cross-device saved properties, analytics, richer media, and richer documents must remain possible without bloating V1.

Example public/Explore separation:

```text
Property A

Publicly visible: YES
Explore Map: NO
```

This property should still appear in normal property browsing but must not appear on Explore Map.

Example internal price with hidden public display:

```text
amount = 45000000
currency = LKR
priceVisible = false
```

Public APIs must not reveal the amount simply because it exists in MongoDB.

Trash lifecycle:

```text
Delete
  -> Soft Deleted / Trash
  -> Recoverable for 5 days
  -> Eligible for permanent deletion
```

## Out Of Scope For Step 0 Only

The following features are not implemented in Step 0 or Step 0.1, but are expected LANDZO V1 functionality where subsequently specified:

- Authentication
- Staff users
- RBAC
- Property models
- Property CRUD
- Property-code generation
- Pricing
- Location storage
- Search
- Filtering
- Sorting
- Pagination
- Public property APIs
- Explore Map backend support
- Property media
- Private property records
- Private documents
- Enquiries
- Enquiry pipeline
- Enquiry assignments
- Internal enquiry notes
- Site visits
- WhatsApp enquiry click/event tracking
- Blogs
- Blog categories
- Blog tags
- Homepage CMS
- SEO support
- Lightweight V1 analytics
- Audit logs
- Notifications/settings where subsequently approved
- Scheduled maintenance jobs where subsequently approved

## Future / Not Required For LANDZO V1

The following are future-facing capabilities and are not required for LANDZO V1 unless explicitly approved later:

- Public customer accounts
- Customer accounts and cross-device saved properties
- Property-owner self-service portal
- Property-owner submissions
- Agent portal
- Agent submissions
- Richer future customer-profile features
- Expanded analytics/reporting
- Richer commercial-property structures
- Other V2 functionality not explicitly approved

## Deferred Provider / Infrastructure Choices

The following decisions are deferred until their dependent implementation step:

- Public property image/media storage provider
- Private-document storage provider/strategy
- Media provider selection
- Email provider
- Geocoding provider selection
- Deployment architecture

For current LANDZO V1 requirements, SMS or WhatsApp provider integration is not a blocking decision. The expected WhatsApp flow is a user clicking a WhatsApp link from a property detail page, LANDZO preparing a property-specific message, WhatsApp opening, and the user sending the message themselves. Direct messaging-provider integration is a future optional requirement only.
