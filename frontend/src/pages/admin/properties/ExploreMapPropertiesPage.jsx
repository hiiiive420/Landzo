import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  listProperties,
  setPropertyExploreMap,
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
  scope: "enabled",
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

const getEligibility = (property) => {
  if (!property.isPublic) {
    return {
      eligible: false,
      label: "Publish first",
      reason: "Property must be public before it can appear on Explore Map.",
    };
  }

  if (!property.hasMap) {
    return {
      eligible: false,
      label: "Exact pin missing",
      reason: "Add an exact Property map location from Property Edit first.",
    };
  }

  return {
    eligible: true,
    label: "Eligible",
    reason: "",
  };
};

export const ExploreMapPropertiesPage = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [properties, setProperties] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyPropertyId, setBusyPropertyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useMemo(() => {
    const params = {
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort,
    };

    if (filters.search) {
      params.search = filters.search;
    }

    if (filters.type) {
      params.type = filters.type;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.scope === "enabled") {
      params.exploreMapEnabled = "true";
    }

    if (filters.scope === "eligible") {
      params.exploreMapEnabled = "false";
      params.isPublic = "true";
      params.hasMap = "true";
    }

    return params;
  }, [filters]);

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

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };

  const handleExploreMapChange = async (
    property,
    exploreMapEnabled,
  ) => {
    setError("");
    setNotice("");
    setBusyPropertyId(property.id);

    try {
      await setPropertyExploreMap(
        property.id,
        exploreMapEnabled,
      );

      setNotice(
        exploreMapEnabled
          ? `${property.code} added to Explore Map`
          : `${property.code} removed from Explore Map`,
      );

      setRefreshKey((current) => current + 1);
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setBusyPropertyId("");
    }
  };

  const emptyTitle =
    filters.scope === "enabled"
      ? "No Explore Map properties found"
      : filters.scope === "eligible"
        ? "No eligible properties found"
        : "No properties found";

  return (
    <div className="stack">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Properties</p>
          <h1>Explore Map</h1>

          <p className="muted">
            Control which public properties appear on the
            LANDZO Explore Map. Property coordinates can only
            be changed from Property Edit.
          </p>
        </div>

        <div className="form-actions">
          <Link
            className="button secondary"
            to="/admin/properties"
          >
            All Properties
          </Link>
        </div>
      </section>

      <Alert tone="danger">{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <section className="panel filters">
        <input
          placeholder="Search code, title or address"
          value={filters.search}
          onChange={(event) =>
            updateFilter("search", event.target.value)
          }
        />

        <select
          value={filters.scope}
          onChange={(event) =>
            updateFilter("scope", event.target.value)
          }
        >
          <option value="enabled">On Explore Map</option>
          <option value="eligible">Eligible to add</option>
          <option value="all">All properties</option>
        </select>

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
          <option value="updated_desc">
            Recently updated
          </option>
          <option value="updated_asc">
            Least recently updated
          </option>
          <option value="code_asc">Code A-Z</option>
          <option value="code_desc">Code Z-A</option>
        </select>
      </section>

      <section className="panel table-panel">
        {loading ? <p>Loading properties...</p> : null}

        {!loading && !properties.length ? (
          <EmptyState title={emptyTitle} />
        ) : null}

        {!loading && properties.length ? (
          <div className="table-wrap">
            <table className="property-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Cover</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Public</th>
                  <th>Exact Pin</th>
                  <th>Explore Map</th>
                  <th>Eligibility</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {properties.map((property) => {
                  const eligibility =
                    getEligibility(property);

                  const isBusy =
                    busyPropertyId === property.id;

                  return (
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

                      <td>
                        {formatLabel(property.type)}
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
                        {property.isPublic ? "Yes" : "No"}
                      </td>

                      <td>
                        {property.hasMap
                          ? "Available"
                          : "Missing"}
                      </td>

                      <td>
                        {property.exploreMapEnabled ? (
                          <StatusBadge>
                            Enabled
                          </StatusBadge>
                        ) : (
                          "No"
                        )}
                      </td>

                      <td>
                        {property.exploreMapEnabled ? (
                          "Active"
                        ) : eligibility.eligible ? (
                          "Eligible"
                        ) : (
                          <span
                            title={eligibility.reason}
                          >
                            {eligibility.label}
                          </span>
                        )}
                      </td>

                      <td>
                        {formatDateTime(property.updatedAt)}
                      </td>

                      <td className="action-cell property-actions">
                        <PermissionGate
                          permission={
                            permissions.propertyPublish
                          }
                        >
                          {property.exploreMapEnabled ? (
                            <button
                              className="button secondary"
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleExploreMapChange(
                                  property,
                                  false,
                                )
                              }
                            >
                              {isBusy
                                ? "Updating..."
                                : "Remove"}
                            </button>
                          ) : (
                            <button
                              className="button primary"
                              type="button"
                              disabled={
                                isBusy ||
                                !eligibility.eligible
                              }
                              title={
                                eligibility.eligible
                                  ? "Add property to Explore Map"
                                  : eligibility.reason
                              }
                              onClick={() =>
                                handleExploreMapChange(
                                  property,
                                  true,
                                )
                              }
                            >
                              {isBusy
                                ? "Updating..."
                                : eligibility.eligible
                                  ? "Enable"
                                  : eligibility.label}
                            </button>
                          )}
                        </PermissionGate>

                        <PermissionGate
                          permission={
                            permissions.propertyEdit
                          }
                        >
                          <Link
                            aria-label="Edit property"
                            className="icon-button icon-button-green"
                            title={
                              property.hasMap
                                ? "Edit property"
                                : "Edit property to add exact pin"
                            }
                            to={`/admin/properties/${property.id}/edit`}
                          >
                            <EditIcon />
                          </Link>
                        </PermissionGate>
                      </td>
                    </tr>
                  );
                })}
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
          Page {meta.page} of{" "}
          {meta.totalPages || 1} - {meta.total} total
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