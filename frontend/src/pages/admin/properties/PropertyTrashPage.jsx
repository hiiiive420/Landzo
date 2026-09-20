import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  listTrashedProperties,
  restoreProperty,
} from "../../../api/properties.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { Alert } from "../../../components/common/Alert";
import { EmptyState } from "../../../components/common/EmptyState";
import { StatusBadge } from "../../../components/common/StatusBadge";
import {
  formatDateTime,
  formatLabel,
  formatLocation,
} from "../../../utils/formatters";
import {
  permissions,
  propertyStatuses,
  propertyTypes,
} from "../../../utils/propertyOptions";

const defaultFilters = {
  search: "",
  type: "",
  status: "",
  page: 1,
  limit: 20,
  sort: "newest",
};

const formatRemainingTime = (purgeAt) => {
  if (!purgeAt) {
    return "—";
  }

  const remaining = new Date(purgeAt).getTime() - Date.now();

  if (remaining <= 0) {
    return "Awaiting permanent deletion";
  }

  const totalHours = Math.ceil(remaining / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }

  return `${hours}h remaining`;
};

export const PropertyTrashPage = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const query = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ""),
      ),
    [filters],
  );

  useEffect(() => {
    let active = true;

    const loadTrash = async () => {
      await Promise.resolve();

      if (active) {
        setLoading(true);
        setError("");
      }

      try {
        const response = await listTrashedProperties(query);

        if (active) {
          setProperties(response.data);
          setMeta(response.meta);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTrash();

    return () => {
      active = false;
    };
  }, [query, refreshKey]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };

  const handleRestore = async (property) => {
    const confirmed = window.confirm(
      `Restore ${property.code}?\n\nThe property will remain unpublished after restoration.`,
    );

    if (!confirmed) {
      return;
    }

    setRestoringId(property.id);
    setError("");
    setNotice("");

    try {
      await restoreProperty(property.id);
      setNotice(`${property.code} restored`);
      setRefreshKey((current) => current + 1);
    } catch (restoreError) {
      setError(getErrorMessage(restoreError));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="stack">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Properties</p>
          <h1>Trash</h1>
          <p className="muted">
            Properties are permanently deleted 5 days after being moved to
            Trash.
          </p>
        </div>

        <Link
          className="button secondary"
          to="/admin/properties"
        >
          All Properties
        </Link>
      </section>

      <Alert tone="danger">{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <section className="panel filters">
        <input
          placeholder="Search code or title"
          value={filters.search}
          onChange={(event) =>
            updateFilter("search", event.target.value)
          }
        />

        <select
          value={filters.type}
          onChange={(event) =>
            updateFilter("type", event.target.value)
          }
        >
          <option value="">All types</option>

          {propertyTypes.map((type) => (
            <option
              key={type.value}
              value={type.value}
            >
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) =>
            updateFilter("status", event.target.value)
          }
        >
          <option value="">All statuses</option>

          {propertyStatuses.map((status) => (
            <option
              key={status.value}
              value={status.value}
            >
              {status.label}
            </option>
          ))}
        </select>

        <select
          value={filters.sort}
          onChange={(event) =>
            updateFilter("sort", event.target.value)
          }
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="updated_desc">Recently updated</option>
          <option value="updated_asc">Least recently updated</option>
          <option value="code_asc">Code A-Z</option>
          <option value="code_desc">Code Z-A</option>
        </select>
      </section>

      <section className="panel table-panel">
        {loading ? <p>Loading Trash...</p> : null}

        {!loading && !properties.length ? (
          <EmptyState title="Trash is empty" />
        ) : null}

        {!loading && properties.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Deleted</th>
                  <th>Permanent deletion</th>
                  <th>Time remaining</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td>{property.code}</td>

                    <td>{property.title}</td>

                    <td>{formatLabel(property.type)}</td>

                    <td>
                      <StatusBadge>
                        {formatLabel(property.status)}
                      </StatusBadge>
                    </td>

                    <td>
                      {formatLocation(property.location)}
                    </td>

                    <td>
                      {formatDateTime(property.deletedAt)}
                    </td>

                    <td>
                      {formatDateTime(property.purgeAt)}
                    </td>

                    <td>
                      {formatRemainingTime(property.purgeAt)}
                    </td>

                    <td className="action-cell">
                      <PermissionGate
                        permission={permissions.propertyDelete}
                      >
                        <button
                          className="button secondary small"
                          type="button"
                          disabled={restoringId === property.id}
                          onClick={() =>
                            handleRestore(property)
                          }
                        >
                          {restoringId === property.id
                            ? "Restoring..."
                            : "Restore"}
                        </button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className="pagination">
        <button
          className="button secondary"
          type="button"
          disabled={meta.page <= 1}
          onClick={() =>
            setFilters((current) => ({
              ...current,
              page: current.page - 1,
            }))
          }
        >
          Previous
        </button>

        <span>
          Page {meta.page} of {meta.totalPages || 1} -{" "}
          {meta.total} total
        </span>

        <button
          className="button secondary"
          type="button"
          disabled={meta.page >= meta.totalPages}
          onClick={() =>
            setFilters((current) => ({
              ...current,
              page: current.page + 1,
            }))
          }
        >
          Next
        </button>
      </div>
    </div>
  );
};