import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  listLocations,
  updateLocationStatus,
} from "../../../api/locations.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import {
  getLocationLevelLabel,
  getLocationStatusLabel,
  locationLevelOptions,
  locationStatuses,
  locationStatusOptions,
} from "../../../utils/locationOptions";
import { permissions } from "../../../utils/propertyOptions";

const DEFAULT_META = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

const DEFAULT_FILTERS = {
  search: "",
  level: "",
  status: "",
};

const getLocationActionErrorMessage = (error) => {
  if (error.response?.data?.code === "LOCATION_HAS_ACTIVE_CHILDREN") {
    return "Cannot deactivate this location while it has active child locations.";
  }

  return getErrorMessage(error);
};

export const LocationListPage = () => {
  const [locations, setLocations] = useState([]);
  const [meta, setMeta] = useState(DEFAULT_META);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState(DEFAULT_FILTERS);

  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [statusUpdatingId, setStatusUpdatingId] =
    useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    const params = {
      page,
      limit: 20,
    };

    if (appliedFilters.search) {
      params.search = appliedFilters.search;
    }

    if (appliedFilters.level) {
      params.level = appliedFilters.level;
    }

    if (appliedFilters.status) {
      params.status = appliedFilters.status;
    }

    listLocations(params)
      .then((response) => {
        if (ignore) {
          return;
        }

        setLocations(response.data ?? []);
        setMeta(response.meta ?? DEFAULT_META);
      })
      .catch((requestError) => {
        if (ignore) {
          return;
        }

        setLocations([]);
        setMeta(DEFAULT_META);
        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [appliedFilters, page, refreshKey]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");
    setPage(1);

    setAppliedFilters({
      search: filters.search.trim(),
      level: filters.level,
      status: filters.status,
    });
  };

  const handleReset = () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleStatusChange = async (location) => {
    const nextStatus =
      location.status === locationStatuses.active
        ? locationStatuses.inactive
        : locationStatuses.active;

    setStatusUpdatingId(location.id);
    setError("");
    setSuccess("");

    try {
      await updateLocationStatus(location.id, nextStatus);

      setSuccess(
        `${location.name} is now ${getLocationStatusLabel(
          nextStatus,
        ).toLowerCase()}.`,
      );

      setLoading(true);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(getLocationActionErrorMessage(requestError));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handlePreviousPage = () => {
    setLoading(true);
    setError("");

    setPage((current) =>
      Math.max(1, current - 1),
    );
  };

  const handleNextPage = () => {
    setLoading(true);
    setError("");

    setPage((current) =>
      Math.min(meta.totalPages, current + 1),
    );
  };


  return (
    <div className="stack">
      <div className="row-between">
        <div className="page-heading">
          <p className="eyebrow">Location Catalog</p>

          <h1>Locations</h1>

          <p className="muted">
            Manage the Province, District, City, and Area hierarchy
            used by LANDZO Properties.
          </p>
        </div>

        <PermissionGate
          permission={permissions.locationManage}
        >
          <Link
            className="button primary"
            to="/admin/locations/new"
          >
            Add Location
          </Link>
        </PermissionGate>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Search & Filter</h2>
          </div>

          <span>{meta.total} locations</span>
        </div>

        <form
          className="filters"
          onSubmit={handleSubmit}
        >
          <label className="field">
            <span>Search</span>

            <input
              name="search"
              type="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search location name"
            />
          </label>

          <label className="field">
            <span>Level</span>

            <select
              name="level"
              value={filters.level}
              onChange={handleFilterChange}
            >
              <option value="">
                All levels
              </option>

              {locationLevelOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Status</span>

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">
                All statuses
              </option>

              {locationStatusOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="field align-end">
            <div className="form-actions">
              <button
                className="button primary"
                type="submit"
              >
                Apply
              </button>

              <button
                className="button secondary"
                type="button"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </section>

      {error ? (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          className="alert alert-success"
          role="status"
        >
          {success}
        </div>
      ) : null}

      <section className="panel table-panel">
        <div className="section-heading">
          <div>
            <h2>Location Catalog</h2>

            <p className="muted">
              Canonical locations used throughout Property
              management.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading locations...
          </div>
        ) : locations.length === 0 ? (
          <div className="empty-state">
            No locations match the selected filters.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Level</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Sort Order</th>
                  <th>Slug</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {locations.map((location) => {
                  const isActive =
                    location.status ===
                    locationStatuses.active;

                  const isUpdating =
                    statusUpdatingId ===
                    location.id;

                  return (
                    <tr key={location.id}>
                      <td>
                        <strong>
                          {location.name}
                        </strong>
                      </td>

                      <td>
                        {getLocationLevelLabel(
                          location.level,
                        )}
                      </td>

                      <td>
                        {location.parent?.name ? (
                          <div>
                            <strong>
                              {location.parent.name}
                            </strong>

                            <div className="muted">
                              {getLocationLevelLabel(
                                location.parent.level,
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="muted">
                            -
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="status-badge">
                          {getLocationStatusLabel(
                            location.status,
                          )}
                        </span>
                      </td>

                      <td>
                        {location.sortOrder}
                      </td>

                      <td>
                        <span className="muted">
                          {location.slug}
                        </span>
                      </td>

                      <td>
                        {location.updatedAt
                          ? new Date(
                              location.updatedAt,
                            ).toLocaleString()
                          : "-"}
                      </td>

                      <td>
                        <PermissionGate
                          permission={
                            permissions.locationManage
                          }
                        >
                          <div className="action-cell">
                            <Link
                              className="button secondary small"
                              to={`/admin/locations/${location.id}/edit`}
                            >
                              Edit
                            </Link>

                            <button
                              className={`button small ${
                                isActive
                                  ? "danger"
                                  : "secondary"
                              }`}
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                handleStatusChange(
                                  location,
                                )
                              }
                            >
                              {isUpdating
                                ? "Updating..."
                                : isActive
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          </div>
                        </PermissionGate>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && meta.totalPages > 1 ? (
          <div className="pagination">
            <button
              className="button secondary small"
              type="button"
              disabled={page <= 1}
              onClick={handlePreviousPage}
            >
              Previous
            </button>

            <span className="muted">
              Page {meta.page} of{" "}
              {meta.totalPages}
            </span>

            <button
              className="button secondary small"
              type="button"
              disabled={
                page >= meta.totalPages
              }
              onClick={handleNextPage}
            >
              Next
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
};







