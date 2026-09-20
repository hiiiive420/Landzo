import { useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "../../../api/apiClient";
import {
  getPermissionCatalog,
  listRoles,
  updateRolePermissions,
} from "../../../api/roles.api";
import { staffRoles } from "../../../utils/userOptions";

const humanize = (value = "") =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getPermissionLabel = (permission) => {
  const [, action = permission] = permission.split(".");

  return humanize(action);
};

export const RolePermissionsPage = () => {
  const [roles, setRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState({});

  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [draftPermissions, setDraftPermissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.all([
      listRoles(),
      getPermissionCatalog(),
    ])
      .then(([roleResults, catalog]) => {
        if (ignore) {
          return;
        }

        const safeRoles = roleResults ?? [];
        const firstRole = safeRoles[0] ?? null;

        setRoles(safeRoles);
        setPermissionCatalog(catalog ?? {});

        if (firstRole) {
          setSelectedRoleKey(firstRole.key);
          setDraftPermissions(firstRole.permissions ?? []);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const selectedRole = useMemo(
    () =>
      roles.find((role) => role.key === selectedRoleKey) ??
      null,
    [roles, selectedRoleKey],
  );

  const isOwner =
    selectedRole?.key === staffRoles.owner;

  const hasChanges = useMemo(() => {
    if (!selectedRole || isOwner) {
      return false;
    }

    const original = [
      ...(selectedRole.permissions ?? []),
    ].sort();

    const draft = [...draftPermissions].sort();

    return (
      original.length !== draft.length ||
      original.some(
        (permission, index) =>
          permission !== draft[index],
      )
    );
  }, [
    draftPermissions,
    isOwner,
    selectedRole,
  ]);

  const handleRoleSelect = (role) => {
    setSelectedRoleKey(role.key);
    setDraftPermissions(role.permissions ?? []);
    setError("");
    setSuccess("");
  };

  const handlePermissionChange = (
    permission,
    checked,
  ) => {
    if (isOwner) {
      return;
    }

    setDraftPermissions((current) => {
      if (checked) {
        return current.includes(permission)
          ? current
          : [...current, permission];
      }

      return current.filter(
        (currentPermission) =>
          currentPermission !== permission,
      );
    });

    setSuccess("");
  };

  const handleSelectGroup = (
    permissions,
    checked,
  ) => {
    if (isOwner) {
      return;
    }

    setDraftPermissions((current) => {
      if (checked) {
        return [
          ...new Set([
            ...current,
            ...permissions,
          ]),
        ];
      }

      const groupPermissions = new Set(
        permissions,
      );

      return current.filter(
        (permission) =>
          !groupPermissions.has(permission),
      );
    });

    setSuccess("");
  };

  const handleReset = () => {
    if (!selectedRole) {
      return;
    }

    setDraftPermissions(
      selectedRole.permissions ?? [],
    );

    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (
      !selectedRole ||
      isOwner ||
      !hasChanges
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updatedRole =
        await updateRolePermissions(
          selectedRole.key,
          draftPermissions,
        );

      setRoles((current) =>
        current.map((role) =>
          role.key === updatedRole.key
            ? updatedRole
            : role,
        ),
      );

      setDraftPermissions(
        updatedRole.permissions ?? [],
      );

      setSuccess(
        `${updatedRole.name} permissions updated successfully.`,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty-state">
          Loading roles and permissions...
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-heading">
        <p className="eyebrow">
          Access Control
        </p>

        <h1>Roles & Permissions</h1>

        <p className="muted">
          Manage the capabilities assigned to
          LANDZO staff roles.
        </p>
      </div>

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

      <div className="role-permission-layout">
        <section className="panel role-list-panel">
          <div className="section-heading">
            <div>
              <h2>System Roles</h2>

              <p className="muted">
                Select a role to review its
                access.
              </p>
            </div>
          </div>

          <div className="role-list">
            {roles.map((role) => {
              const selected =
                role.key === selectedRoleKey;

              return (
                <button
                  key={role.key}
                  className={`role-list-item ${
                    selected ? "active" : ""
                  }`}
                  type="button"
                  onClick={() =>
                    handleRoleSelect(role)
                  }
                >
                  <span>
                    <strong>{role.name}</strong>

                    <small>
                      {role.permissions?.length ??
                        0}{" "}
                      permissions
                    </small>
                  </span>

                  {role.key ===
                  staffRoles.owner ? (
                    <span className="role-protected-badge">
                      Protected
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel">
          {!selectedRole ? (
            <div className="empty-state">
              Select a role to view its
              permissions.
            </div>
          ) : (
            <div className="stack">
              <div className="row-between">
                <div className="page-heading">
                  <p className="eyebrow">
                    {selectedRole.key}
                  </p>

                  <h2>{selectedRole.name}</h2>

                  <p className="muted">
                    {isOwner
                      ? "Owner / Super Admin always has every LANDZO permission and cannot be modified."
                      : "Choose the capabilities this role should have."}
                  </p>
                </div>

                {isOwner ? (
                  <span className="status-badge">
                    System Protected
                  </span>
                ) : null}
              </div>

              <div className="permission-groups">
                {Object.entries(
                  permissionCatalog,
                ).map(
                  ([
                    groupKey,
                    groupPermissions,
                  ]) => {
                    const allSelected =
                      groupPermissions.every(
                        (permission) =>
                          draftPermissions.includes(
                            permission,
                          ),
                      );

                    return (
                      <section
                        className="permission-group"
                        key={groupKey}
                      >
                        <div className="permission-group-heading">
                          <div>
                            <h3>
                              {humanize(groupKey)}
                            </h3>

                            <span className="muted">
                              {
                                groupPermissions.filter(
                                  (permission) =>
                                    draftPermissions.includes(
                                      permission,
                                    ),
                                ).length
                              }
                              {" / "}
                              {
                                groupPermissions.length
                              }{" "}
                              enabled
                            </span>
                          </div>

                          {!isOwner ? (
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={
                                  allSelected
                                }
                                onChange={(
                                  event,
                                ) =>
                                  handleSelectGroup(
                                    groupPermissions,
                                    event.target
                                      .checked,
                                  )
                                }
                              />

                              <span>
                                Select all
                              </span>
                            </label>
                          ) : null}
                        </div>

                        <div className="permission-list">
                          {groupPermissions.map(
                            (permission) => (
                              <label
                                className="permission-item"
                                key={permission}
                              >
                                <input
                                  type="checkbox"
                                  checked={draftPermissions.includes(
                                    permission,
                                  )}
                                  disabled={isOwner}
                                  onChange={(
                                    event,
                                  ) =>
                                    handlePermissionChange(
                                      permission,
                                      event.target
                                        .checked,
                                    )
                                  }
                                />

                                <span>
                                  <strong>
                                    {getPermissionLabel(
                                      permission,
                                    )}
                                  </strong>

                                  <small>
                                    {permission}
                                  </small>
                                </span>
                              </label>
                            ),
                          )}
                        </div>
                      </section>
                    );
                  },
                )}
              </div>

              {!isOwner ? (
                <div className="form-actions">
                  <button
                    className="button primary"
                    type="button"
                    disabled={
                      saving || !hasChanges
                    }
                    onClick={handleSave}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Permissions"}
                  </button>

                  <button
                    className="button secondary"
                    type="button"
                    disabled={
                      saving || !hasChanges
                    }
                    onClick={handleReset}
                  >
                    Reset
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};