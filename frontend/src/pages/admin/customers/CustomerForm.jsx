import { useEffect, useState } from "react";

import { getErrorMessage } from "../../../api/apiClient";
import { listCustomerAssignees } from "../../../api/customers.api";
import { Field } from "../../../components/forms/Field";
import { customerTypeOptions } from "../../../utils/customerOptions";

const INITIAL_FORM = {
  fullName: "",
  email: "",
  phone: "",
  type: "lead",
  assignedTo: "",
  notes: "",
};

export const CustomerForm = ({ initialCustomer = null, submitting = false, onSubmit, submitLabel }) => {
  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    fullName: initialCustomer?.fullName ?? "",
    email: initialCustomer?.email ?? "",
    phone: initialCustomer?.phone ?? "",
    type: initialCustomer?.type ?? "lead",
    assignedTo: initialCustomer?.assignedTo?.id ?? "",
    notes: initialCustomer?.notes ?? "",
  }));
  const [assignees, setAssignees] = useState([]);
  const [assigneeError, setAssigneeError] = useState("");

  useEffect(() => {
    let ignore = false;

    listCustomerAssignees()
      .then((staff) => {
        if (!ignore) {
          setAssignees(staff ?? []);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setAssigneeError(getErrorMessage(error));
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit({
      fullName: form.fullName.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      type: form.type,
      assignedTo: form.assignedTo || null,
      notes: form.notes.trim() || null,
    });
  };

  const typeOptions = initialCustomer?.type === "customer" ? customerTypeOptions.filter((option) => option.value === "customer") : customerTypeOptions;

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Customer Details</h2>
            <p className="muted">Keep reusable contact details separate from individual enquiries.</p>
          </div>
        </div>

        <div className="form-grid">
          <Field label="Full Name">
            <input name="fullName" value={form.fullName} onChange={handleChange} minLength={2} maxLength={120} required />
          </Field>

          <Field label="Email">
            <input name="email" type="email" value={form.email} onChange={handleChange} maxLength={254} />
          </Field>

          <Field label="Phone">
            <input name="phone" value={form.phone} onChange={handleChange} minLength={5} maxLength={40} />
          </Field>

          <Field label="Type">
            <select name="type" value={form.type} onChange={handleChange}>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assigned Staff">
            <select name="assignedTo" value={form.assignedTo} onChange={handleChange}>
              <option value="">Unassigned</option>
              {assignees.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.fullName}{staff.email ? ` - ${staff.email}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {assigneeError ? <div className="alert alert-info">Staff options could not be loaded: {assigneeError}</div> : null}
      </section>

      <section className="panel">
        <Field label="Notes">
          <textarea name="notes" value={form.notes} onChange={handleChange} maxLength={5000} rows={6} />
        </Field>
      </section>

      <div className="form-actions">
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};