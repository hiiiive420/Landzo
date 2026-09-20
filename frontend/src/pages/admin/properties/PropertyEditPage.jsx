import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  duplicateProperty,
  getProperty,
  publishProperty,
  setPropertyExploreMap,
  setPropertyFeatured,
  trashProperty,
  unpublishProperty,
  unarchiveProperty,
  updateProperty,
  updatePropertyStatus,
} from "../../../api/properties.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { Alert } from "../../../components/common/Alert";
import { PropertyForm } from "../../../components/forms/PropertyForm";
import { formStateFromProperty, toPropertyPayload } from "../../../utils/propertyFormData";
import { permissions } from "../../../utils/propertyOptions";

const publicationFieldLabels = {
  title: "Title required",
  description: "Description required",
  province: "Province required",
  district: "District required",
  city: "City required",
  displayAddress: "Display address required",
  mapLocation: "Exact map location required",
  pricing: "Pricing required",
  "pricing.sale": "Sale pricing required",
  "pricing.rent": "Rent pricing required",
  "pricing.lease": "Lease pricing required",
  images: "Property image required",
  "media.images": "Property image required",
  coverImage: "Cover image required",
  "media.coverImage": "Cover image required",
  landSize: "Land size required",
  landSizeUnit: "Land size unit required",
  landType: "Land type required",
  bedrooms: "Bedrooms required",
  bathrooms: "Bathrooms required",
  houseSize: "House size required",
  houseSizeUnit: "House size unit required",
  unitSize: "Unit size required",
  unitSizeUnit: "Unit size unit required",
  commercialType: "Commercial type required",
  floorArea: "Floor area required",
  floorAreaUnit: "Floor area unit required",
  "details.landSize": "Land size required",
  "details.landSizeUnit": "Land size unit required",
  "details.landType": "Land type required",
  "details.bedrooms": "Bedrooms required",
  "details.bathrooms": "Bathrooms required",
  "details.houseSize": "House size required",
  "details.houseSizeUnit": "House size unit required",
  "details.unitSize": "Unit size required",
  "details.unitSizeUnit": "Unit size unit required",
  "details.commercialType": "Commercial type required",
  "details.floorArea": "Floor area required",
  "details.floorAreaUnit": "Floor area unit required",
};

const friendlyPropertyErrors = {
  PROPERTY_FEATURED_REQUIRES_PUBLIC: "Publish the property before featuring it.",
  PROPERTY_EXPLORE_MAP_REQUIRES_PUBLIC: "Publish the property before showing it on Explore Map.",
  PROPERTY_EXPLORE_MAP_REQUIRES_MAP: "Add an exact map location before showing this property on Explore Map.",
  PROPERTY_STATUS_TRANSITION_INVALID: "This status change is not allowed.",
};

const transactionLabels = {
  sale: "sale",
  rent: "rent",
  lease: "lease",
};

const formatMissingField = (field) => {
  if (publicationFieldLabels[field]) {
    return publicationFieldLabels[field];
  }

  const label = String(field)
    .split(".")
    .pop()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");

  return `${label.charAt(0).toUpperCase()}${label.slice(1)} required`;
};

const getPublicationReadinessIssues = (error) => {
  const response = error?.response?.data;

  if (response?.code !== "PROPERTY_NOT_READY_FOR_PUBLICATION") {
    return [];
  }

  const missingFields = response?.details?.missingFields ?? response?.missingFields ?? [];

  return Array.isArray(missingFields) ? missingFields.map(formatMissingField) : [];
};

const getPropertyActionErrorMessage = (error) => {
  const response = error?.response?.data;

  if (response?.code === "PROPERTY_STATUS_TRANSACTION_REQUIRED") {
    const transactionType = transactionLabels[response.details?.transactionType] || "matching";
    return `This status requires the ${transactionType} transaction type.`;
  }

  return friendlyPropertyErrors[response?.code] || getErrorMessage(error);
};

export const PropertyEditPage = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [propertyAction, setPropertyAction] = useState(null);
  const [error, setError] = useState("");
  const [readinessIssues, setReadinessIssues] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    const loadProperty = async () => {
      await Promise.resolve();
      if (active) {
        setLoading(true);
        setError("");
        setReadinessIssues([]);
      }

      try {
        const loaded = await getProperty(propertyId);
        if (active) {
          setProperty(loaded);
          setForm(formStateFromProperty(loaded));
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

    loadProperty();

    return () => {
      active = false;
    };
  }, [propertyId]);

  const applyUpdatedProperty = (updated) => {
    setProperty(updated);
    setForm(formStateFromProperty(updated));
  };

  const refreshProperty = async () => {
    const loaded = await getProperty(propertyId);
    applyUpdatedProperty(loaded);
  };

  const saveCurrentForm = async ({ showNotice = true } = {}) => {
    const updated = await updateProperty(propertyId, toPropertyPayload(form, false));
    applyUpdatedProperty(updated);

    if (showNotice) {
      setNotice("Property saved");
    }

    return updated;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setReadinessIssues([]);
    setNotice("");

    try {
      await saveCurrentForm();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    setError("");
    setReadinessIssues([]);
    setNotice("");

    try {
      const duplicate = await duplicateProperty(propertyId);
      navigate(`/admin/properties/${duplicate.id}/edit`);
    } catch (duplicateError) {
      setError(getErrorMessage(duplicateError));
    }
  };


  const handleTrash = async () => {
  const confirmed = window.confirm(
    `Move ${property.code} to Trash?\n\nThis property can be restored for 5 days before permanent deletion.`,
  );

  if (!confirmed) {
    return;
  }

  setPropertyAction("trash");
  setError("");
  setReadinessIssues([]);
  setNotice("");

  try {
    await trashProperty(propertyId);
    navigate("/admin/properties/trash");
  } catch (trashError) {
    setError(getPropertyActionErrorMessage(trashError));
    setPropertyAction(null);
  }
};
  const handlePublicationChange = async () => {
    const wasPublic = property?.isPublic === true;
    const action = wasPublic ? unpublishProperty : publishProperty;

    setPublishing(true);
    setError("");
    setReadinessIssues([]);
    setNotice("");

    try {
      if (!wasPublic && form) {
        await saveCurrentForm({ showNotice: false });
      }

      const updated = await action(propertyId);
      applyUpdatedProperty(updated);
      setNotice(wasPublic ? "Property unpublished" : "Property published");
    } catch (publicationError) {
      const issues = getPublicationReadinessIssues(publicationError);

      if (issues.length) {
        setError("Cannot publish yet:");
        setReadinessIssues(issues);
      } else {
        setError(getPropertyActionErrorMessage(publicationError));
      }
    } finally {
      setPublishing(false);
    }
  };

  const runPropertyAction = async ({ actionKey, action, successMessage }) => {
    setPropertyAction(actionKey);
    setError("");
    setReadinessIssues([]);
    setNotice("");

    try {
      const updated = await action();
      applyUpdatedProperty(updated);
      setNotice(successMessage);
    } catch (actionError) {
      setError(getPropertyActionErrorMessage(actionError));
    } finally {
      setPropertyAction(null);
    }
  };

  const handleFeaturedChange = (featured) =>
    runPropertyAction({
      actionKey: "featured",
      action: () => setPropertyFeatured(propertyId, featured),
      successMessage: featured ? "Property marked as featured" : "Property removed from featured",
    });

  const handleExploreMapChange = (exploreMapEnabled) =>
    runPropertyAction({
      actionKey: "exploreMap",
      action: () => setPropertyExploreMap(propertyId, exploreMapEnabled),
      successMessage: exploreMapEnabled
        ? "Property shown on Explore Map"
        : "Property hidden from Explore Map",
    });

  const handleStatusChange = (status) =>
    runPropertyAction({
      actionKey: "status",
      action: () => updatePropertyStatus(propertyId, status),
      successMessage: "Property status updated",
    });

  const handleUnarchive = () =>
    runPropertyAction({
      actionKey: "status",
      action: () => unarchiveProperty(propertyId),
      successMessage: "Property unarchived",
    });

  if (loading) {
    return <p>Loading property...</p>;
  }

  const errorContent = error ? (
    <>
      {error}
      {readinessIssues.length ? (
        <ul>
          {readinessIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </>
  ) : (
    ""
  );

  return (
    <div className="stack">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Properties</p>
          <h1>{property?.title || "Property"}</h1>
        </div>
        <div className="form-actions">
  <PermissionGate permission={permissions.propertyCreate}>
    <button
      className="button secondary"
      type="button"
      onClick={handleDuplicate}
      disabled={Boolean(propertyAction) || saving || publishing}
    >
      Duplicate
    </button>
  </PermissionGate>

  <PermissionGate permission={permissions.propertyDelete}>
    <button
      className="button secondary"
      type="button"
      onClick={handleTrash}
      disabled={Boolean(propertyAction) || saving || publishing}
    >
      {propertyAction === "trash" ? "Moving..." : "Move to Trash"}
    </button>
  </PermissionGate>
</div>
      </section>
      <Alert tone="danger">{errorContent}</Alert>
      <Alert tone="success">{notice}</Alert>
      {form ? (
        <PropertyForm
          property={property}
          value={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onMediaChanged={refreshProperty}
          onPublicationChange={handlePublicationChange}
          onFeaturedChange={handleFeaturedChange}
          onExploreMapChange={handleExploreMapChange}
          onStatusChange={handleStatusChange}
          onUnarchive={handleUnarchive}
          publishing={publishing}
          propertyAction={propertyAction}
          saving={saving}
          submitLabel="Save Changes"
        />
      ) : null}
    </div>
  );
};
