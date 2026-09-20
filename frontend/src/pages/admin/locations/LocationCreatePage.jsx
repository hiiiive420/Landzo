import { useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { createLocation } from "../../../api/locations.api";
import { LocationForm } from "./LocationForm";

export const LocationCreatePage = () => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const createdLocation = await createLocation(payload);
      setSuccess(`${createdLocation.name} created successfully.`);
      return createdLocation;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <div className="row-between">
        <div className="page-heading">
          <p className="eyebrow">Location Catalog</p>
          <h1>Add Location</h1>
          <p className="muted">
            Search or select a map point to add the next missing location in the canonical LANDZO hierarchy.
          </p>
        </div>

        <Link className="button secondary" to="/admin/locations">
          Back to Locations
        </Link>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      ) : null}

      <LocationForm
        submitting={submitting}
        submitLabel="Create Location"
        onSubmit={handleSubmit}
      />
    </div>
  );
};