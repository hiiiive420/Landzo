import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  listAssignableStaff,
  listEnquiries,
} from "../../../api/enquiries.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { useAuth } from "../../../auth/useAuth";
import {
  enquiryStatusOptions,
  getEnquirySourceLabel,
  getEnquiryStatusLabel,
} from "../../../utils/enquiryOptions";
import { permissions } from "../../../utils/propertyOptions";

const DEFAULT_META = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

const DEFAULT_FILTERS = {
  search: "",
  status: "",
  assignedTo: "",
};

export const EnquiryListPage = () => {
  const { hasPermission } = useAuth();

  const canAssign = hasPermission(
    permissions.enquiryAssign,
  );

  const [enquiries, setEnquiries] = useState([]);
  const [assignees, setAssignees] = useState([]);

  const [meta, setMeta] = useState(DEFAULT_META);

  const [filters, setFilters] = useState(
    DEFAULT_FILTERS,
  );

  const [appliedFilters, setAppliedFilters] =
    useState(DEFAULT_FILTERS);

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [assigneesLoading, setAssigneesLoading] =
    useState(canAssign);

  const [error, setError] = useState("");
  const [assigneeError, setAssigneeError] =
    useState("");

  useEffect(() => {
    let ignore = false;

    const params = {
      page,
      limit: 20,
    };

    if (appliedFilters.search) {
      params.search = appliedFilters.search;
    }

    if (appliedFilters.status) {
      params.status = appliedFilters.status;
    }

    if (
      canAssign &&
      appliedFilters.assignedTo
    ) {
      params.assignedTo =
        appliedFilters.assignedTo;
    }

    listEnquiries(params)
      .then((response) => {
        if (ignore) {
          return;
        }

        setEnquiries(response.data ?? []);
        setMeta(response.meta ?? DEFAULT_META);
      })
      .catch((requestError) => {
        if (ignore) {
          return;
        }

        setEnquiries([]);
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
  }, [appliedFilters, canAssign, page]);

  useEffect(() => {
    if (!canAssign) {
      return undefined;
    }

    let ignore = false;

    listAssignableStaff()
      .then((staff) => {
        if (!ignore) {
          setAssignees(staff ?? []);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setAssigneeError(
            getErrorMessage(requestError),
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setAssigneesLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [canAssign]);

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
    setPage(1);

    setAppliedFilters({
      search: filters.search.trim(),
      status: filters.status,
      assignedTo: canAssign
        ? filters.assignedTo
        : "",
    });
  };

  const handleReset = () => {
    setLoading(true);
    setError("");
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
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
          <p className="eyebrow">
            Customer Operations
          </p>

          <h1>Enquiries</h1>

          <p className="muted">
            Review incoming enquiries, linked
            properties, assignments, and follow-up
            progress.
          </p>
        </div>

        <PermissionGate
          permission={permissions.enquiryUpdate}
        >
          <Link
            className="button primary"
            to="/admin/enquiries/new"
          >
            Add Enquiry
          </Link>
        </PermissionGate>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Search & Filter</h2>
          </div>

          <span>{meta.total} enquiries</span>
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
              placeholder="Name, email, or phone"
            />
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

              {enquiryStatusOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>

          {canAssign ? (
            <label className="field">
              <span>Assigned Staff</span>

              <select
                name="assignedTo"
                value={filters.assignedTo}
                onChange={handleFilterChange}
                disabled={assigneesLoading}
              >
                <option value="">
                  {assigneesLoading
                    ? "Loading staff..."
                    : "All staff"}
                </option>

                {assignees.map((staff) => (
                  <option
                    key={staff.id}
                    value={staff.id}
                  >
                    {staff.fullName}
                    {staff.email
                      ? ` — ${staff.email}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

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

        {assigneeError ? (
          <div
            className="alert alert-info"
            role="status"
          >
            Staff filter could not be loaded:{" "}
            {assigneeError}
          </div>
        ) : null}
      </section>

      {error ? (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <section className="panel table-panel">
        <div className="section-heading">
          <div>
            <h2>Enquiry Inbox</h2>

            <p className="muted">
              Newest enquiries are shown first.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading enquiries...
          </div>
        ) : enquiries.length === 0 ? (
          <div className="empty-state">
            No enquiries match the selected
            filters.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Property</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td>
                      <strong>
                        {enquiry.fullName}
                      </strong>
                    </td>

                    <td>
                      <div className="stack compact-stack">
                        {enquiry.email ? (
                          <span>
                            {enquiry.email}
                          </span>
                        ) : null}

                        {enquiry.phone ? (
                          <span className="muted">
                            {enquiry.phone}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      {enquiry.property ? (
                        <div>
                          <strong>
                            {enquiry.property.code}
                          </strong>

                          <div className="muted">
                            {enquiry.property.title ??
                              "Linked Property"}
                          </div>
                        </div>
                      ) : (
                        <span className="muted">
                          General enquiry
                        </span>
                      )}
                    </td>

                    <td>
                      {getEnquirySourceLabel(
                        enquiry.source,
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge enquiry-status-${enquiry.status}`}
                      >
                        {getEnquiryStatusLabel(
                          enquiry.status,
                        )}
                      </span>
                    </td>

                    <td>
                      {enquiry.assignedTo ? (
                        <div>
                          <strong>
                            {
                              enquiry.assignedTo
                                .fullName
                            }
                          </strong>

                          <div className="muted">
                            {
                              enquiry.assignedTo
                                .email
                            }
                          </div>
                        </div>
                      ) : (
                        <span className="muted">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td>
                      {enquiry.createdAt
                        ? new Date(
                            enquiry.createdAt,
                          ).toLocaleString()
                        : "-"}
                    </td>

                    <td>
                      <div className="action-cell">
                        <Link
                          className="button secondary small"
                          to={`/admin/enquiries/${enquiry.id}`}
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
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