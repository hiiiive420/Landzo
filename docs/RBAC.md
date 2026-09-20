# LANDZO RBAC

## Scope

Step 3 added role-based authorization for LANDZO staff/admin APIs. Step 4 extends that RBAC catalog for the Location Catalog backend. Property lifecycle capabilities added in later steps continue to use the same server-side permission model.

RBAC is resolved on the server. Access tokens may identify the staff user and current role context, but permissions are not trusted from JWT claims.

## System Roles

LANDZO V1 supports these fixed staff roles:

```text
owner
admin
enquiry_support
content_manager
```

Do not introduce customer, agent, property_owner, or public-user roles into the staff RBAC model. Future public/customer identity should use a separate design when that product track begins.

## Permission Catalog

Property permissions:

```text
property.create
property.view
property.edit
property.publish
property.archive
property.delete
property.viewPrivateData
```

Enquiry permissions:

```text
enquiry.view
enquiry.update
enquiry.assign
enquiry.close
```

Blog permissions:

```text
blog.create
blog.edit
blog.publish
blog.delete
```

Location permissions:

```text
location.view
location.manage
```

Administration permissions:

```text
user.manage
role.manage
settings.manage
analytics.view
```

## Default Role Permissions

`owner` is effectively all permissions and is immutable.

`admin` starts with property operation permissions, enquiry view/update/assign, analytics view, location view, and location manage.

`enquiry_support` starts with enquiry view/update/assign/close.

`content_manager` starts with blog create/edit/publish/delete.

These defaults apply when system roles are created fresh.

Existing non-owner role permission customizations are preserved during later bootstraps, including after new permissions such as `location.view` and `location.manage` are introduced.

## Bootstrap Behavior

`bootstrapSystemRoles()` runs during server startup after MongoDB connects.

The bootstrap process:

- Creates any missing system role documents.
- Keeps system role labels and flags aligned.
- Preserves existing non-owner customized permissions.
- Forces Owner to contain all permissions in the registered catalog.
- Does not create non-system/customer roles.

Owner permission edits are rejected by the role API with:

```text
OWNER_ROLE_IMMUTABLE
```

## Authorization Middleware

Admin routes first authenticate staff through the bearer access-token middleware.

Permission middleware then resolves the current role permissions from MongoDB or Owner effective permissions.

Expected response distinction:

```text
401 AUTHENTICATION_REQUIRED - no valid staff authentication context
403 FORBIDDEN - authenticated staff user lacks the required permission
```

Because permissions are resolved server-side per protected request, role permission changes take effect without waiting for existing access tokens to expire.

## Role Management APIs

All role-management APIs require:

```text
role.manage
```

Endpoints:

```text
GET   /api/v1/admin/roles
GET   /api/v1/admin/roles/permissions
PATCH /api/v1/admin/roles/:roleKey/permissions
```

`PATCH /api/v1/admin/roles/:roleKey/permissions` accepts a permission array.

Duplicate permission values are normalized to a unique array.

Unknown permissions are rejected by request validation.

## Property Draft APIs

Creating a Property or duplicating a Property requires:

```text
property.create
```

Endpoints:

```text
POST /api/v1/admin/properties
POST /api/v1/admin/properties/:propertyId/duplicate
```

Viewing normal Admin Property lists and details requires:

```text
property.view
```

Endpoints:

```text
GET /api/v1/admin/properties
GET /api/v1/admin/properties/:propertyId
```

Editing normal Property data requires:

```text
property.edit
```

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId
```

Property media mutation APIs also require:

```text
property.edit
```

These include upload, delete, cover selection, and reorder operations.

## Property Publish and Lifecycle APIs

Property publish, unpublish, Featured, and Explore Map routes require:

```text
property.publish
```

Endpoints:

```text
POST  /api/v1/admin/properties/:propertyId/publish
POST  /api/v1/admin/properties/:propertyId/unpublish
PATCH /api/v1/admin/properties/:propertyId/featured
PATCH /api/v1/admin/properties/:propertyId/explore-map
```

Normal operational status changes require:

```text
property.edit
```

Endpoint:

```text
PATCH /api/v1/admin/properties/:propertyId/status
```

Transitioning a Property to `archived` through the status endpoint requires:

```text
property.archive
```

Admin UI Publish, Unpublish, Featured, Explore Map, Status, and Archive controls must use the same capability permissions and must not hard-code roles.

## Property Trash and Restore

Moving a Property to Trash requires:

```text
property.delete
```

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/trash
```

Restoring a Property from Trash also requires:

```text
property.delete
```

Endpoint:

```text
POST /api/v1/admin/properties/:propertyId/restore
```

Viewing the Property Trash list requires:

```text
property.view
```

Endpoint:

```text
GET /api/v1/admin/properties/trash
```

Moving a Property to Trash immediately disables:

```text
isPublic
featured
exploreMapEnabled
```

Moving to Trash does not delete Property media immediately because the Property can still be restored during the retention period.

Restoring a Property does not automatically republish it.

After restore:

```text
isPublic=false
featured=false
exploreMapEnabled=false
```

Admin UI Move to Trash and Restore controls must be capability-gated using `property.delete`.

The Trash page itself may remain viewable to staff with `property.view`, while Restore remains unavailable without `property.delete`.

No Trash or Restore flow may hard-code access based on role names such as Owner or Admin.

## Location APIs

Location read APIs require:

```text
location.view
```

Location create, update, and status APIs require:

```text
location.manage
```

Do not hard-code location access to:

```text
role === "owner"
```

Use RBAC permissions.

## Owner Safeguards

Owner is the super-admin role and has special safety rules:

- Only an Owner can create another Owner.
- Only an Owner can promote a staff user to Owner.
- Only an Owner can demote an Owner.
- Only an Owner can disable an Owner.
- Only another Owner can reset an Owner password.
- LANDZO must never have zero active Owners.

Attempts to remove the final active Owner fail with:

```text
LAST_ACTIVE_OWNER
```

## Authentication Interaction

The `/api/v1/admin/auth/me` response includes the authenticated staff profile plus server-resolved permissions.

Role changes, status changes, password changes, and admin password resets increment `authVersion` and revoke active refresh sessions for the target user.

Previously issued access tokens fail once the user's `authVersion` changes.