import { apiClient } from "./apiClient";

export const auditActionOptions = Object.freeze([
  { value: "property.created", label: "Property Created" },
  { value: "property.updated", label: "Property Updated" },
  { value: "property.published", label: "Property Published" },
  { value: "property.unpublished", label: "Property Unpublished" },
  { value: "property.trashed", label: "Property Trashed" },
  { value: "property.restored", label: "Property Restored" },
  { value: "property.featured_changed", label: "Featured Changed" },
  { value: "property.explore_map_changed", label: "Explore Map Changed" },
  { value: "property.status_changed", label: "Status Changed" },

  { value: "blog.created", label: "Blog Created" },
  { value: "blog.updated", label: "Blog Updated" },
  { value: "blog.published", label: "Blog Published" },
  { value: "blog.unpublished", label: "Blog Unpublished" },
  { value: "blog.trashed", label: "Blog Trashed" },

  { value: "homepage.updated", label: "Homepage Updated" },
  { value: "homepage.media_changed", label: "Homepage Media Changed" },

  { value: "enquiry.created", label: "Enquiry Created" },
  { value: "enquiry.updated", label: "Enquiry Updated" },
  { value: "enquiry.assigned", label: "Enquiry Assigned" },
  { value: "enquiry.closed", label: "Enquiry Closed" },

  { value: "customer.created", label: "Customer Created" },
  { value: "customer.updated", label: "Customer Updated" },

  { value: "site_visit.created", label: "Site Visit Created" },
  { value: "site_visit.updated", label: "Site Visit Updated" },

  { value: "user.created", label: "User Created" },
  { value: "user.updated", label: "User Updated" },
  { value: "user.status_changed", label: "User Status Changed" },
  { value: "user.password_reset", label: "User Password Reset" },

  { value: "role.updated", label: "Role Updated" },
  { value: "role.permissions_updated", label: "Role Permissions Updated" },

  { value: "location.created", label: "Location Created" },
  { value: "location.updated", label: "Location Updated" },
  { value: "location.status_changed", label: "Location Status Changed" },

  { value: "private_document.uploaded", label: "Private Document Uploaded" },
  { value: "private_document.viewed", label: "Private Document Viewed" },
  { value: "private_document.replaced", label: "Private Document Replaced" },
  { value: "private_document.deleted", label: "Private Document Deleted" },

  { value: "settings.updated", label: "Settings Updated" },
]);

export const auditEntityTypeOptions = Object.freeze([
  { value: "property", label: "Property" },
  { value: "blog", label: "Blog" },
  { value: "homepage", label: "Homepage" },
  { value: "enquiry", label: "Enquiry" },
  { value: "customer", label: "Customer" },
  { value: "site_visit", label: "Site Visit" },
  { value: "user", label: "User" },
  { value: "role", label: "Role" },
  { value: "location", label: "Location" },
  { value: "private_document", label: "Private Document" },
  { value: "settings", label: "Settings" },
]);

export const listAuditLogs = async (params = {}) => {
  const { data } = await apiClient.get(
    "/admin/audit-logs",
    {
      params,
    },
  );

  return {
    data: data.data ?? [],
    meta: data.meta ?? {
      page: 1,
      limit: 30,
      total: 0,
      totalPages: 0,
    },
  };
};