import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  duplicateProperty,
  listProperties,
  trashProperty,
} from "../../../api/properties.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { Alert } from "../../../components/common/Alert";
import { EmptyState } from "../../../components/common/EmptyState";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { formatDateTime, formatLabel, formatLocation, formatPricing } from "../../../utils/formatters";
import { permissions, propertyStatuses, propertyTypes, transactionTypes } from "../../../utils/propertyOptions";

const defaultFilters = {
  search: "",
  type: "",
  transactionType: "",
  status: "",
  page: 1,
  limit: 20,
  sort: "newest",
};

const EditIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 20h4.6L19.2 9.4l-4.6-4.6L4 15.4V20z" />
    <path d="m13.4 6 4.6 4.6" />
  </svg>
);

const CopyIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <rect x="8" y="8" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
  </svg>
);

const TrashIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 15h10l1-15" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

export const PropertyListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
    [filters],
  );

  useEffect(() => {
    let active = true;

    const loadProperties = async () => {
      await Promise.resolve();
      if (active) {
        setLoading(true);
        setError("");
      }

      try {
        const response = await listProperties(query);
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

    loadProperties();

    return () => {
      active = false;
    };
  }, [query, refreshKey]);

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value, page: 1 }));

  const handleDuplicate = async (propertyId) => {
    setError("");
    setNotice("");

    try {
      const duplicate = await duplicateProperty(propertyId);
      setNotice(`Created ${duplicate.code}`);
      navigate(`/admin/properties/${duplicate.id}/edit`);
    } catch (duplicateError) {
      setError(getErrorMessage(duplicateError));
    }
  };


  const handleTrash = async (property) => {
  const confirmed = window.confirm(
    `Move ${property.code} to Trash?\n\nIt can be restored for 5 days before permanent deletion.`,
  );

  if (!confirmed) {
    return;
  }

  setError("");
  setNotice("");

  try {
    await trashProperty(property.id);
    setNotice(`${property.code} moved to Trash`);
    setRefreshKey((current) => current + 1);
  } catch (trashError) {
    setError(getErrorMessage(trashError));
  }
};
 return (
  <div className="stack">
    <section className="page-heading row-between">
      <div>
        <p className="eyebrow">Admin</p>
        <h1>Properties</h1>
      </div>

      <div className="form-actions">
        <Link
          className="button secondary"
          to="/admin/properties/trash"
        >
          Trash
        </Link>

        <PermissionGate permission={permissions.propertyCreate}>
          <Link
            className="button primary"
            to="/admin/properties/new"
          >
            New Draft
          </Link>
        </PermissionGate>
      </div>
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
        value={filters.transactionType}
        onChange={(event) =>
          updateFilter("transactionType", event.target.value)
        }
      >
        <option value="">All transactions</option>

        {transactionTypes.map((type) => (
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
      {loading ? <p>Loading properties...</p> : null}

      {!loading && !properties.length ? (
        <EmptyState title="No properties found" />
      ) : null}

      {!loading && properties.length ? (
        <div className="table-wrap">
          <table className="property-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Cover</th>
                <th>Title</th>
                <th>Type</th>
                <th>Transaction</th>
                <th>Status</th>
                <th>Location</th>
                <th>Pricing</th>
                <th>Public</th>
                <th>Explore</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {properties.map((property) => (
                <tr key={property.id}>
                  <td>{property.code}</td>

                  <td>
                    {property.coverImage?.url ? (
                      <img
                        src={property.coverImage.url}
                        alt=""
                        width="72"
                        height="48"
                        style={{
                          objectFit: "cover",
                          borderRadius: "6px",
                        }}
                      />
                    ) : (
                      "-"
                    )}
                  </td>

                  <td>{property.title}</td>

                  <td>{formatLabel(property.type)}</td>

                  <td>
                    {property.transactionTypes
                      .map(formatLabel)
                      .join(", ")}
                  </td>

                  <td>
                    <StatusBadge>
                      {formatLabel(property.status)}
                    </StatusBadge>
                  </td>

                  <td>
                    {formatLocation(property.location)}
                  </td>

                  <td>
                    {formatPricing(property.pricing)}
                  </td>

                  <td>
                    {property.isPublic ? "Yes" : "No"}
                  </td>

                  <td>
                    {property.exploreMapEnabled
                      ? "Yes"
                      : "No"}
                  </td>

                  <td>
                    {formatDateTime(property.updatedAt)}
                  </td>

                  <td className="action-cell property-actions">
                    <PermissionGate
                      permission={permissions.propertyEdit}
                    >
                      <Link
                        aria-label="Edit property"
                        className="icon-button icon-button-green"
                        title="Edit"
                        to={`/admin/properties/${property.id}/edit`}
                      >
                        <EditIcon />
                      </Link>
                    </PermissionGate>

                    <PermissionGate
                      permission={permissions.propertyCreate}
                    >
                      <button
                        aria-label="Duplicate property"
                        className="icon-button"
                        title="Duplicate"
                        type="button"
                        onClick={() =>
                          handleDuplicate(property.id)
                        }
                      >
                        <CopyIcon />
                      </button>
                    </PermissionGate>

                    <PermissionGate
                      permission={permissions.propertyDelete}
                    >
                      <button
                        aria-label="Move property to trash"
                        className="icon-button icon-button-danger"
                        title="Move to Trash"
                        type="button"
                        onClick={() =>
                          handleTrash(property)
                        }
                      >
                        <TrashIcon />
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

