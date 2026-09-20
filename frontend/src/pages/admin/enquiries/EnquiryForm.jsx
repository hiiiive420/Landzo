import { useState } from "react";

import { getErrorMessage } from "../../../api/apiClient";
import { listEnquiryPropertyOptions } from "../../../api/enquiries.api";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  message: "",
  propertyId: "",
  internalNote: "",
};

const createInitialForm = (initialEnquiry) => {
  if (!initialEnquiry) {
    return EMPTY_FORM;
  }

  return {
    fullName: initialEnquiry.fullName ?? "",
    email: initialEnquiry.email ?? "",
    phone: initialEnquiry.phone ?? "",
    message: initialEnquiry.message ?? "",
    propertyId: initialEnquiry.property?.id ?? "",
    internalNote: initialEnquiry.internalNote ?? "",
  };
};

export const EnquiryForm = ({
  initialEnquiry = null,
  submitting = false,
  submitLabel,
  onSubmit,
}) => {
  const [form, setForm] = useState(() =>
    createInitialForm(initialEnquiry),
  );

  const [propertySearch, setPropertySearch] = useState("");
  const [propertyOptions, setPropertyOptions] = useState(() =>
    initialEnquiry?.property
      ? [initialEnquiry.property]
      : [],
  );

  const [propertySearching, setPropertySearching] =
    useState(false);

  const [propertySearchError, setPropertySearchError] =
    useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePropertySearch = async (event) => {
    event.preventDefault();

    const search = propertySearch.trim();

    setPropertySearching(true);
    setPropertySearchError("");

    try {
      const properties =
        await listEnquiryPropertyOptions({
          search,
          limit: 20,
        });

      setPropertyOptions(properties ?? []);
    } catch (error) {
      setPropertyOptions([]);
      setPropertySearchError(
        getErrorMessage(error),
      );
    } finally {
      setPropertySearching(false);
    }
  };

  const handleClearProperty = () => {
    setForm((current) => ({
      ...current,
      propertyId: "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      fullName: form.fullName.trim(),

      email: form.email.trim()
        ? form.email.trim()
        : null,

      phone: form.phone.trim()
        ? form.phone.trim()
        : null,

      message: form.message.trim()
        ? form.message.trim()
        : null,

      propertyId: form.propertyId || null,

      internalNote: form.internalNote.trim()
        ? form.internalNote.trim()
        : null,
    };

    onSubmit(payload);
  };

  return (
    <form
      className="stack"
      onSubmit={handleSubmit}
    >
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Contact Details</h2>

            <p className="muted">
              Record the customer details needed
              for follow-up.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Full Name</span>

            <input
              name="fullName"
              type="text"
              minLength={2}
              maxLength={120}
              required
              value={form.fullName}
              onChange={handleChange}
              placeholder="Customer name"
            />
          </label>

          <label className="field">
            <span>Email</span>

            <input
              name="email"
              type="email"
              maxLength={254}
              value={form.email}
              onChange={handleChange}
              placeholder="customer@example.com"
            />
          </label>

          <label className="field">
            <span>Phone</span>

            <input
              name="phone"
              type="tel"
              minLength={5}
              maxLength={40}
              value={form.phone}
              onChange={handleChange}
              placeholder="+94..."
            />
          </label>
        </div>

        <p className="muted">
          At least one contact method — email or
          phone — is required.
        </p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Enquiry</h2>

            <p className="muted">
              Record the customer message and
              optionally link it to a Property.
            </p>
          </div>
        </div>

        <label className="field">
          <span>Message</span>

          <textarea
            name="message"
            rows={6}
            maxLength={5000}
            value={form.message}
            onChange={handleChange}
            placeholder="What is the customer enquiring about?"
          />
        </label>

        <div className="subsection">
          <div>
            <h3>Linked Property</h3>

            <p className="muted">
              Optional. Search by Property Code,
              title, or display address.
            </p>
          </div>

          <div className="form-grid">
            <div className="field">
              <span>Find Property</span>

              <div className="form-actions">
                <input
                  type="search"
                  value={propertySearch}
                  onChange={(event) =>
                    setPropertySearch(
                      event.target.value,
                    )
                  }
                  placeholder="APT-00042 or property title"
                />

                <button
                  className="button secondary"
                  type="button"
                  disabled={propertySearching}
                  onClick={handlePropertySearch}
                >
                  {propertySearching
                    ? "Searching..."
                    : "Search"}
                </button>
              </div>
            </div>

            <label className="field">
              <span>Property</span>

              <select
                name="propertyId"
                value={form.propertyId}
                onChange={handleChange}
              >
                <option value="">
                  General enquiry — no Property
                </option>

                {propertyOptions.map(
                  (property) => (
                    <option
                      key={property.id}
                      value={property.id}
                    >
                      {property.code} —{" "}
                      {property.title}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {form.propertyId ? (
            <div className="form-actions">
              <button
                className="button secondary small"
                type="button"
                onClick={handleClearProperty}
              >
                Remove Property Link
              </button>
            </div>
          ) : null}

          {propertySearchError ? (
            <div
              className="alert alert-danger"
              role="alert"
            >
              {propertySearchError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Internal Note</h2>

            <p className="muted">
              Staff-only context for handling this
              enquiry.
            </p>
          </div>
        </div>

        <label className="field">
          <span>Internal Note</span>

          <textarea
            name="internalNote"
            rows={5}
            maxLength={5000}
            value={form.internalNote}
            onChange={handleChange}
            placeholder="Optional internal follow-up note"
          />
        </label>
      </section>

      <div className="form-actions">
        <button
          className="button primary"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
};