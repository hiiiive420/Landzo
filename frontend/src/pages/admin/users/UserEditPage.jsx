import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";

import { getErrorMessage } from "../../../api/apiClient";
import {
  getUser,
  resetUserPassword,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from "../../../api/users.api";
import { Alert } from "../../../components/common/Alert";
import { formatDateTime } from "../../../utils/formatters";
import { staffStatusOptions } from "../../../utils/userOptions";
import { UserForm } from "./UserForm";
import { useRoleOptions } from "./useRoleOptions";

const friendlyUserErrors = {
  EMAIL_ALREADY_IN_USE: "A staff account already uses this email.",
  LAST_ACTIVE_OWNER: "LANDZO must retain at least one active Owner.",
  SELF_DISABLE_BLOCKED: "Staff users cannot disable their own active account.",
  OWNER_ACTION_REQUIRED: "This Owner account action requires another eligible Owner.",
};

const getUserActionErrorMessage = (error) => {
  const code = error.response?.data?.code;
  return friendlyUserErrors[code] || getErrorMessage(error);
};

const profileFromUser = (user) => ({
  fullName: user.fullName ?? "",
  email: user.email ?? "",
  phone: user.phone ?? "",
  role: user.role,
});

const profilePayload = (form) => ({
  fullName: form.fullName.trim(),
  email: form.email.trim(),
  phone: form.phone.trim() || null,
});

export const UserEditPage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const roleOptions = useRoleOptions();
  const [user, setUser] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isViewingSelf = currentUser?.id === userId;

  const applyUser = (nextUser) => {
    setUser(nextUser);
    setProfileForm(profileFromUser(nextUser));
    setRole(nextUser.role);
    setStatus(nextUser.status);
  };

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const loaded = await getUser(userId);
        if (active) {
          applyUser(loaded);
        }
      } catch (loadError) {
        if (active) {
          setError(getUserActionErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, [userId]);

  const runAction = async ({ key, action, successMessage }) => {
    setSubmitting(key);
    setError("");
    setNotice("");

    try {
      const updated = await action();
      applyUser(updated);
      setNotice(successMessage);
      return updated;
    } catch (actionError) {
      setError(getUserActionErrorMessage(actionError));
      return null;
    } finally {
      setSubmitting("");
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    await runAction({
      key: "profile",
      action: () => updateUser(userId, profilePayload(profileForm)),
      successMessage: "Staff profile updated",
    });
  };

  const handleRoleSubmit = async (event) => {
    event.preventDefault();
    await runAction({
      key: "role",
      action: () => updateUserRole(userId, role),
      successMessage: "Staff role updated",
    });
  };

  const handleStatusSubmit = async (event) => {
    event.preventDefault();
    await runAction({
      key: "status",
      action: () => updateUserStatus(userId, status),
      successMessage: "Staff status updated",
    });
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match.");
      setNotice("");
      return;
    }

    const updated = await runAction({
      key: "password",
      action: () => resetUserPassword(userId, newPassword),
      successMessage: "Staff password reset",
    });

    if (updated) {
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="stack">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Management</p>
          <h1>{user?.fullName || "Staff User"}</h1>
          {user ? <p className="muted">{user.email}</p> : null}
        </div>

        <Link className="button secondary" to="/admin/users">
          Back to Users
        </Link>
      </section>

      <Alert tone="danger">{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      {loading ? (
        <section className="panel"><div className="empty-state">Loading staff user...</div></section>
      ) : !user || !profileForm ? (
        <section className="panel"><div className="empty-state">Staff user could not be loaded.</div></section>
      ) : (
        <>
          <UserForm
            value={profileForm}
            onChange={setProfileForm}
            roleOptions={roleOptions}
            showRole={false}
            submitting={submitting === "profile"}
            submitLabel="Save Profile"
            onSubmit={handleProfileSubmit}
          />

          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Access Role</h2>
                <p className="muted">Role changes use the dedicated backend role endpoint.</p>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleRoleSubmit}>
              <label className="field">
                <span>Role</span>
                <select value={role} onChange={(event) => setRole(event.target.value)} required>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="field align-end">
                <button className="button secondary" type="submit" disabled={submitting === "role"}>
                  {submitting === "role" ? "Updating..." : "Update Role"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Status</h2>
                <p className="muted">Disabling staff revokes active sessions through the backend.</p>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleStatusSubmit}>
              <label className="field">
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)} required>
                  {staffStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="field align-end">
                <button className="button secondary" type="submit" disabled={submitting === "status"}>
                  {submitting === "status" ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </section>

          {isViewingSelf ? (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Password Reset</h2>
                  <p className="muted">Use My Account to change your own password.</p>
                </div>
              </div>

              <Link className="button secondary" to="/admin/account">
                Go to My Account
              </Link>
            </section>
          ) : (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Password Reset</h2>
                  <p className="muted">Set a new staff password. Existing passwords are never displayed.</p>
                </div>
              </div>

              <form className="form-grid" onSubmit={handlePasswordSubmit}>
                <label className="field">
                  <span>New password</span>
                  <input
                    type="password"
                    minLength={12}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    minLength={12}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>

                <div className="field align-end">
                  <button className="button secondary" type="submit" disabled={submitting === "password"}>
                    {submitting === "password" ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Account Metadata</h2>
              </div>
            </div>

            <div className="form-grid">
              <div className="field"><span>Created</span><input value={formatDateTime(user.createdAt)} readOnly /></div>
              <div className="field"><span>Updated</span><input value={formatDateTime(user.updatedAt)} readOnly /></div>
              <div className="field"><span>Last login</span><input value={formatDateTime(user.lastLogin)} readOnly /></div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

