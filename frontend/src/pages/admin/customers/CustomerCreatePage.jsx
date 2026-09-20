import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { createCustomer } from "../../../api/customers.api";
import { Alert } from "../../../components/common/Alert";
import { CustomerForm } from "./CustomerForm";

export const CustomerCreatePage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");

    try {
      const customer = await createCustomer(payload);
      navigate(`/admin/customers/${customer.id}`, { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <div className="row-between">
        <div className="page-heading">
          <p className="eyebrow">Customer Operations</p>
          <h1>Add Lead / Customer</h1>
          <p className="muted">Create a reusable CRM contact for ongoing property follow-up.</p>
        </div>
        <Link className="button secondary" to="/admin/customers">Back</Link>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <CustomerForm submitting={submitting} submitLabel="Create" onSubmit={handleSubmit} />
    </div>
  );
};