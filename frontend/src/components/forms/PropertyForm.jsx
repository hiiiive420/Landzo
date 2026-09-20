import { useState } from "react";
import { useAuth } from "../../auth/useAuth";
import { PermissionGate } from "../../auth/PermissionGate";
import { permissions, propertyTypes, transactionTypes } from "../../utils/propertyOptions";
import { DetailsFields } from "./DetailsFields";
import { Field } from "./Field";
import { LocationFields } from "./LocationFields";
import { PricingFields } from "./PricingFields";
import { PropertyMapPicker } from "./PropertyMapPicker";
import { PropertyMediaSection } from "./PropertyMediaSection";

const normalStatusOptions = ["available", "reserved", "sold", "rented", "leased", "unavailable"];
const archiveStatus = "archived";
const closedStatuses = ["sold", "rented", "leased"];
const statusLabels = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  rented: "Rented",
  leased: "Leased",
  unavailable: "Unavailable",
  archived: "Archived",
};

const getNormalStatusOptions = (currentStatus) => {
  if (currentStatus === "draft") {
    return [];
  }

  if (currentStatus === archiveStatus) {
    return [];
  }

  if (closedStatuses.includes(currentStatus)) {
    return normalStatusOptions;
  }

  if (currentStatus === "unavailable") {
    return ["available", "unavailable"];
  }

  return normalStatusOptions;
};

const getResolvedLocationId = (match) => {
  if (!match) {
    return null;
  }

  if (typeof match === "string") {
    return match;
  }

  return match.id ?? match._id ?? null;
};

export const PropertyForm = ({
  property,
  value,
  onChange,
  onSubmit,
  onMediaChanged,
  onPublicationChange,
  onFeaturedChange,
  onExploreMapChange,
  onStatusChange,
  onUnarchive,
  publishing,
  propertyAction,
  saving,
  submitLabel,
}) => {
  const { hasPermission } = useAuth();
  const [locationCenterHint, setLocationCenterHint] = useState(null);
  const [pendingLocationAutoSelection, setPendingLocationAutoSelection] = useState(null);
  const persisted = Boolean(property?.id);
  const publicationActionLabel = property?.isPublic ? "Unpublish" : "Publish";
  const publicationStatusLabel = property?.isPublic ? "Public" : "Not public";
  const normalStatusValues = getNormalStatusOptions(property?.status);
  const canEditStatus = hasPermission(permissions.propertyEdit);
  const canArchive = hasPermission(permissions.propertyArchive);
  const busy = Boolean(propertyAction) || publishing || saving;

  const toggleTransaction = (transactionType) => {
    const hasValue = value.transactionTypes.includes(transactionType);
    const next = hasValue
      ? value.transactionTypes.filter((item) => item !== transactionType)
      : [...value.transactionTypes, transactionType];

    onChange({ ...value, transactionTypes: next.length ? next : value.transactionTypes });
  };

  const handleStatusSelect = (event) => {
    const nextStatus = event.target.value;

    if (nextStatus && nextStatus !== property?.status) {
      onStatusChange(nextStatus);
    }
  };

  const handleResolvedLocation = (resolvedLocation) => {
  const matches = resolvedLocation?.matches ?? {};

  const provinceId = getResolvedLocationId(matches.province);
  const districtId = getResolvedLocationId(matches.district);
  const cityId = getResolvedLocationId(matches.city);
  const areaId = getResolvedLocationId(matches.area);

  console.log("PROPERTY RESOLVED LOCATION", {
    displayName: resolvedLocation?.displayName,
    matches,
    provinceId,
    districtId,
    cityId,
    areaId,
  });

  onChange((currentValue) => ({
    ...currentValue,

    location: {
      ...currentValue.location,

      province: provinceId,
      district: districtId,
      city: cityId,
      area: areaId,

      displayAddress:
        resolvedLocation?.displayName ??
        currentValue.location.displayAddress,
    },

    map:
      resolvedLocation?.map ??
      currentValue.map,
  }));

  setPendingLocationAutoSelection({
    key: `${Date.now()}:${resolvedLocation?.id ?? "manual"}`,
    matches,
  });
};
  return (
    <form className="stack" onSubmit={onSubmit}>
      <section className="panel">
        <div className="section-heading">
          <h2>Basic Information</h2>
          {property?.code ? <span>{property.code}</span> : null}
        </div>
        <div className="form-grid">
          {persisted ? (
            <Field label="Property type">
              <input value={property.type} readOnly />
            </Field>
          ) : (
            <Field label="Property type">
              <select value={value.type} onChange={(event) => onChange({ ...value, type: event.target.value, details: {} })}>
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Title">
            <input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} required />
          </Field>
          <Field label="Description">
            <textarea value={value.description} onChange={(event) => onChange({ ...value, description: event.target.value })} rows={4} />
          </Field>
        </div>
        <div className="checkbox-group">
          {transactionTypes.map((transactionType) => (
            <label key={transactionType.value} className="checkbox-row">
              <input type="checkbox" checked={value.transactionTypes.includes(transactionType.value)} onChange={() => toggleTransaction(transactionType.value)} />
              {transactionType.label}
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Location</h2>
        <LocationFields
          value={value.location}
          onChange={(location) => onChange((currentValue) => ({ ...currentValue, location }))}
          onCenterHintChange={setLocationCenterHint}
          autoSelection={pendingLocationAutoSelection}
          onAutoSelectionApplied={() => setPendingLocationAutoSelection(null)}
          mode="derived"
        />
      </section>
      <section className="panel">
        <h2>Property Details</h2>
        <DetailsFields type={value.type} value={value.details} onChange={(details) => onChange({ ...value, details })} />
      </section>
      <section className="panel">
        <h2>Pricing</h2>
        <PricingFields transactionTypes={value.transactionTypes} value={value.pricing} onChange={(pricing) => onChange({ ...value, pricing })} />
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Map</h2>
            <p className="muted">Select the exact property pin. Structured location fields remain separate.</p>
          </div>
        </div>
        <PropertyMapPicker
          value={value.map}
          onChange={(map) => onChange((currentValue) => ({ ...currentValue, map }))}
          onResolvedLocation={handleResolvedLocation}
          centerHint={locationCenterHint}
          showMissingLocationAction
        />
      </section>
      {persisted ? <PropertyMediaSection property={property} onChanged={onMediaChanged} /> : null}
      <section className="panel disabled-panel">
        <h2>Private</h2>
      </section>
      {persisted ? (
        <section className="panel">
          <div className="section-heading">
            <h2>Publishing</h2>
            <span>{publicationStatusLabel}</span>
          </div>
          <div className="form-grid">
            <PermissionGate permission={permissions.propertyPublish}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(property.featured)}
                  onChange={(event) => onFeaturedChange(event.target.checked)}
                  disabled={busy}
                />
                Featured
              </label>
            </PermissionGate>
            <PermissionGate permission={permissions.propertyPublish}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(property.exploreMapEnabled)}
                  onChange={(event) => onExploreMapChange(event.target.checked)}
                  disabled={busy}
                />
                Explore Map
              </label>
            </PermissionGate>
            {canEditStatus && normalStatusValues.length ? (
              <Field label="Status">
                <select value={property.status} onChange={handleStatusSelect} disabled={busy || property.status === archiveStatus}>
                  {normalStatusValues.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>
          <div className="form-actions">
            <PermissionGate permission={permissions.propertyPublish}>
              <button className="button secondary" type="button" onClick={onPublicationChange} disabled={busy}>
                {publishing ? "Updating..." : publicationActionLabel}
              </button>
            </PermissionGate>
            {canArchive && property.status !== "draft" ? (
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  property.status === archiveStatus ? onUnarchive() : onStatusChange(archiveStatus)
                }
                disabled={busy}
              >
                {propertyAction === "status"
                  ? "Updating..."
                  : property.status === archiveStatus
                    ? "Unarchive"
                    : "Archive"}
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="panel disabled-panel">
          <h2>Publishing</h2>
        </section>
      )}

      <div className="form-actions">
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};






