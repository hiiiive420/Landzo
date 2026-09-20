import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { getCustomer, updateCustomer } from "../../../api/customers.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { useAuth } from "../../../auth/useAuth";
import { Alert } from "../../../components/common/Alert";
import { formatDateTime } from "../../../utils/formatters";
import { permissions } from "../../../utils/propertyOptions";
import { getCustomerStatusLabel, getCustomerTypeLabel } from "../../../utils/customerOptions";
import { CustomerForm } from "./CustomerForm";

export const CustomerDetailPage = () => {
  const { customerId } = useParams();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(permissions.customerManage);
  const canScheduleVisit = hasPermission(permissions.siteVisitManage);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    getCustomer(customerId)
      .then((result) => {
        if (!ignore) setCustomer(result);
      })
      .catch((requestError) => {
        if (!ignore) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [customerId]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateCustomer(customerId, payload);
      setCustomer(updated);
      setEditing(false);
      setSuccess("Customer updated successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickUpdate = async (payload, message) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateCustomer(customerId, payload);
      setCustomer(updated);
      setSuccess(message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <section className="panel"><div className="empty-state">Loading customer...</div></section>;
  }

  if (!customer) {
    return <div className="stack">{error ? <Alert tone="danger">{error}</Alert> : null}<section className="panel"><div className="empty-state">Customer could not be loaded.</div></section></div>;
  }

  if (editing) {
    return (
      <div className="stack">
        <div className="row-between">
          <div className="page-heading">
            <p className="eyebrow">Customer Operations</p>
            <h1>Edit {customer.fullName}</h1>
          </div>
          <button className="button secondary" type="button" disabled={submitting} onClick={() => setEditing(false)}>Cancel</button>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <CustomerForm initialCustomer={customer} submitting={submitting} submitLabel="Save Changes" onSubmit={handleSubmit} />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div className="page-heading">
          <p className="eyebrow">Customer Operations</p>
          <h1>{customer.fullName}</h1>
         <p className="muted">
  {getCustomerTypeLabel(customer.type)} ·{" "}
  {getCustomerStatusLabel(customer.status)}
</p>
        </div>
        <div className="form-actions">
          <Link className="button secondary" to="/admin/customers">Back</Link>
          {canScheduleVisit ? <Link className="button secondary" to={`/admin/site-visits/new?customerId=${customer.id}`}>Schedule Site Visit</Link> : null}
          {canManage ? <button className="button secondary" type="button" onClick={() => setEditing(true)}>Edit</button> : null}
        </div>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <section className="panel">
        <div className="section-heading"><h2>Contact</h2></div>
        <div className="form-grid">
          <div className="field"><span>Email</span><strong>{customer.email ?? "-"}</strong></div>
          <div className="field"><span>Phone</span><strong>{customer.phone ?? "-"}</strong></div>
          <div className="field"><span>Assigned Staff</span><strong>{customer.assignedTo?.fullName ?? "Unassigned"}</strong></div>
          <div className="field"><span>Updated</span><strong>{formatDateTime(customer.updatedAt)}</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><h2>CRM State</h2></div>
        <div className="form-actions">
          <PermissionGate permission={permissions.customerManage}>
            {customer.type === "lead" ? <button className="button secondary" type="button" disabled={submitting} onClick={() => handleQuickUpdate({ type: "customer" }, "Lead promoted to customer.")}>Promote to Customer</button> : null}
            <button className="button secondary" type="button" disabled={submitting} onClick={() => handleQuickUpdate({ status: customer.status === "active" ? "inactive" : "active" }, "Customer status updated.")}>{customer.status === "active" ? "Inactivate" : "Reactivate"}</button>
          </PermissionGate>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><h2>Notes</h2></div>
        <p>{customer.notes || "No notes recorded."}</p>
      </section>

      {customer.sourceEnquiry ? (
        <section className="panel">
          <div className="section-heading"><h2>Source Enquiry</h2></div>
          <Link className="button secondary small" to={`/admin/enquiries/${customer.sourceEnquiry.id}`}>View Enquiry</Link>
        </section>
      ) : null}
    </div>
  );
};