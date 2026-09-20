import { useCallback, useEffect, useState } from "react";

import { getErrorMessage } from "../../../api/apiClient";
import { getSettings, updateSettings } from "../../../api/settings.api";
import { Alert } from "../../../components/common/Alert";

const defaultForm = {
  business: {
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
  },
  social: {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  },
  website: {
    defaultMetaTitle: "",
    defaultMetaDescription: "",
  },
};

const mergeSettings = (settings) => ({
  business: {
    ...defaultForm.business,
    ...(settings?.business ?? {}),
  },
  social: {
    ...defaultForm.social,
    ...(settings?.social ?? {}),
  },
  website: {
    ...defaultForm.website,
    ...(settings?.website ?? {}),
  },
});

export const SettingsPage = () => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = useCallback(async () => {
    await Promise.resolve();

    setLoading(true);
    setError("");

    try {
      const settings = await getSettings();
      setForm(mergeSettings(settings));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadSettings]);

  const updateField = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const settings = await updateSettings(form);
      setForm(mergeSettings(settings));
      setSuccess("Settings saved.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">System</p>
          <h1>Settings</h1>
          <p className="muted">Manage public business and website defaults for LANDZO.</p>
        </div>

        <button className="button secondary" type="button" onClick={loadSettings} disabled={loading || saving}>
          Retry
        </button>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      {loading ? <Alert>Loading settings...</Alert> : null}

      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="card settings-section">
          <div>
            <h2>Business Information</h2>
            <p className="muted">Contact details shown by the LANDZO website and admin workflows.</p>
          </div>

          <div className="form-grid two">
            <label className="field" htmlFor="settings-business-name">
              <span>Business Name</span>
              <input
                id="settings-business-name"
                value={form.business.name}
                onChange={(event) => updateField("business", "name", event.target.value)}
                maxLength="160"
              />
            </label>

            <label className="field" htmlFor="settings-business-email">
              <span>Email</span>
              <input
                id="settings-business-email"
                type="email"
                value={form.business.email}
                onChange={(event) => updateField("business", "email", event.target.value)}
                maxLength="254"
              />
            </label>

            <label className="field" htmlFor="settings-business-phone">
              <span>Phone</span>
              <input
                id="settings-business-phone"
                type="tel"
                value={form.business.phone}
                onChange={(event) => updateField("business", "phone", event.target.value)}
                maxLength="40"
              />
            </label>

            <label className="field" htmlFor="settings-business-whatsapp">
              <span>WhatsApp</span>
              <input
                id="settings-business-whatsapp"
                type="tel"
                value={form.business.whatsapp}
                onChange={(event) => updateField("business", "whatsapp", event.target.value)}
                maxLength="40"
              />
            </label>
          </div>

          <label className="field" htmlFor="settings-business-address">
            <span>Address</span>
            <textarea
              id="settings-business-address"
              value={form.business.address}
              onChange={(event) => updateField("business", "address", event.target.value)}
              maxLength="500"
              rows="4"
            />
          </label>
        </section>

        <section className="card settings-section">
          <div>
            <h2>Social Links</h2>
            <p className="muted">Official LANDZO social profile URLs.</p>
          </div>

          <div className="form-grid two">
            <label className="field" htmlFor="settings-social-facebook">
              <span>Facebook</span>
              <input
                id="settings-social-facebook"
                type="url"
                value={form.social.facebook}
                onChange={(event) => updateField("social", "facebook", event.target.value)}
                maxLength="500"
              />
            </label>

            <label className="field" htmlFor="settings-social-instagram">
              <span>Instagram</span>
              <input
                id="settings-social-instagram"
                type="url"
                value={form.social.instagram}
                onChange={(event) => updateField("social", "instagram", event.target.value)}
                maxLength="500"
              />
            </label>

            <label className="field" htmlFor="settings-social-linkedin">
              <span>LinkedIn</span>
              <input
                id="settings-social-linkedin"
                type="url"
                value={form.social.linkedin}
                onChange={(event) => updateField("social", "linkedin", event.target.value)}
                maxLength="500"
              />
            </label>

            <label className="field" htmlFor="settings-social-youtube">
              <span>YouTube</span>
              <input
                id="settings-social-youtube"
                type="url"
                value={form.social.youtube}
                onChange={(event) => updateField("social", "youtube", event.target.value)}
                maxLength="500"
              />
            </label>
          </div>
        </section>

        <section className="card settings-section">
          <div>
            <h2>Website Defaults</h2>
            <p className="muted">Fallback SEO text used when a page has no specific metadata.</p>
          </div>

          <label className="field" htmlFor="settings-meta-title">
            <span>Default Meta Title</span>
            <input
              id="settings-meta-title"
              value={form.website.defaultMetaTitle}
              onChange={(event) => updateField("website", "defaultMetaTitle", event.target.value)}
              maxLength="180"
            />
          </label>

          <label className="field" htmlFor="settings-meta-description">
            <span>Default Meta Description</span>
            <textarea
              id="settings-meta-description"
              value={form.website.defaultMetaDescription}
              onChange={(event) =>
                updateField("website", "defaultMetaDescription", event.target.value)
              }
              maxLength="500"
              rows="4"
            />
          </label>
        </section>

        <div className="form-actions sticky-actions">
          <button className="button" type="submit" disabled={saving || loading}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};