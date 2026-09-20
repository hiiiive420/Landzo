import { useEffect, useState } from "react";

import { getErrorMessage } from "../../../api/apiClient";
import {
  listSiteVisitAssignees,
  listSiteVisitCustomerOptions,
  listSiteVisitPropertyOptions,
} from "../../../api/siteVisits.api";
import { Field } from "../../../components/forms/Field";

const toDateTimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value) => (value ? new Date(value).toISOString() : "");

export const SiteVisitForm = ({ initialSiteVisit = null, initialSource = "manual", initialCustomerId = "", initialEnquiryId = "", initialPropertyId = "", submitting = false, onSubmit, submitLabel }) => {
  const [form, setForm] = useState(() => ({
    propertyId: initialSiteVisit?.property?.id ?? initialPropertyId,
    scheduledAt: toDateTimeLocalValue(initialSiteVisit?.scheduledAt),
    source: initialCustomerId ? "customer" : initialEnquiryId ? "enquiry" : initialSource,
    customerId: initialSiteVisit?.customer?.id ?? initialCustomerId,
    enquiryId: initialSiteVisit?.enquiry?.id ?? initialEnquiryId,
    visitorName: initialSiteVisit?.visitorName ?? "",
    visitorEmail: initialSiteVisit?.visitorEmail ?? "",
    visitorPhone: initialSiteVisit?.visitorPhone ?? "",
    assignedTo: initialSiteVisit?.assignedTo?.id ?? "",
    notes: initialSiteVisit?.notes ?? "",
  }));
  const [propertySearch, setPropertySearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [properties, setProperties] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.all([
      listSiteVisitPropertyOptions({ limit: 50 }),
      listSiteVisitCustomerOptions({ limit: 50 }),
      listSiteVisitAssignees(),
    ])
      .then(([propertyOptions, customerOptions, staff]) => {
        if (!ignore) {
          setProperties(propertyOptions ?? []);
          setCustomers(customerOptions ?? []);
          setAssignees(staff ?? []);
        }
      })
      .catch((error) => {
        if (!ignore) setLookupError(getErrorMessage(error));
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handlePropertySearch = async () => {
    try {
      setProperties(await listSiteVisitPropertyOptions({ search: propertySearch.trim(), limit: 50 }));
    } catch (error) {
      setLookupError(getErrorMessage(error));
    }
  };

  const handleCustomerSearch = async () => {
    try {
      setCustomers(await listSiteVisitCustomerOptions({ search: customerSearch.trim(), limit: 50 }));
    } catch (error) {
      setLookupError(getErrorMessage(error));
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      if (name === "source") {
        return { ...current, source: value, customerId: "", enquiryId: value === "enquiry" ? current.enquiryId : "" };
      }

      return { ...current, [name]: value };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      propertyId: form.propertyId,
      scheduledAt: fromDateTimeLocalValue(form.scheduledAt),
      assignedTo: form.assignedTo || null,
      notes: form.notes.trim() || null,
    };

    if (!initialSiteVisit) {
      if (form.source === "customer") {
        payload.customerId = form.customerId || null;
      } else if (form.source === "enquiry") {
        payload.enquiryId = form.enquiryId || null;
      } else {
        payload.visitorName = form.visitorName.trim();
        payload.visitorEmail = form.visitorEmail.trim() || null;
        payload.visitorPhone = form.visitorPhone.trim() || null;
      }
    }

    onSubmit(payload);
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <section className="panel">
        <div className="section-heading"><h2>Appointment</h2></div>
        <div className="form-grid">
          <Field label="Property Search">
            <div className="inline-input-action">
              <input value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} placeholder="Code, title, or address" />
              <button className="button secondary" type="button" onClick={handlePropertySearch}>Search</button>
            </div>
          </Field>
          <Field label="Property">
            <select name="propertyId" value={form.propertyId} onChange={handleChange} required>
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>{property.code} - {property.title}</option>
              ))}
            </select>
          </Field>
          <Field label="Scheduled Date / Time">
            <input name="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={handleChange} required />
          </Field>
          <Field label="Assigned Staff">
            <select name="assignedTo" value={form.assignedTo} onChange={handleChange}>
              <option value="">Unassigned</option>
              {assignees.map((staff) => <option key={staff.id} value={staff.id}>{staff.fullName}{staff.email ? ` - ${staff.email}` : ""}</option>)}
            </select>
          </Field>
        </div>
        {lookupError ? <div className="alert alert-info">Lookup options could not be loaded: {lookupError}</div> : null}
      </section>

      {!initialSiteVisit ? (
        <section className="panel">
          <div className="section-heading"><h2>Visitor Source</h2></div>
          <div className="form-grid">
            <Field label="Source">
              <select name="source" value={form.source} onChange={handleChange}>
                <option value="manual">Manual visitor</option>
                <option value="customer">Existing customer / lead</option>
                <option value="enquiry">Existing enquiry</option>
              </select>
            </Field>

            {form.source === "customer" ? (
              <>
                <Field label="Customer Search">
                  <div className="inline-input-action">
                    <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Name, email, or phone" />
                    <button className="button secondary" type="button" onClick={handleCustomerSearch}>Search</button>
                  </div>
                </Field>
                <Field label="Customer / Lead">
                  <select name="customerId" value={form.customerId} onChange={handleChange} required>
                    <option value="">Select customer</option>
                    {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName}{customer.email ? ` - ${customer.email}` : ""}</option>)}
                  </select>
                </Field>
              </>
            ) : null}

            {form.source === "enquiry" ? (
              <Field label="Enquiry ID">
                <input name="enquiryId" value={form.enquiryId} onChange={handleChange} required />
              </Field>
            ) : null}

            {form.source === "manual" ? (
              <>
                <Field label="Visitor Name"><input name="visitorName" value={form.visitorName} onChange={handleChange} maxLength={120} required /></Field>
                <Field label="Visitor Email"><input name="visitorEmail" type="email" value={form.visitorEmail} onChange={handleChange} maxLength={254} /></Field>
                <Field label="Visitor Phone"><input name="visitorPhone" value={form.visitorPhone} onChange={handleChange} maxLength={40} /></Field>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <Field label="Notes">
          <textarea name="notes" value={form.notes} onChange={handleChange} maxLength={5000} rows={5} />
        </Field>
      </section>

      <div className="form-actions">
        <button className="button primary" type="submit" disabled={submitting}>{submitting ? "Saving..." : submitLabel}</button>
      </div>
    </form>
  );
};