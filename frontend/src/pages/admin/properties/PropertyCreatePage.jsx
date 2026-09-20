import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { createProperty } from "../../../api/properties.api";
import { Alert } from "../../../components/common/Alert";
import { PropertyForm } from "../../../components/forms/PropertyForm";
import { formStateFromProperty, toPropertyPayload } from "../../../utils/propertyFormData";

export const PropertyCreatePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(formStateFromProperty());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const property = await createProperty(toPropertyPayload(form, true));
      navigate(`/admin/properties/${property.id}/edit`);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <section className="page-heading"><p className="eyebrow">Properties</p><h1>New Draft</h1></section>
      <Alert tone="danger">{error}</Alert>
      <PropertyForm value={form} onChange={setForm} onSubmit={handleSubmit} saving={saving} submitLabel="Create Draft" />
    </div>
  );
};


