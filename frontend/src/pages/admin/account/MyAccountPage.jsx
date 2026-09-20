import { useState } from "react";

import { changeStaffPassword, updateCurrentStaffProfile } from "../../../api/auth.api";
import { getErrorMessage } from "../../../api/apiClient";
import { useAuth } from "../../../auth/useAuth";
import { Alert } from "../../../components/common/Alert";
import { Field } from "../../../components/forms/Field";
import { formatDateTime, formatLabel } from "../../../utils/formatters";

const profileFromUser = (user) => ({
  fullName: user?.fullName ?? "",
  phone: user?.phone ?? "",
});

export const MyAccountPage = () => {
  const { user, updateCurrentUser } = useAuth();
  const [profileForm, setProfileForm] = useState(() => profileFromUser(user));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSubmitting("profile");
    setError("");
    setNotice("");

    try {
      const response = await updateCurrentStaffProfile({
        fullName: profileForm.fullName.trim(),
        phone: profileForm.phone.trim() || null,
      });
      updateCurrentUser(response.user);
      setProfileForm(profileFromUser(response.user));
      setNotice("Profile updated successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting("");
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Password confirmation does not match.");
      setNotice("");
      return;
    }

    setSubmitting("password");
    setError("");
    setNotice("");

    try {
      await changeStaffPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setNotice("Password changed successfully. Please sign in again on other devices.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting("");
    }
  };

  return (
    <div className="stack">
      <section className="page-heading">
        <p className="eyebrow">My Account</p>
        <h1>My Account</h1>
        <p className="muted">Manage your LANDZO profile and password.</p>
      </section>

      <Alert tone="danger">{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Profile</h2>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleProfileSubmit}>
          <Field label="Full name">
            <input
              name="fullName"
              type="text"
              minLength={2}
              maxLength={120}
              required
              value={profileForm.fullName}
              onChange={handleProfileChange}
            />
          </Field>

          <Field label="Email">
            <input value={user?.email ?? ""} readOnly />
          </Field>

          <Field label="Phone">
            <input
              name="phone"
              type="tel"
              maxLength={30}
              value={profileForm.phone}
              onChange={handleProfileChange}
            />
          </Field>

          <div className="field align-end">
            <button className="button secondary" type="submit" disabled={submitting === "profile"}>
              {submitting === "profile" ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Security</h2>
          </div>
        </div>

        <form className="form-grid" onSubmit={handlePasswordSubmit}>
          <Field label="Current password">
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
            />
          </Field>

          <Field label="New password">
            <input
              name="newPassword"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
            />
          </Field>

          <Field label="Confirm new password">
            <input
              name="confirmPassword"
              type="password"
              minLength={12}
              maxLength={128}
              required
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
            />
          </Field>

          <div className="field align-end">
            <button className="button secondary" type="submit" disabled={submitting === "password"}>
              {submitting === "password" ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Account Information</h2>
          </div>
        </div>

        <div className="form-grid">
          <div className="field"><span>Role</span><input value={formatLabel(user?.role)} readOnly /></div>
          <div className="field"><span>Status</span><input value={formatLabel(user?.status)} readOnly /></div>
          <div className="field"><span>Last login</span><input value={formatDateTime(user?.lastLogin)} readOnly /></div>
        </div>
      </section>
    </div>
  );
};