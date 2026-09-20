import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  assignEnquiry,
  closeEnquiry,
  getEnquiry,
  listAssignableStaff,
  updateEnquiry,
} from "../../../api/enquiries.api";
import {
  createCustomerFromEnquiry,
  getCustomerByEnquiry,
} from "../../../api/customers.api";
import { useAuth } from "../../../auth/useAuth";
import {
  enquiryStatuses,
  getEnquirySourceLabel,
  getEnquiryStatusLabel,
} from "../../../utils/enquiryOptions";
import { permissions } from "../../../utils/propertyOptions";
import { EnquiryForm } from "./EnquiryForm";

export const EnquiryDetailPage = () => {
  const { enquiryId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canUpdate = hasPermission(
    permissions.enquiryUpdate,
  );

  const canAssign = hasPermission(
    permissions.enquiryAssign,
  );

  const canClose = hasPermission(
    permissions.enquiryClose,
  );

  const canCreateCustomer = hasPermission(
    permissions.customerManage,
  );

  const canViewCustomers = hasPermission(
  permissions.customerView,
);
  const canManageSiteVisits = hasPermission(
    permissions.siteVisitManage,
  );

  const [enquiry, setEnquiry] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [linkedCustomer, setLinkedCustomer] =
  useState(null);

const [customerLookupLoading, setCustomerLookupLoading] =
  useState(canViewCustomers);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] =
    useState(false);

  const [assignmentUpdating, setAssignmentUpdating] =
    useState(false);

  const [statusUpdating, setStatusUpdating] =
    useState(false);

  const [closing, setClosing] = useState(false);
  const [creatingLead, setCreatingLead] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    getEnquiry(enquiryId)
      .then((result) => {
        if (!ignore) {
          setEnquiry(result);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [enquiryId]);

  useEffect(() => {
    if (!canAssign) {
      return undefined;
    }

    let ignore = false;

    listAssignableStaff()
      .then((staff) => {
        if (!ignore) {
          setAssignees(staff ?? []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAssignees([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [canAssign]);


  useEffect(() => {
  if (!canViewCustomers) {
    return undefined;
  }

  let ignore = false;

  getCustomerByEnquiry(enquiryId)
    .then((customer) => {
      if (!ignore) {
        setLinkedCustomer(customer);
      }
    })
    .catch(() => {
      if (!ignore) {
        setLinkedCustomer(null);
      }
    })
    .finally(() => {
      if (!ignore) {
        setCustomerLookupLoading(false);
      }
    });

  return () => {
    ignore = true;
  };
}, [canViewCustomers, enquiryId]);
  const isClosed =
    enquiry?.status === enquiryStatuses.closed;

  const handleEditSubmit = async (payload) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateEnquiry(
        enquiryId,
        payload,
      );

      setEnquiry(updated);
      setEditing(false);
      setSuccess("Enquiry updated successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignmentChange = async (
    event,
  ) => {
    const assignedTo =
      event.target.value || null;

    setAssignmentUpdating(true);
    setError("");
    setSuccess("");

    try {
      const updated = await assignEnquiry(
        enquiryId,
        assignedTo,
      );

      setEnquiry(updated);

      setSuccess(
        assignedTo
          ? "Enquiry assigned successfully."
          : "Enquiry unassigned successfully.",
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setAssignmentUpdating(false);
    }
  };

  const handleStatusChange = async (event) => {
    const status = event.target.value;

    if (
      status !== enquiryStatuses.new &&
      status !== enquiryStatuses.inProgress
    ) {
      return;
    }

    setStatusUpdating(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateEnquiry(
        enquiryId,
        {
          status,
        },
      );

      setEnquiry(updated);
      setSuccess("Enquiry status updated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setStatusUpdating(false);
    }
  };

 const handleCreateLead = async () => {
  setCreatingLead(true);
  setError("");
  setSuccess("");

  try {
    const customer = await createCustomerFromEnquiry(enquiryId, {
      type: "lead",
    });
    navigate(`/admin/customers/${customer.id}`);
  } catch (requestError) {
    setError(getErrorMessage(requestError));
  } finally {
    setCreatingLead(false);
  }
};
  const handleClose = async () => {
    const confirmed = window.confirm(
      "Close this enquiry? Closed enquiries cannot be edited or reassigned.",
    );

    if (!confirmed) {
      return;
    }

    setClosing(true);
    setError("");
    setSuccess("");

    try {
      const updated = await closeEnquiry(
        enquiryId,
      );

      setEnquiry(updated);
      setEditing(false);
      setSuccess("Enquiry closed successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <div className="empty-state">
          Loading enquiry...
        </div>
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="stack">
        {error ? (
          <div
            className="alert alert-danger"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="panel">
          <div className="empty-state">
            Enquiry could not be loaded.
          </div>
        </div>
      </div>
    );
  }

  if (editing && !isClosed) {
    return (
      <div className="stack">
        <div className="row-between">
          <div className="page-heading">
            <p className="eyebrow">
              Customer Operations
            </p>

            <h1>Edit Enquiry</h1>

            <p className="muted">
              Update customer and enquiry
              information.
            </p>
          </div>

          <button
            className="button secondary"
            type="button"
            disabled={submitting}
            onClick={() => {
              setEditing(false);
              setError("");
            }}
          >
            Cancel
          </button>
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
          key={enquiry.updatedAt}
          initialEnquiry={enquiry}
          submitting={submitting}
          submitLabel="Save Changes"
          onSubmit={handleEditSubmit}
        />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div className="page-heading">
          <p className="eyebrow">
            Customer Operations
          </p>

          <h1>{enquiry.fullName}</h1>

          <p className="muted">
            Enquiry received{" "}
            {enquiry.createdAt
              ? new Date(
                  enquiry.createdAt,
                ).toLocaleString()
              : ""}
          </p>
        </div>

        <div className="form-actions">
          <Link
            className="button secondary"
            to="/admin/enquiries"
          >
            Back
          </Link>

          {canUpdate && !isClosed ? (
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setEditing(true);
                setError("");
                setSuccess("");
              }}
            >
              Edit
            </button>
          ) : null}
{canViewCustomers &&
linkedCustomer ? (
  <Link
    className="button secondary"
    to={`/admin/customers/${linkedCustomer.id}`}
  >
    {linkedCustomer.type === "customer"
      ? "View Customer"
      : "View Lead"}
  </Link>
) : canCreateCustomer &&
  (!canViewCustomers ||
    (!customerLookupLoading &&
      !linkedCustomer)) ? (
  <button
    className="button secondary"
    type="button"
    disabled={creatingLead}
    onClick={handleCreateLead}
  >
    {creatingLead
      ? "Creating..."
      : "Create Lead"}
  </button>
) : null}
          {canManageSiteVisits ? (
            <Link
              className="button secondary"
              to={`/admin/site-visits/new?enquiryId=${enquiry.id}${enquiry.property?.id ? `&propertyId=${enquiry.property.id}` : ""}`}
            >
              Schedule Site Visit
            </Link>
          ) : null}

          {canClose && !isClosed ? (
            <button
              className="button danger"
              type="button"
              disabled={closing}
              onClick={handleClose}
            >
              {closing
                ? "Closing..."
                : "Close Enquiry"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          className="alert alert-success"
          role="status"
        >
          {success}
        </div>
      ) : null}

      {isClosed ? (
        <div className="alert alert-info">
          This enquiry is closed and can no longer
          be edited or reassigned.
        </div>
      ) : null}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Enquiry Overview</h2>

            <p className="muted">
              Current enquiry state and ownership.
            </p>
          </div>

          <span
            className={`status-badge enquiry-status-${enquiry.status}`}
          >
            {getEnquiryStatusLabel(
              enquiry.status,
            )}
          </span>
        </div>

        <div className="form-grid">
          <div className="field">
            <span>Source</span>

            <strong>
              {getEnquirySourceLabel(
                enquiry.source,
              )}
            </strong>
          </div>

          <div className="field">
            <span>Status</span>

            {canUpdate && !isClosed ? (
              <select
                value={enquiry.status}
                disabled={statusUpdating}
                onChange={handleStatusChange}
              >
                <option value={enquiryStatuses.new}>
                  New
                </option>

                <option
                  value={enquiryStatuses.inProgress}
                >
                  In Progress
                </option>
              </select>
            ) : (
              <strong>
                {getEnquiryStatusLabel(
                  enquiry.status,
                )}
              </strong>
            )}
          </div>

          <div className="field">
            <span>Assigned Staff</span>

            {canAssign && !isClosed ? (
              <select
                value={
                  enquiry.assignedTo?.id ?? ""
                }
                disabled={assignmentUpdating}
                onChange={handleAssignmentChange}
              >
                <option value="">
                  Unassigned
                </option>

                {assignees.map((staff) => (
                  <option
                    key={staff.id}
                    value={staff.id}
                  >
                    {staff.fullName}
                    {staff.email
                      ? ` — ${staff.email}`
                      : ""}
                  </option>
                ))}
              </select>
            ) : (
              <strong>
                {enquiry.assignedTo?.fullName ??
                  "Unassigned"}
              </strong>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Customer</h2>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <span>Full Name</span>
            <strong>{enquiry.fullName}</strong>
          </div>

          <div className="field">
            <span>Email</span>
            <strong>
              {enquiry.email ?? "-"}
            </strong>
          </div>

          <div className="field">
            <span>Phone</span>
            <strong>
              {enquiry.phone ?? "-"}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Message</h2>
          </div>
        </div>

        <p>
          {enquiry.message ||
            "No enquiry message recorded."}
        </p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Linked Property</h2>
          </div>
        </div>

        {enquiry.property ? (
          <div className="form-grid">
            <div className="field">
              <span>Property Code</span>
              <strong>
                {enquiry.property.code}
              </strong>
            </div>

            <div className="field">
              <span>Title</span>
              <strong>
                {enquiry.property.title}
              </strong>
            </div>

            <div className="field">
              <span>Type</span>
              <strong>
                {enquiry.property.type}
              </strong>
            </div>

            <div className="field">
              <span>Property Status</span>
              <strong>
                {enquiry.property.status}
              </strong>
            </div>
          </div>
        ) : (
          <p className="muted">
            This is a general enquiry and is not
            linked to a Property.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Internal Note</h2>

            <p className="muted">
              Staff-only context for this enquiry.
            </p>
          </div>
        </div>

        <p>
          {enquiry.internalNote ||
            "No internal note recorded."}
        </p>
      </section>

      {isClosed ? (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Closure</h2>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <span>Closed At</span>

              <strong>
                {enquiry.closedAt
                  ? new Date(
                      enquiry.closedAt,
                    ).toLocaleString()
                  : "-"}
              </strong>
            </div>

            <div className="field">
              <span>Closed By</span>

              <strong>
                {enquiry.closedBy?.fullName ??
                  "-"}
              </strong>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};