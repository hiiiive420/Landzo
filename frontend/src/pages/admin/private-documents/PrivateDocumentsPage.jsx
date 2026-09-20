import { useCallback, useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "../../../api/apiClient";
import { listCustomerOptions } from "../../../api/customers.api";
import { listEnquiries } from "../../../api/enquiries.api";
import {
  deletePrivateDocument,
  getPrivateDocumentAccess,
  listPrivateDocuments,
  replacePrivateDocumentFile,
  updatePrivateDocumentMetadata,
  uploadPrivateDocument,
} from "../../../api/privateDocuments.api";
import { listProperties } from "../../../api/properties.api";
import { listSiteVisits } from "../../../api/siteVisits.api";
import { useAuth } from "../../../auth/useAuth";
import { Alert } from "../../../components/common/Alert";
import { EmptyState } from "../../../components/common/EmptyState";
import { formatDateTime, formatLabel } from "../../../utils/formatters";
import { permissions } from "../../../utils/propertyOptions";

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "property", label: "Property" },
  { value: "customer", label: "Customer" },
  { value: "enquiry", label: "Enquiry" },
  { value: "site_visit", label: "Site Visit" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "deleted", label: "Deleted" },
];

const defaultFilters = {
  page: 1,
  limit: 20,
  search: "",
  category: "",
  status: "active",
};

const defaultUploadForm = {
  title: "",
  description: "",
  category: "general",
  entityId: "",
  file: null,
};
const defaultEditForm = {
  title: "",
  description: "",
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${Number.parseFloat(kilobytes.toFixed(1))} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${Number.parseFloat(megabytes.toFixed(1))} MB`;
};

const buildQuery = (filters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));

const getDocumentLabel = (document) => document.title || document.file?.originalFilename || "Private document";

const getEntityOptionLabel = (category, item) => {
  if (category === "property") {
    return [item.code, item.title].filter(Boolean).join(" - ") || item.id;
  }

  if (category === "customer") {
    return [item.fullName || item.name, item.email, item.phone].filter(Boolean).join(" - ") || item.id;
  }

  if (category === "enquiry") {
    return [item.fullName, item.email, item.phone, item.status].filter(Boolean).join(" - ") || item.id;
  }

  if (category === "site_visit") {
    return [item.visitorName, item.status, item.scheduledAt ? formatDateTime(item.scheduledAt) : ""]
      .filter(Boolean)
      .join(" - ") || item.id;
  }

  return item.id;
};

const normalizeListData = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.data ?? response?.items ?? [];
};

export const PrivateDocumentsPage = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(permissions.privateDocumentManage);

  const [filters, setFilters] = useState(defaultFilters);
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState(defaultUploadForm);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityOptions, setEntityOptions] = useState([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
const [replacementFiles, setReplacementFiles] = useState({});
const [editingDocument, setEditingDocument] = useState(null);
const [editForm, setEditForm] = useState(defaultEditForm);

  const query = useMemo(() => buildQuery(filters), [filters]);
  const needsEntity = uploadForm.category !== "general";

  const loadDocuments = useCallback(async () => {
    await Promise.resolve();

    setLoading(true);
    setError("");

    try {
      const response = await listPrivateDocuments(query);
      setDocuments(response.data || []);
      setMeta({
        page: response.meta?.page ?? 1,
        limit: response.meta?.limit ?? defaultFilters.limit,
        total: response.meta?.total ?? 0,
        totalPages: response.meta?.totalPages ?? 0,
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadDocuments]);

  useEffect(() => {
    let active = true;

    const loadEntityOptions = async () => {
      if (!needsEntity) {
        setEntityOptions([]);
        return;
      }

      setEntityLoading(true);

      try {
        const params = { search: entitySearch.trim(), limit: 20 };
        let response;

        if (uploadForm.category === "property") {
          response = await listProperties(params);
          response = response.data;
        } else if (uploadForm.category === "customer") {
          response = await listCustomerOptions(params);
        } else if (uploadForm.category === "enquiry") {
          response = await listEnquiries(params);
          response = response.data;
        } else if (uploadForm.category === "site_visit") {
          response = await listSiteVisits(params);
          response = response.data;
        }

        if (active) {
          setEntityOptions(normalizeListData(response));
        }
      } catch {
        if (active) {
          setEntityOptions([]);
        }
      } finally {
        if (active) {
          setEntityLoading(false);
        }
      }
    };

    void loadEntityOptions();

    return () => {
      active = false;
    };
  }, [entitySearch, needsEntity, uploadForm.category]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: 1,
    }));
  };

  const handlePageChange = (direction) => {
    setFilters((current) => ({
      ...current,
      page: Math.max(1, current.page + direction),
    }));
  };

  const handleUploadChange = (event) => {
    const { name, value, files } = event.target;

    setUploadForm((current) => ({
      ...current,
      [name]: files ? files[0] ?? null : value,
      ...(name === "category" ? { entityId: "" } : {}),
    }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await uploadPrivateDocument({
        ...uploadForm,
        entityId: needsEntity ? uploadForm.entityId : undefined,
      });
      setUploadForm(defaultUploadForm);
      setEntitySearch("");
      setShowUpload(false);
      setSuccess("Private document uploaded.");
      await loadDocuments();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setSubmitting(false);
    }
  };

  const openAccessUrl = async (documentId, attachment) => {
    setError("");
    setSuccess("");

    try {
      const access = await getPrivateDocumentAccess(documentId, { attachment });
      window.open(access.url, "_blank", "noopener,noreferrer");
    } catch (accessError) {
      setError(getErrorMessage(accessError));
    }
  };

  const beginEdit = (document) => {
    setEditingDocument(document);
    setEditForm({
      title: document.title || "",
      description: document.description || "",
    });
    setError("");
    setSuccess("");
  };

  const cancelEdit = () => {
    setEditingDocument(null);
    setEditForm(defaultEditForm);
  };

  const handleEdit = async (event) => {
    event.preventDefault();

    if (!editingDocument) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await updatePrivateDocumentMetadata(editingDocument.id, editForm);
      setSuccess("Private document updated.");
      cancelEdit();
      await loadDocuments();
    } catch (editError) {
      setError(getErrorMessage(editError));
    } finally {
      setSubmitting(false);
    }
  };
  const handleReplace = async (document) => {
    const file = replacementFiles[document.id];

    if (!file) {
      setError("Select a replacement file first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await replacePrivateDocumentFile(document.id, file);
      setReplacementFiles((current) => ({ ...current, [document.id]: null }));
      setSuccess("Private document file replaced.");
      await loadDocuments();
    } catch (replaceError) {
      setError(getErrorMessage(replaceError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (document) => {
    if (!window.confirm(`Delete ${getDocumentLabel(document)}? The file will be removed and a history record retained.`)) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await deletePrivateDocument(document.id);
      setSuccess("Private document deleted.");
      await loadDocuments();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="private-documents-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Private Documents</p>
          <h1>Private Documents</h1>
          <p className="muted">
            Store protected internal files behind short-lived authenticated access links.
          </p>
        </div>

        {canManage ? (
          <button className="button" type="button" onClick={() => setShowUpload((value) => !value)}>
            {showUpload ? "Close Upload" : "Upload Document"}
          </button>
        ) : null}
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      {editingDocument && canManage ? (
        <form className="card private-document-upload" onSubmit={handleEdit}>
          <div>
            <h2>Edit Private Document</h2>
            <p className="muted">Update title and description only.</p>
          </div>

          <div className="form-grid two">
            <label className="field" htmlFor="private-document-edit-title">
              <span>Title</span>
              <input
                id="private-document-edit-title"
                value={editForm.title}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </label>

            <label className="field" htmlFor="private-document-edit-description">
              <span>Description</span>
              <textarea
                id="private-document-edit-description"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, description: event.target.value }))
                }
                rows="3"
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Metadata"}
            </button>
            <button className="button secondary" type="button" onClick={cancelEdit} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {showUpload && canManage ? (
        <form className="card private-document-upload" onSubmit={handleUpload}>
          <div>
            <h2>Upload Private Document</h2>
            <p className="muted">PDF, JPG, PNG, WebP, DOC, DOCX, XLS or XLSX. Maximum 20 MB.</p>
          </div>

          <div className="form-grid two">
            <label className="field" htmlFor="private-document-title">
              <span>Title</span>
              <input
                id="private-document-title"
                name="title"
                value={uploadForm.title}
                onChange={handleUploadChange}
                required
              />
            </label>

            <label className="field" htmlFor="private-document-category">
              <span>Category</span>
              <select
                id="private-document-category"
                name="category"
                value={uploadForm.category}
                onChange={handleUploadChange}
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field" htmlFor="private-document-description">
            <span>Description</span>
            <textarea
              id="private-document-description"
              name="description"
              value={uploadForm.description}
              onChange={handleUploadChange}
              rows="3"
            />
          </label>

          {needsEntity ? (
            <div className="form-grid two">
              <label className="field" htmlFor="private-document-entity-search">
                <span>{formatLabel(uploadForm.category)} search</span>
                <input
                  id="private-document-entity-search"
                  type="search"
                  value={entitySearch}
                  onChange={(event) => setEntitySearch(event.target.value)}
                  placeholder="Search linked record"
                />
              </label>

              <label className="field" htmlFor="private-document-entity">
                <span>Linked record</span>
                <select
                  id="private-document-entity"
                  name="entityId"
                  value={uploadForm.entityId}
                  onChange={handleUploadChange}
                  required
                >
                  <option value="">{entityLoading ? "Loading..." : "Select record"}</option>
                  {entityOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {getEntityOptionLabel(uploadForm.category, option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <label className="field" htmlFor="private-document-file">
            <span>File</span>
            <input
              id="private-document-file"
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={handleUploadChange}
              required
            />
          </label>

          <div className="form-actions">
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      ) : null}

      <section className="card private-document-filters" aria-label="Private document filters">
        <label className="field" htmlFor="private-document-search">
          <span>Search</span>
          <input
            id="private-document-search"
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Title or filename"
          />
        </label>

        <label className="field" htmlFor="private-document-filter-category">
          <span>Category</span>
          <select
            id="private-document-filter-category"
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
          >
            <option value="">All</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field" htmlFor="private-document-filter-status">
          <span>Status</span>
          <select
            id="private-document-filter-status"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card private-document-list" aria-live="polite">
        {loading ? <p className="muted">Loading private documents...</p> : null}

        {!loading && documents.length === 0 ? (
          <EmptyState title="No private documents">Protected files will appear here.</EmptyState>
        ) : null}

        {!loading && documents.length > 0 ? (
          <div className="private-document-table-wrap">
            <table className="private-document-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>File</th>
                  <th>Created by</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <strong>{document.title}</strong>
                      {document.description ? <span>{document.description}</span> : null}
                    </td>
                    <td>{formatLabel(document.category)}</td>
                    <td>
                      <strong>{document.file?.originalFilename || "-"}</strong>
                      <span>
                        {[document.file?.format?.toUpperCase(), formatFileSize(document.file?.bytes)]
                          .filter(Boolean)
                          .join(" | ")}
                      </span>
                    </td>
                    <td>{document.createdBy?.fullName || "-"}</td>
                    <td>{formatDateTime(document.createdAt)}</td>
                    <td>{formatLabel(document.status)}</td>
                    <td>
                      <div className="private-document-actions">
                        {document.status === "active" ? (
                          <>
                            <button
                              className="button secondary small"
                              type="button"
                              onClick={() => openAccessUrl(document.id, false)}
                            >
                              View
                            </button>
                            <button
                              className="button secondary small"
                              type="button"
                              onClick={() => openAccessUrl(document.id, true)}
                            >
                              Download
                            </button>
                          </>
                        ) : null}

                        {canManage && document.status === "active" ? (
                          <>
                            <button
                              className="button secondary small"
                              type="button"
                              disabled={submitting}
                              onClick={() => beginEdit(document)}
                            >
                              Edit
                            </button>                            <label className="private-document-replace">
                              <span>Replacement file</span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                onChange={(event) =>
                                  setReplacementFiles((current) => ({
                                    ...current,
                                    [document.id]: event.target.files?.[0] ?? null,
                                  }))
                                }
                              />
                            </label>
                            <button
                              className="button secondary small"
                              type="button"
                              disabled={submitting}
                              onClick={() => handleReplace(document)}
                            >
                              Replace
                            </button>
                            <button
                              className="button danger small"
                              type="button"
                              disabled={submitting}
                              onClick={() => handleDelete(document)}
                            >
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="pagination-row">
          <span>
            Page {meta.page} of {meta.totalPages || 1} ({meta.total} records)
          </span>
          <div>
            <button
              className="button secondary small"
              type="button"
              disabled={meta.page <= 1 || loading}
              onClick={() => handlePageChange(-1)}
            >
              Previous
            </button>
            <button
              className="button secondary small"
              type="button"
              disabled={meta.totalPages === 0 || meta.page >= meta.totalPages || loading}
              onClick={() => handlePageChange(1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};