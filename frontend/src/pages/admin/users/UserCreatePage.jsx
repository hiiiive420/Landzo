import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { createUser } from "../../../api/users.api";
import { Alert } from "../../../components/common/Alert";
import { staffRoles } from "../../../utils/userOptions";
import { UserForm } from "./UserForm";
import { useRoleOptions } from "./useRoleOptions";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  role: staffRoles.admin,
  initialPassword: "",
};

const toPayload = (form) => ({
  fullName: form.fullName.trim(),
  email: form.email.trim(),
  phone: form.phone.trim() || null,
  role: form.role,
  initialPassword: form.initialPassword,
});

export const UserCreatePage = () => {
  const navigate = useNavigate();
  const roleOptions = useRoleOptions();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const user = await createUser(toPayload(form));
      navigate(`/admin/users/${user.id}/edit`, { replace: true });
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Management</p>
          <h1>Add Staff</h1>
        </div>

        <Link className="button secondary" to="/admin/users">
          Back to Users
        </Link>
      </section>

      <Alert tone="danger">{error}</Alert>

      <UserForm
        value={form}
        onChange={setForm}
        roleOptions={roleOptions}
        submitting={submitting}
        submitLabel="Create Staff"
        includePassword
        onSubmit={handleSubmit}
      />
    </div>
  );
};
