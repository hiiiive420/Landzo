import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { listCustomers } from "../../../api/customers.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { Alert } from "../../../components/common/Alert";
import { EmptyState } from "../../../components/common/EmptyState";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatters";
import { permissions } from "../../../utils/propertyOptions";
import { customerStatusOptions, customerTypeOptions, getCustomerStatusLabel, getCustomerTypeLabel } from "../../../utils/customerOptions";

const DEFAULT_META = { page: 1, limit: 20, total: 0, totalPages: 0 };
const DEFAULT_FILTERS = { search: "", type: "", status: "" };

export const CustomerListPage = () => {
  const [customers, setCustomers] = useState([]);
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
    if (appliedFilters.type) params.type = appliedFilters.type;
    if (appliedFilters.status) params.status = appliedFilters.status;

    listCustomers(params)
      .then((response) => {
        if (!ignore) {
          setCustomers(response.data ?? []);
          setMeta(response.meta ?? DEFAULT_META);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setCustomers([]);
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
          <h1>Customers / Leads</h1>
          <p className="muted">Manage reusable customer and lead contacts for follow-up workflows.</p>
        </div>
        <PermissionGate permission={permissions.customerManage}>
          <Link className="button primary" to="/admin/customers/new">Add Lead / Customer</Link>
        </PermissionGate>
      </div>

      <section className="panel">
        <div className="section-heading">
          <h2>Search & Filter</h2>
          <span>{meta.total} records</span>
        </div>
        <form className="filters" onSubmit={handleSubmit}>
          <label className="field">
            <span>Search</span>
            <input name="search" type="search" value={filters.search} onChange={handleFilterChange} placeholder="Name, email, or phone" />
          </label>
          <label className="field">
            <span>Type</span>
            <select name="type" value={filters.type} onChange={handleFilterChange}>
              <option value="">All types</option>
              {customerTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All statuses</option>
              {customerStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="field align-end">
            <div className="form-actions">
              <button className="button primary" type="submit">Apply</button>
              <button className="button secondary" type="button" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </form>
      </section>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="panel table-panel">
        <div className="section-heading">
          <h2>CRM Contacts</h2>
        </div>
        {loading ? (
          <EmptyState title="Loading customers..." />
        ) : customers.length === 0 ? (
          <EmptyState title="No customers or leads match the selected filters." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Source</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td><strong>{customer.fullName}</strong></td>
                    <td>
                      <div className="stack compact-stack">
                        {customer.email ? <span>{customer.email}</span> : null}
                        {customer.phone ? <span className="muted">{customer.phone}</span> : null}
                      </div>
                    </td>
                    <td>{getCustomerTypeLabel(customer.type)}</td>
                    <td><StatusBadge>{getCustomerStatusLabel(customer.status)}</StatusBadge></td>
                    <td>{customer.assignedTo?.fullName ?? <span className="muted">Unassigned</span>}</td>
                    <td>{customer.sourceEnquiry ? "Enquiry" : "Manual"}</td>
                    <td>{formatDateTime(customer.updatedAt)}</td>
                    <td><Link className="button secondary small" to={`/admin/customers/${customer.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && meta.totalPages > 1 ? (
          <div className="pagination">
            <button className="button secondary small" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span className="muted">Page {meta.page} of {meta.totalPages}</span>
            <button className="button secondary small" type="button" disabled={page >= meta.totalPages} onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}>Next</button>
          </div>
        ) : null}
      </section>
    </div>
  );
};