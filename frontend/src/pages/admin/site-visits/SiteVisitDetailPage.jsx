import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  cancelSiteVisit,
  completeSiteVisit,
  getSiteVisit,
  markSiteVisitNoShow,
  updateSiteVisit,
} from "../../../api/siteVisits.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { useAuth } from "../../../auth/useAuth";
import { Alert } from "../../../components/common/Alert";
import { formatDateTime } from "../../../utils/formatters";
import { permissions } from "../../../utils/propertyOptions";
import { getSiteVisitStatusLabel, siteVisitStatuses } from "../../../utils/siteVisitOptions";
import { SiteVisitForm } from "./SiteVisitForm";

export const SiteVisitDetailPage = () => {
  const { siteVisitId } = useParams();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(permissions.siteVisitManage);
  const [siteVisit, setSiteVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    getSiteVisit(siteVisitId)
      .then((result) => {
        if (!ignore) setSiteVisit(result);
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
  }, [siteVisitId]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateSiteVisit(siteVisitId, payload);
      setSiteVisit(updated);
      setEditing(false);
      setSuccess("Site visit updated successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (action, message) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const updated = await action();
      setSiteVisit(updated);
      setSuccess(message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <section className="panel"><div className="empty-state">Loading site visit...</div></section>;
  }

  if (!siteVisit) {
    return <div className="stack">{error ? <Alert tone="danger">{error}</Alert> : null}<section className="panel"><div className="empty-state">Site visit could not be loaded.</div></section></div>;
  }

  const isScheduled = siteVisit.status === siteVisitStatuses.scheduled;

  if (editing && isScheduled) {
    return (
      <div className="stack">
        <div className="row-between">
          <div className="page-heading"><p className="eyebrow">Customer Operations</p><h1>Edit Site Visit</h1></div>
          <button className="button secondary" type="button" disabled={submitting} onClick={() => setEditing(false)}>Cancel</button>
        </div>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <SiteVisitForm initialSiteVisit={siteVisit} submitting={submitting} submitLabel="Save Changes" onSubmit={handleSubmit} />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div className="page-heading">
          <p className="eyebrow">Customer Operations</p>
          <h1>{siteVisit.visitorName}</h1>
          <p className="muted">
  {getSiteVisitStatusLabel(siteVisit.status)} ·{" "}
  {formatDateTime(siteVisit.scheduledAt)}
</p>
        </div>
        <div className="form-actions">
          <Link className="button secondary" to="/admin/site-visits">Back</Link>
          {canManage && isScheduled ? <button className="button secondary" type="button" onClick={() => setEditing(true)}>Edit / Reschedule</button> : null}
        </div>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      {!isScheduled ? <Alert>Terminal site visits are read-only in V1.</Alert> : null}

      <section className="panel">
        <div className="section-heading"><h2>Visit Overview</h2></div>
        <div className="form-grid">
          <div className="field"><span>Status</span><strong>{getSiteVisitStatusLabel(siteVisit.status)}</strong></div>
          <div className="field"><span>Scheduled At</span><strong>{formatDateTime(siteVisit.scheduledAt)}</strong></div>
          <div className="field"><span>Assigned Staff</span><strong>{siteVisit.assignedTo?.fullName ?? "Unassigned"}</strong></div>
          <div className="field"><span>Updated</span><strong>{formatDateTime(siteVisit.updatedAt)}</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><h2>Visitor</h2></div>
        <div className="form-grid">
          <div className="field"><span>Name</span><strong>{siteVisit.visitorName}</strong></div>
          <div className="field"><span>Email</span><strong>{siteVisit.visitorEmail ?? "-"}</strong></div>
          <div className="field"><span>Phone</span><strong>{siteVisit.visitorPhone ?? "-"}</strong></div>
          <div className="field"><span>Customer / Lead</span><strong>{siteVisit.customer?.fullName ?? "-"}</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><h2>Property</h2></div>
        {siteVisit.property ? (
          <div className="form-grid">
            <div className="field"><span>Code</span><strong>{siteVisit.property.code}</strong></div>
            <div className="field"><span>Title</span><strong>{siteVisit.property.title}</strong></div>
            <div className="field"><span>Address</span><strong>{siteVisit.property.displayAddress ?? "-"}</strong></div>
          </div>
        ) : <p className="muted">No property linked.</p>}
      </section>

      <section className="panel">
        <div className="section-heading"><h2>Notes</h2></div>
        <p>{siteVisit.notes || "No notes recorded."}</p>
      </section>

      {canManage && isScheduled ? (
        <section className="panel">
          <div className="section-heading"><h2>Actions</h2></div>
          <PermissionGate permission={permissions.siteVisitManage}>
            <div className="form-actions">
              <button className="button primary" type="button" disabled={submitting} onClick={() => handleAction(() => completeSiteVisit(siteVisitId, window.prompt("Completion note") ?? undefined), "Site visit completed.")}>Complete</button>
              <button className="button secondary" type="button" disabled={submitting} onClick={() => handleAction(() => cancelSiteVisit(siteVisitId, window.prompt("Cancellation reason") ?? undefined), "Site visit cancelled.")}>Cancel</button>
              <button className="button secondary" type="button" disabled={submitting} onClick={() => handleAction(() => markSiteVisitNoShow(siteVisitId), "Site visit marked no-show.")}>Mark No Show</button>
            </div>
          </PermissionGate>
        </section>
      ) : null}

      {siteVisit.customer ? <Link className="button secondary small" to={`/admin/customers/${siteVisit.customer.id}`}>View Customer</Link> : null}
      {siteVisit.enquiry ? <Link className="button secondary small" to={`/admin/enquiries/${siteVisit.enquiry.id}`}>View Enquiry</Link> : null}
    </div>
  );
};