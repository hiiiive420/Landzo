import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { listSiteVisits } from "../../../api/siteVisits.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { Alert } from "../../../components/common/Alert";
import { EmptyState } from "../../../components/common/EmptyState";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatters";
import { permissions } from "../../../utils/propertyOptions";
import { getSiteVisitStatusLabel, siteVisitStatusOptions } from "../../../utils/siteVisitOptions";

const DEFAULT_META = { page: 1, limit: 20, total: 0, totalPages: 0 };
const DEFAULT_FILTERS = { search: "", status: "", dateFrom: "", dateTo: "" };

export const SiteVisitListPage = () => {
  const [siteVisits, setSiteVisits] = useState([]);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    const params = { page, limit: 20 };

    if (appliedFilters.search) params.search = appliedFilters.search;
    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.dateFrom) params.dateFrom = appliedFilters.dateFrom;
    if (appliedFilters.dateTo) params.dateTo = appliedFilters.dateTo;

    listSiteVisits(params)
      .then((response) => {
        if (!ignore) {
          setSiteVisits(response.data ?? []);
          setMeta(response.meta ?? DEFAULT_META);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setSiteVisits([]);
          setMeta(DEFAULT_META);
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [appliedFilters, page]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPage(1);
    setAppliedFilters({ ...filters, search: filters.search.trim() });
  };

  const handleReset = () => {
    setLoading(true);
    setError("");
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  return (
    <div className="stack">
      <div className="row-between">
        <div className="page-heading">
          <p className="eyebrow">Customer Operations</p>
          <h1>Site Visits</h1>
          <p className="muted">Track upcoming and completed property inspection appointments.</p>
        </div>
        <PermissionGate permission={permissions.siteVisitManage}>
          <Link className="button primary" to="/admin/site-visits/new">Schedule Visit</Link>
        </PermissionGate>
      </div>

      <section className="panel">
        <div className="section-heading"><h2>Search & Filter</h2><span>{meta.total} visits</span></div>
        <form className="filters" onSubmit={handleSubmit}>
          <label className="field"><span>Search</span><input name="search" type="search" value={filters.search} onChange={handleFilterChange} placeholder="Visitor name, email, or phone" /></label>
          <label className="field"><span>Status</span><select name="status" value={filters.status} onChange={handleFilterChange}><option value="">All statuses</option>{siteVisitStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="field"><span>From</span><input name="dateFrom" type="date" value={filters.dateFrom} onChange={handleFilterChange} /></label>
          <label className="field"><span>To</span><input name="dateTo" type="date" value={filters.dateTo} onChange={handleFilterChange} /></label>
          <div className="field align-end"><div className="form-actions"><button className="button primary" type="submit">Apply</button><button className="button secondary" type="button" onClick={handleReset}>Reset</button></div></div>
        </form>
      </section>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="panel table-panel">
        <div className="section-heading"><h2>Visit Schedule</h2></div>
        {loading ? (
          <EmptyState title="Loading site visits..." />
        ) : siteVisits.length === 0 ? (
          <EmptyState title="No site visits match the selected filters." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date / Time</th><th>Visitor</th><th>Property</th><th>Status</th><th>Assigned Staff</th><th>Actions</th></tr></thead>
              <tbody>
                {siteVisits.map((visit) => (
                  <tr key={visit.id}>
                    <td>{formatDateTime(visit.scheduledAt)}</td>
                    <td><strong>{visit.visitorName}</strong><div className="muted">{visit.visitorEmail ?? visit.visitorPhone ?? "-"}</div></td>
                    <td>{visit.property ? <><strong>{visit.property.code}</strong><div className="muted">{visit.property.title}</div></> : "-"}</td>
                    <td><StatusBadge>{getSiteVisitStatusLabel(visit.status)}</StatusBadge></td>
                    <td>{visit.assignedTo?.fullName ?? <span className="muted">Unassigned</span>}</td>
                    <td><Link className="button secondary small" to={`/admin/site-visits/${visit.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && meta.totalPages > 1 ? <div className="pagination"><button className="button secondary small" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span className="muted">Page {meta.page} of {meta.totalPages}</span><button className="button secondary small" type="button" disabled={page >= meta.totalPages} onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}>Next</button></div> : null}
      </section>
    </div>
  );
};