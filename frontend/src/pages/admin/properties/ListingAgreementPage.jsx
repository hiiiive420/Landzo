import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import "@fontsource/noto-sans-sinhala/400.css";
import "@fontsource/noto-sans-tamil/400.css";
import { getErrorMessage } from "../../../api/apiClient";
import {
  getListingAgreementById,
  generateListingAgreement,
  getLatestListingAgreement,
} from "../../../api/listingAgreements.api";
import { getProperty } from "../../../api/properties.api";
import { Alert } from "../../../components/common/Alert";
import { LISTING_AGREEMENT_DEFAULTS } from "../../../utils/listingAgreement.constants";
import {
  downloadListingAgreementPdf,
} from "../../../utils/listingAgreement.pdf";
import {
  getListingAgreementClauses,
  LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT,
} from "../../../utils/listingAgreement.template";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (dateString, days) => {
  if (!dateString) {
    return "";
  }
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const getPropertyAddress = (property) => {
  const location = property.location ?? {};
  return location.displayAddress
    || [location.area?.name, location.city?.name, location.district?.name, location.province?.name]
      .filter(Boolean)
      .join(", ");
};

const getPropertyInformation = (property) =>
  [property.title, property.type?.replace(/^\w/, (letter) => letter.toUpperCase())]
    .filter(Boolean)
    .join(" - ");

const getInitialForm = (property, savedAgreement) => {
  const agreementDate = savedAgreement?.agreementDate ?? today();
  const commencementDate = savedAgreement?.commencementDate ?? agreementDate;
  const salePrice = property.pricing?.sale?.amount;
  const sellerDefaults = {
    fullName: "",
    identificationNumber: "",
    address: "",
    phone: "",
    mobilePhone: "",
  };

  return {
    judicialZone: savedAgreement?.judicialZone ?? "",
    deedNumber: savedAgreement?.deedNumber ?? "",
    propertyInformation: savedAgreement?.propertyInformation ?? getPropertyInformation(property),
    propertyAddress: savedAgreement?.propertyAddress ?? getPropertyAddress(property),
    seller1: { ...sellerDefaults, ...savedAgreement?.seller1 },
    seller2: { ...sellerDefaults, ...savedAgreement?.seller2 },
    agreementDate,
    commencementDate,
    exclusivePeriodDays: String(savedAgreement?.exclusivePeriodDays ?? LISTING_AGREEMENT_DEFAULTS.exclusivePeriodDays),
    protectionPeriodDays: String(savedAgreement?.protectionPeriodDays ?? LISTING_AGREEMENT_DEFAULTS.protectionPeriodDays),
    minimumSellingPrice: String(savedAgreement?.minimumSellingPrice ?? salePrice ?? ""),
    currency: savedAgreement?.currency ?? property.pricing?.currency ?? "LKR",
    totalValuation: savedAgreement?.totalValuation ? String(savedAgreement.totalValuation) : "",
    commissionPercentage: String(savedAgreement?.commissionPercentage ?? LISTING_AGREEMENT_DEFAULTS.commissionPercentage),
  };
};

const AgreementField = ({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  min,
  max,
  step,
  maxLength,
  readOnly = false,
  multiline = false,
}) => (
  <label className="listing-agreement-field">
    <span>{label}{required ? " *" : ""}</span>
    {multiline ? (
      <textarea
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        readOnly={readOnly}
        rows={3}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        readOnly={readOnly}
      />
    )}
  </label>
);

const SellerFields = ({ title, seller, onChange, optional = false }) => {
  const fields = [
    ["fullName", "Full legal name", 160],
    ["identificationNumber", "NIC / passport number", 40],
    ["address", "Address", 500],
    ["phone", "Phone", 40],
    ["mobilePhone", "Mobile phone", 40],
  ];

  return (
    <fieldset className="listing-agreement-group">
      <legend>{title}</legend>
      {optional ? <p className="listing-agreement-hint">Complete this section only if there is a second seller.</p> : null}
      <div className="listing-agreement-form-grid">
        {fields.map(([name, label, maxLength]) => (
          <AgreementField
            key={name}
            label={label}
            value={seller[name] ?? ""}
            onChange={(event) => onChange(name, event.target.value)}
            required={!optional && (name === "fullName" || name === "identificationNumber")}
            maxLength={maxLength}
            multiline={name === "address"}
          />
        ))}
      </div>
    </fieldset>
  );
};

const PreviewField = ({ label, value }) => (
  <div className="listing-agreement-preview-field">
    <span>{label}</span>
    <strong>{value || "—"}</strong>
  </div>
);

const AgreementPreview = ({ agreement, serialNumber }) => {
  const clauses = getListingAgreementClauses(agreement);
  const pageGroups = [
    clauses.slice(0, LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT),
    clauses.slice(LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT),
  ];

  return (
    <div className="listing-agreement-preview" aria-label="Two-page listing agreement preview">
      {pageGroups.map((pageClauses, pageIndex) => (
        <article className="listing-agreement-preview-page" key={`page-${pageIndex + 1}`}>
          <header className="listing-agreement-preview-header">
            <strong>LANDZO</strong>
            <span>{serialNumber || "Serial assigned when generated"}</span>
          </header>
          <h2>Exclusive Seller Listing Agreement</h2>
          <p className="listing-agreement-preview-note">
            Draft for review - seek independent Sri Lankan legal advice before signing.
          </p>

          {pageIndex === 0 ? (
            <>
              <section className="listing-agreement-preview-section">
                <h3>Agreement details</h3>
                <div className="listing-agreement-preview-grid">
                  <PreviewField label="Agreement date" value={agreement.agreementDate} />
                  <PreviewField label="Commencement" value={agreement.commencementDate} />
                  <PreviewField label="Expiry" value={agreement.expiryDate} />
                  <PreviewField label="Exclusive term" value={`${agreement.exclusivePeriodDays} days`} />
                </div>
              </section>
              <section className="listing-agreement-preview-section">
                <h3>Seller information</h3>
                <div className="listing-agreement-preview-grid">
                  <PreviewField label="Seller 1" value={agreement.seller1.fullName} />
                  <PreviewField label="NIC / passport" value={agreement.seller1.identificationNumber} />
                  <PreviewField label="Address" value={agreement.seller1.address} />
                  <PreviewField label="Phone / mobile" value={[agreement.seller1.phone, agreement.seller1.mobilePhone].filter(Boolean).join(" / ")} />
                  <PreviewField label="Seller 2" value={agreement.seller2.fullName} />
                  <PreviewField label="NIC / passport" value={agreement.seller2.identificationNumber} />
                </div>
              </section>
              <section className="listing-agreement-preview-section">
                <h3>Property and commercial terms</h3>
                <div className="listing-agreement-preview-grid">
                  <PreviewField label="Property" value={`${agreement.propertyInformation} (${agreement.propertyCode})`} />
                  <PreviewField label="Address" value={agreement.propertyAddress} />
                  <PreviewField label="Deed number" value={agreement.deedNumber} />
                  <PreviewField label="Judicial zone" value={agreement.judicialZone} />
                  <PreviewField label="Minimum selling price" value={`${agreement.currency} ${Number(agreement.minimumSellingPrice || 0).toLocaleString("en-US")}`} />
                  <PreviewField label="Commission" value={`${agreement.commissionPercentage}%`} />
                  {agreement.totalValuation ? (
                    <PreviewField label="Optional total valuation" value={`${agreement.currency} ${Number(agreement.totalValuation).toLocaleString("en-US")}`} />
                  ) : null}
                </div>
              </section>
            </>
          ) : null}

          <section className="listing-agreement-preview-section">
            <h3>{pageIndex === 0 ? "Terms and conditions" : "Terms and conditions (continued)"}</h3>
            <ol className="listing-agreement-preview-clauses" start={pageIndex ? LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT + 1 : 1}>
              {pageClauses.map((clause) => (
                <li key={clause.heading}>
                  <strong>{clause.heading}</strong>
                  <p>{clause.text}</p>
                </li>
              ))}
            </ol>
          </section>

          {pageIndex === 1 ? (
            <section className="listing-agreement-preview-signatures">
              <h3>Acknowledgement and signatures</h3>
              <p>The parties confirm that they have read and understood this agreement and sign it voluntarily. Each party should retain a signed copy.</p>
              {[
                "Seller 1",
                "Seller 2 (if applicable)",
                "LANDZO authorized representative",
                "Witness / attorney / notary",
              ].map((title) => (
                <div key={title} className="listing-agreement-signature-slot">
                  <strong>{title}</strong>
                  <span>Signature</span>
                  <span>Date</span>
                  <span>Name / NIC / position</span>
                </div>
              ))}
            </section>
          ) : null}
          <footer>{serialNumber || "LANDZO"} · Page {pageIndex + 1} of 2</footer>
        </article>
      ))}
    </div>
  );
};

export const ListingAgreementPage = () => {
  const { propertyId } = useParams();
  const [searchParams] = useSearchParams();
  const agreementId = searchParams.get("agreementId");
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [latestAgreement, setLatestAgreement] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [loadedProperty, loadedAgreement] = await Promise.all([
          getProperty(propertyId),
          agreementId
            ? getListingAgreementById(propertyId, agreementId)
            : getLatestListingAgreement(propertyId),
        ]);
        if (active) {
          setProperty(loadedProperty);
          setLatestAgreement(loadedAgreement);
          setForm(getInitialForm(loadedProperty, loadedAgreement));
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

    load();
    return () => {
      active = false;
    };
  }, [agreementId, propertyId]);

  const expiryDate = form ? addDays(form.commencementDate, form.exclusivePeriodDays) : "";

  const agreement = useMemo(() => {
    if (!form || !property) {
      return null;
    }
    return {
      ...form,
      propertyCode: property.code,
      propertyType: property.type,
      expiryDate,
      exclusivePeriodDays: Number(form.exclusivePeriodDays),
      protectionPeriodDays: Number(form.protectionPeriodDays),
      minimumSellingPrice: Number(form.minimumSellingPrice || 0),
      totalValuation: form.totalValuation ? Number(form.totalValuation) : null,
      commissionPercentage: Number(form.commissionPercentage),
    };
  }, [expiryDate, form, property]);

  const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const updateSeller = (sellerKey, name, value) =>
    setForm((current) => ({
      ...current,
      [sellerKey]: { ...current[sellerKey], [name]: value },
    }));

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!agreement || !property) {
      return;
    }

    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        judicialZone: form.judicialZone.trim(),
        deedNumber: form.deedNumber.trim(),
        propertyInformation: form.propertyInformation.trim(),
        propertyAddress: form.propertyAddress.trim(),
        seller1: Object.fromEntries(
          Object.entries(form.seller1).map(([key, value]) => [key, value.trim()]),
        ),
        seller2: Object.fromEntries(
          Object.entries(form.seller2).map(([key, value]) => [key, value.trim()]),
        ),
        agreementDate: form.agreementDate,
        commencementDate: form.commencementDate,
        exclusivePeriodDays: Number(form.exclusivePeriodDays),
        protectionPeriodDays: Number(form.protectionPeriodDays),
        minimumSellingPrice: Number(form.minimumSellingPrice),
        currency: form.currency,
        totalValuation: form.totalValuation ? Number(form.totalValuation) : null,
        commissionPercentage: Number(form.commissionPercentage),
      };
      const generated = await generateListingAgreement(propertyId, payload);
      setLatestAgreement(generated);
      try {
        await downloadListingAgreementPdf(generated);
        setNotice(`Agreement ${generated.serialNumber} generated and downloaded.`);
      } catch (downloadError) {
        setError(`Agreement ${generated.serialNumber} was saved, but the PDF download failed: ${getErrorMessage(downloadError)}`);
      }
    } catch (generationError) {
      setError(getErrorMessage(generationError));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <p>Loading listing agreement...</p>;
  }

  if (!property || !form || !agreement) {
    return (
      <div className="stack">
        <Alert tone="danger">{error || "The property could not be loaded."}</Alert>
        <button className="button secondary" type="button" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  return (
    <div className="stack listing-agreement-page">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Property agreement</p>
          <h1>Generate Listing Agreement</h1>
          <p className="muted">{property.code} · {property.title}</p>
        </div>
        <div className="form-actions">
          <Link className="button primary" to="/admin/agreements">
            View Agreements
          </Link>
          <button
            className="button secondary"
            type="button"
            onClick={() => navigate(`/admin/properties/${propertyId}/edit`)}
          >
            Back to Property
          </button>
        </div>
      </section>

      <Alert tone="danger">{error}</Alert>
      <Alert tone="success">{notice}</Alert>
      <p className="listing-agreement-privacy">
        Seller identity details are stored in a staff-only listing agreement record and are not added to the public property listing.
        {latestAgreement ? ` Latest agreement: ${latestAgreement.serialNumber} (${latestAgreement.status}).` : ""}
      </p>

      <form className="stack" onSubmit={handleGenerate}>
        <section className="panel listing-agreement-form-panel">
          <div className="listing-agreement-panel-heading">
            <div>
              <p className="eyebrow">Agreement information</p>
              <h2>Property and terms</h2>
            </div>
          </div>
          <div className="listing-agreement-form-grid">
            <AgreementField label="Property details" value={form.propertyInformation} onChange={(event) => updateField("propertyInformation", event.target.value)} required maxLength={1200} />
            <AgreementField label="Property address" value={form.propertyAddress} onChange={(event) => updateField("propertyAddress", event.target.value)} required maxLength={500} multiline />
            <AgreementField label="Deed number" value={form.deedNumber} onChange={(event) => updateField("deedNumber", event.target.value)} maxLength={120} />
            <AgreementField label="Judicial zone" value={form.judicialZone} onChange={(event) => updateField("judicialZone", event.target.value)} maxLength={160} />
            <AgreementField label="Agreement date" type="date" value={form.agreementDate} onChange={(event) => updateField("agreementDate", event.target.value)} required />
            <AgreementField label="Commencement date" type="date" value={form.commencementDate} onChange={(event) => updateField("commencementDate", event.target.value)} required />
            <AgreementField label="Exclusive listing period (days)" type="number" value={form.exclusivePeriodDays} onChange={(event) => updateField("exclusivePeriodDays", event.target.value)} required min="1" max="3650" step="1" />
            <AgreementField label="Expiry date (calculated)" type="date" value={expiryDate} readOnly />
            <AgreementField label="Post-expiry introduced-buyer protection (days)" type="number" value={form.protectionPeriodDays} onChange={(event) => updateField("protectionPeriodDays", event.target.value)} required min="0" max="3650" step="1" />
          </div>
        </section>

        <section className="panel listing-agreement-form-panel">
          <div className="listing-agreement-panel-heading">
            <div>
              <p className="eyebrow">Seller details</p>
              <h2>Agreement parties</h2>
            </div>
          </div>
          <div className="stack">
            <SellerFields title="Seller 1" seller={form.seller1} onChange={(name, value) => updateSeller("seller1", name, value)} />
            <SellerFields title="Seller 2 (optional)" seller={form.seller2} onChange={(name, value) => updateSeller("seller2", name, value)} optional />
          </div>
        </section>

        <section className="panel listing-agreement-form-panel">
          <div className="listing-agreement-panel-heading">
            <div>
              <p className="eyebrow">Commercial terms</p>
              <h2>Price, valuation and commission</h2>
            </div>
          </div>
          <div className="listing-agreement-form-grid">
            <AgreementField label="Minimum selling price" type="number" value={form.minimumSellingPrice} onChange={(event) => updateField("minimumSellingPrice", event.target.value)} required min="1" max={Number.MAX_SAFE_INTEGER} step="1" />
            <label className="listing-agreement-field">
              <span>Currency *</span>
              <select value={form.currency} onChange={(event) => updateField("currency", event.target.value)} required>
                <option value="LKR">LKR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <AgreementField label="Optional total valuation" type="number" value={form.totalValuation} onChange={(event) => updateField("totalValuation", event.target.value)} min="1" max={Number.MAX_SAFE_INTEGER} step="1" />
            <AgreementField label="Commission (%)" type="number" value={form.commissionPercentage} onChange={(event) => updateField("commissionPercentage", event.target.value)} required min="0" max="100" step="0.01" />
          </div>
        </section>

        <section className="listing-agreement-preview-section-wrap">
          <div className="listing-agreement-panel-heading">
            <div>
              <p className="eyebrow">Print preview</p>
              <h2>Two-page Legal-size agreement</h2>
              <p className="listing-agreement-hint">Portrait Legal paper · 8.5 × 14 in · 612 × 1008 pt</p>
            </div>
          </div>
          <AgreementPreview agreement={agreement} serialNumber={latestAgreement?.serialNumber} />
        </section>

        <div className="form-actions listing-agreement-actions">
          <button
            className="button secondary"
            type="button"
            onClick={() => navigate(`/admin/properties/${propertyId}/edit`)}
            disabled={generating}
          >
            Cancel
          </button>
          <button className="button primary" type="submit" disabled={generating}>
            {generating ? "Generating..." : "Generate & Download PDF"}
          </button>
        </div>
      </form>
    </div>
  );
};
