import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  getListingAgreementById,
  listListingAgreements,
} from "../../../api/listingAgreements.api";
import { listProperties } from "../../../api/properties.api";
import { Alert } from "../../../components/common/Alert";
import { EmptyState } from "../../../components/common/EmptyState";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { downloadListingAgreementPdf } from "../../../utils/listingAgreement.pdf";
import { formatLabel } from "../../../utils/formatters";

const defaultFilters = { search: "", status: "", page: 1, limit: 20 };
const agreementStatuses = [
  "generated",
  "printed",
  "signed",
  "cancelled",
  "expired",
];

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value))
    : "-";

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";

export const AgreementListPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [agreements, setAgreements] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [propertyError, setPropertyError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [properties, setProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  const query = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
    [filters],
  );

  useEffect(() => {
    let active = true;

    const loadAgreements = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await listListingAgreements(query);
        if (active) {
          setAgreements(response.data);
          setMeta(response.meta);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAgreements();
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    if (!showPropertyPicker) {
      return undefined;
    }

    let active = true;
    const loadProperties = async () => {
      setPropertiesLoading(true);
      setPropertyError("");
      try {
        const response = await listProperties({
          search: propertySearch.trim() || undefined,
          page: 1,
          limit: 10,
          sort: "newest",
        });
        if (active) {
          setProperties(response.data);
        }
      } catch (loadError) {
        if (active) {
          setPropertyError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setPropertiesLoading(false);
        }
      }
    };

    loadProperties();
    return () => {
      active = false;
    };
  }, [propertySearch, showPropertyPicker]);

  const updateFilter = (field, value) =>
    setFilters((current) => ({ ...current, [field]: value, page: 1 }));

  const handleDownload = async (agreement) => {
    setDownloadingId(agreement.id);
    setError("");
    try {
      const fullAgreement = await getListingAgreementById(
        agreement.propertyId,
        agreement.id,
      );
      await downloadListingAgreementPdf(fullAgreement);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    } finally {
      setDownloadingId("");
    }
  };

  const openAgreement = (agreement) =>
    navigate(
      `/admin/properties/${agreement.propertyId}/listing-agreement?agreementId=${agreement.id}`,
    );

  const startAgreementForProperty = (propertyId) => {
    navigate(`/admin/properties/${propertyId}/listing-agreement`);
  };

  return (
    <div className="stack agreement-management-page">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Agreement</h1>
          <p className="muted">Manage property listing agreements.</p>
        </div>
        <div className="form-actions">
          <button
            className="button primary"
            type="button"
            onClick={() => setShowPropertyPicker((visible) => !visible)}
          >
            + New Agreement
          </button>
        </div>
      </section>

      {showPropertyPicker ? (
        <section className="panel agreement-property-picker">
          <div className="row-between">
            <div>
              <h2>Select a property</h2>
              <p className="muted">Choose an existing property to start its listing agreement.</p>
            </div>
            <button
              className="button secondary small"
              type="button"
              onClick={() => setShowPropertyPicker(false)}
            >
              Close
            </button>
          </div>
          <input
            type="search"
            placeholder="Search property code or title"
            value={propertySearch}
            onChange={(event) => setPropertySearch(event.target.value)}
          />
          <Alert tone="danger">{propertyError}</Alert>
          {propertiesLoading ? <p>Loading properties...</p> : null}
          {!propertiesLoading && !propertyError && !properties.length ? (
            <EmptyState title="No properties found" />
          ) : null}
          {!propertiesLoading && properties.length ? (
            <div className="agreement-property-options">
              {properties.map((property) => (
                <button
                  className="agreement-property-option"
                  key={property.id}
                  type="button"
                  onClick={() => startAgreementForProperty(property.id)}
                >
                  <strong>{property.code} · {property.title}</strong>
                  <span>{formatLabel(property.type)} · {property.status}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <Alert tone="danger">{error}</Alert>

      <section className="panel filters agreement-filters">
        <input
          type="search"
          placeholder="Search serial, property code or seller"
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
        />
        <select
          value={filters.status}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="">All statuses</option>
          {agreementStatuses.map((status) => (
            <option key={status} value={status}>{formatLabel(status)}</option>
          ))}
        </select>
      </section>

      <section className="panel table-panel">
        {loading ? <p>Loading agreements...</p> : null}
        {!loading && !agreements.length ? (
          <EmptyState title="No agreements found" />
        ) : null}
        {!loading && agreements.length ? (
          <div className="table-wrap">
            <table className="property-table agreement-table">
              <thead>
                <tr>
                  <th>Agreement Serial</th>
                  <th>Property Code</th>
                  <th>Property</th>
                  <th>Seller</th>
                  <th>Agreement Date</th>
                  <th>Expiry Date</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agreements.map((agreement) => (
                  <tr key={agreement.id}>
                    <td><strong>{agreement.serialNumber}</strong></td>
                    <td>{agreement.propertyCode}</td>
                    <td>
                      <strong>{agreement.propertyInformation}</strong>
                      <div className="muted">{formatLabel(agreement.propertyType)}</div>
                    </td>
                    <td>{agreement.sellerName || "-"}</td>
                    <td>{formatDate(agreement.agreementDate)}</td>
                    <td>{formatDate(agreement.expiryDate)}</td>
                    <td>{agreement.commissionPercentage}%</td>
                    <td><StatusBadge>{agreement.status.toUpperCase()}</StatusBadge></td>
                    <td>{formatDateTime(agreement.createdAt)}</td>
                    <td>
                      <div className="agreement-row-actions">
                        <button
                          className="button secondary small"
                          type="button"
                          onClick={() => openAgreement(agreement)}
                        >
                          View / Edit
                        </button>
                        <button
                          className="button secondary small"
                          type="button"
                          disabled={downloadingId === agreement.id}
                          onClick={() => handleDownload(agreement)}
                        >
                          {downloadingId === agreement.id ? "Preparing..." : "Download PDF"}
                        </button>
                        <Link
                          className="button link small"
                          to={`/admin/properties/${agreement.propertyId}/edit`}
                        >
                          Open Property
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {!loading && meta.totalPages > 1 ? (
        <div className="pagination">
          <button
            className="button secondary small"
            type="button"
            disabled={meta.page <= 1}
            onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
          >
            Previous
          </button>
          <span className="muted">Page {meta.page} of {meta.totalPages} - {meta.total} total</span>
          <button
            className="button secondary small"
            type="button"
            disabled={meta.page >= meta.totalPages}
            onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
};
