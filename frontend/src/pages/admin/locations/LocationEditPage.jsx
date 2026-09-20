import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  getLocation,
  updateLocation,
} from "../../../api/locations.api";
import { LocationForm } from "./LocationForm";

export const LocationEditPage = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadLocation = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getLocation(locationId);

        if (!ignore) {
          setLocation(result);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadLocation();

    return () => {
      ignore = true;
    };
  }, [locationId]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");

    try {
      await updateLocation(locationId, payload);

      navigate("/admin/locations", {
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
          <p className="eyebrow">Location Catalog</p>
          <h1>Edit Location</h1>

          <p className="muted">
            Update the selected LANDZO location without changing its hierarchy
            level.
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

      {loading ? (
        <div className="panel">
          <div className="empty-state">Loading location...</div>
        </div>
      ) : !location ? (
        <div className="panel">
          <div className="empty-state">
            Location could not be loaded.
          </div>
        </div>
      ) : (
        <LocationForm
          initialLocation={location}
          submitting={submitting}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};