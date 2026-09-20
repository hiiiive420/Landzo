import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { createSiteVisit } from "../../../api/siteVisits.api";
import { Alert } from "../../../components/common/Alert";
import { SiteVisitForm } from "./SiteVisitForm";

export const SiteVisitCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const initialCustomerId = searchParams.get("customerId") ?? "";
  const initialEnquiryId = searchParams.get("enquiryId") ?? "";
  const initialPropertyId = searchParams.get("propertyId") ?? "";

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");

    try {
      const siteVisit = await createSiteVisit(payload);
      navigate(`/admin/site-visits/${siteVisit.id}`, { replace: true });
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
          <h1>Schedule Site Visit</h1>
          <p className="muted">Create a real-world property inspection appointment.</p>
        </div>
        <Link className="button secondary" to="/admin/site-visits">Back</Link>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <SiteVisitForm
        initialCustomerId={initialCustomerId}
        initialEnquiryId={initialEnquiryId}
        initialPropertyId={initialPropertyId}
        submitting={submitting}
        submitLabel="Schedule Visit"
        onSubmit={handleSubmit}
      />
    </div>
  );
};