import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { createEnquiry } from "../../../api/enquiries.api";
import { EnquiryForm } from "./EnquiryForm";

export const EnquiryCreatePage = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");

    try {
      await createEnquiry(payload);

      navigate("/admin/enquiries", {
        replace: true,
      });
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

          <h1>Add Enquiry</h1>

          <p className="muted">
            Record a customer enquiry and optionally link it to a LANDZO
            Property.
          </p>
        </div>

        <Link
          className="button secondary"
          to="/admin/enquiries"
        >
          Back to Enquiries
        </Link>
      </div>

      {error ? (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <EnquiryForm
        submitting={submitting}
        submitLabel="Create Enquiry"
        onSubmit={handleSubmit}
      />
    </div>
  );
};