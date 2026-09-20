import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { listUsers } from "../../../api/users.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { Alert } from "../../../components/common/Alert";
import { EmptyState } from "../../../components/common/EmptyState";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { formatDateTime, formatLabel } from "../../../utils/formatters";
import { permissions } from "../../../utils/propertyOptions";
import { staffStatusOptions } from "../../../utils/userOptions";
import { useRoleOptions } from "./useRoleOptions";

const defaultFilters = {
  search: "",
  role: "",
  status: "",
  page: 1,
  limit: 20,
};

export const UserListPage = () => {
  const roleOptions = useRoleOptions();
  const [filters, setFilters] = useState(defaultFilters);
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
    [filters],
  );

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      await Promise.resolve();
      if (active) {
        setLoading(true);
        setError("");
      }

      try {
        const response = await listUsers(query);
        if (active) {
          setUsers(response.data ?? []);
          setMeta(response.meta ?? { page: 1, totalPages: 1, total: 0 });
        }
      } catch (loadError) {
        if (active) {
          setUsers([]);
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      active = false;
    };
  }, [query]);

  const updateFilter = (field, value) =>
    setFilters((current) => ({ ...current, [field]: value, page: 1 }));

  return (
    <div className="stack">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Management</p>
          <h1>Users</h1>
          <p className="muted">Manage LANDZO staff accounts and access roles.</p>
        </div>

        <PermissionGate permission={permissions.userManage}>
          <Link className="button primary" to="/admin/users/new">
            Add Staff
          </Link>
        </PermissionGate>
      </section>

      <Alert tone="danger">{error}</Alert>

      <section className="panel filters">
        <input
          placeholder="Search name, email, or phone"
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
        />

        <select value={filters.role} onChange={(event) => updateFilter("role", event.target.value)}>
          <option value="">All roles</option>
          {roleOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="">All statuses</option>
          {staffStatusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </section>

      <section className="panel table-panel">
        {loading ? <p>Loading users...</p> : null}

        {!loading && !users.length ? <EmptyState title="No staff users found" /> : null}

        {!loading && users.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.fullName}</strong></td>
                    <td>{user.email}</td>
                    <td>{user.phone || "-"}</td>
                    <td>{formatLabel(user.role)}</td>
                    <td><StatusBadge>{formatLabel(user.status)}</StatusBadge></td>
                    <td>{formatDateTime(user.lastLogin)}</td>
                    <td>{formatDateTime(user.updatedAt)}</td>
                    <td className="action-cell">
                      <PermissionGate permission={permissions.userManage}>
                        <Link className="button secondary small" to={`/admin/users/${user.id}/edit`}>
                          Edit
                        </Link>
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
          onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
        >
          Previous
        </button>

        <span>
          Page {meta.page} of {meta.totalPages || 1} - {meta.total} total
        </span>

        <button
          className="button secondary"
          type="button"
          disabled={meta.page >= meta.totalPages}
          onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
        >
          Next
        </button>
      </div>
    </div>
  );
};
