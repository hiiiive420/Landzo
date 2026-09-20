import {
  useEffect,
  useState,
} from "react";

import {
  auditActionOptions,
  auditEntityTypeOptions,
  listAuditLogs,
} from "../../../api/auditLogs.api";
import {
  getErrorMessage,
} from "../../../api/apiClient";
import {
  Alert,
} from "../../../components/common/Alert";
import {
  EmptyState,
} from "../../../components/common/EmptyState";
import {
  formatDateTime,
} from "../../../utils/formatters";

const DEFAULT_LIMIT = 30;

const defaultFilters = {
  search: "",
  action: "",
  entityType: "",
  startDate: "",
  endDate: "",
};

const formatAction = (action) =>
  auditActionOptions.find(
    (option) => option.value === action,
  )?.label || action;

const formatEntityType = (entityType) =>
  auditEntityTypeOptions.find(
    (option) =>
      option.value === entityType,
  )?.label || entityType;

const buildParams = ({
  filters,
  page,
}) => {
  const params = {
    page,
    limit: DEFAULT_LIMIT,
  };

  if (filters.search) {
    params.search =
      filters.search.trim();
  }

  if (filters.action) {
    params.action =
      filters.action;
  }

  if (filters.entityType) {
    params.entityType =
      filters.entityType;
  }

  if (filters.startDate) {
    params.startDate =
      filters.startDate;
  }

  if (filters.endDate) {
    params.endDate =
      filters.endDate;
  }

  return params;
};

export const AuditLogsPage = () => {
  const [draftFilters, setDraftFilters] =
    useState(defaultFilters);

  const [filters, setFilters] =
    useState(defaultFilters);

  const [page, setPage] =
    useState(1);

  const [items, setItems] =
    useState([]);

  const [meta, setMeta] =
    useState({
      page: 1,
      limit: DEFAULT_LIMIT,
      total: 0,
      totalPages: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [requestKey, setRequestKey] =
    useState(0);

  useEffect(() => {
    let active = true;

    const loadAuditLogs = async () => {
      await Promise.resolve();

      if (active) {
        setLoading(true);
        setError("");
      }

      try {
        const result =
          await listAuditLogs(
            buildParams({
              filters,
              page,
            }),
          );

        if (active) {
          setItems(
            result.data || [],
          );

          setMeta(
            result.meta || {
              page,
              limit:
                DEFAULT_LIMIT,
              total: 0,
              totalPages: 0,
            },
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            getErrorMessage(
              loadError,
            ),
          );

          setItems([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAuditLogs();

    return () => {
      active = false;
    };
  }, [
    filters,
    page,
    requestKey,
  ]);

  const updateDraftFilter = (
    field,
    value,
  ) => {
    setDraftFilters(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  };

  const handleApplyFilters = (
    event,
  ) => {
    event.preventDefault();

    setFilters({
      ...draftFilters,
      search:
        draftFilters.search.trim(),
    });

    setPage(1);
  };

  const handleClearFilters = () => {
    setDraftFilters(
      defaultFilters,
    );

    setFilters(
      defaultFilters,
    );

    setPage(1);
  };

  const retry = () => {
    setRequestKey(
      (current) =>
        current + 1,
    );
  };

  const hasPrevious =
    page > 1;

  const hasNext =
    meta.totalPages > 0 &&
    page < meta.totalPages;

  return (
    <div className="stack audit-logs-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            Administration
          </p>

          <h1>Audit Logs</h1>

          <p className="muted">
            Read-only history of important administrative and business actions recorded by LANDZO.
          </p>
        </div>
      </section>

      <Alert tone="danger">
        {error}
      </Alert>

      <section className="panel">
        <form
          className="audit-log-filters"
          onSubmit={
            handleApplyFilters
          }
        >
          <label className="field audit-log-search-field">
            <span>Search</span>

            <input
              type="search"
              value={
                draftFilters.search
              }
              maxLength={120}
              placeholder="Search entity label"
              onChange={(event) =>
                updateDraftFilter(
                  "search",
                  event.target.value,
                )
              }
            />
          </label>

          <label className="field">
            <span>Action</span>

            <select
              value={
                draftFilters.action
              }
              onChange={(event) =>
                updateDraftFilter(
                  "action",
                  event.target.value,
                )
              }
            >
              <option value="">
                All actions
              </option>

              {auditActionOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="field">
            <span>
              Entity type
            </span>

            <select
              value={
                draftFilters.entityType
              }
              onChange={(event) =>
                updateDraftFilter(
                  "entityType",
                  event.target.value,
                )
              }
            >
              <option value="">
                All entities
              </option>

              {auditEntityTypeOptions.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="field">
            <span>From</span>

            <input
              type="date"
              value={
                draftFilters.startDate
              }
              onChange={(event) =>
                updateDraftFilter(
                  "startDate",
                  event.target.value,
                )
              }
            />
          </label>

          <label className="field">
            <span>To</span>

            <input
              type="date"
              value={
                draftFilters.endDate
              }
              onChange={(event) =>
                updateDraftFilter(
                  "endDate",
                  event.target.value,
                )
              }
            />
          </label>

          <div className="audit-log-filter-actions">
            <button
              className="button primary"
              type="submit"
            >
              Apply Filters
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={
                handleClearFilters
              }
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      {!loading && !error ? (
        <div className="audit-log-summary row-between">
          <p className="muted">
            {meta.total.toLocaleString(
              "en",
            )}{" "}
            recorded{" "}
            {meta.total === 1
              ? "action"
              : "actions"}
          </p>

          {meta.totalPages > 0 ? (
            <p className="muted">
              Page {meta.page} of{" "}
              {meta.totalPages}
            </p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <section className="panel">
          <p>
            Loading audit logs...
          </p>
        </section>
      ) : null}

      {!loading &&
      !error &&
      items.length === 0 ? (
        <section className="panel">
          <EmptyState title="No audit logs found">
            No recorded administrative actions match the current filters.
          </EmptyState>
        </section>
      ) : null}

      {!loading &&
      !error &&
      items.length > 0 ? (
        <section className="panel audit-log-panel">
          <div className="audit-log-table-wrap">
            <table className="audit-log-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Reference</th>
                </tr>
              </thead>

              <tbody>
                {items.map(
                  (item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="audit-log-date">
                          {formatDateTime(
                            item.createdAt,
                          )}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {item.actor
                            ?.fullName ||
                            "Unknown staff"}
                        </strong>
                      </td>

                      <td>
                        <span className="audit-log-action">
                          {formatAction(
                            item.action,
                          )}
                        </span>
                      </td>

                      <td>
                        {formatEntityType(
                          item.entityType,
                        )}
                      </td>

                      <td>
                        <strong>
                          {item.entityLabel ||
                            "—"}
                        </strong>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading &&
      !error &&
      meta.totalPages > 1 ? (
        <nav
          className="pagination row-between"
          aria-label="Audit log pagination"
        >
          <button
            className="button secondary"
            type="button"
            disabled={!hasPrevious}
            onClick={() =>
              setPage(
                (current) =>
                  current - 1,
              )
            }
          >
            Previous
          </button>

          <span className="muted">
            Page {meta.page} of{" "}
            {meta.totalPages}
          </span>

          <button
            className="button secondary"
            type="button"
            disabled={!hasNext}
            onClick={() =>
              setPage(
                (current) =>
                  current + 1,
              )
            }
          >
            Next
          </button>
        </nav>
      ) : null}

      {!loading && error ? (
        <div>
          <button
            className="button secondary"
            type="button"
            onClick={retry}
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
};