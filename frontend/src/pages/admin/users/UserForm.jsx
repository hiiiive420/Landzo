export const UserForm = ({
  value,
  onChange,
  roleOptions,
  submitting,
  submitLabel,
  onSubmit,
  includePassword = false,
  showRole = true,
}) => {
  const updateField = (field, nextValue) => onChange({ ...value, [field]: nextValue });

  return (
    <form className="stack" onSubmit={onSubmit}>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Staff Details</h2>
            <p className="muted">Manage safe staff profile fields and access role.</p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              minLength={2}
              maxLength={120}
              required
              value={value.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={value.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Phone</span>
            <input
              type="tel"
              maxLength={30}
              value={value.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>

          {showRole ? (
            <label className="field">
              <span>Role</span>
              <select
                required
                value={value.role}
                onChange={(event) => updateField("role", event.target.value)}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {includePassword ? (
            <label className="field">
              <span>Initial password</span>
              <input
                type="password"
                minLength={12}
                maxLength={128}
                required
                autoComplete="new-password"
                value={value.initialPassword}
                onChange={(event) => updateField("initialPassword", event.target.value)}
              />
            </label>
          ) : null}
        </div>
      </section>

      <div className="form-actions">
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};


