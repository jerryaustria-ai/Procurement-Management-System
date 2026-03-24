export default function SettingsPage({
  form,
  onChange,
  onLogoFileChange,
  onSave,
  onReset,
  onClose
}) {
  return (
    <section className="po-page">
      <div className="po-page-header">
        <div>
          <p className="eyebrow">System Settings</p>
          <h1>Settings</h1>
          <p className="hero-copy">
            Update the company name and replace the logo used across the app.
          </p>
        </div>
        <div className="po-page-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Back to dashboard
          </button>
          <button className="ghost-button" type="button" onClick={onReset}>
            Reset default
          </button>
          <button type="button" onClick={onSave}>
            Save settings
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Branding</p>
            <h2>Company identity</h2>
          </div>
        </div>

        <div className="settings-grid">
          <div className="settings-logo-card">
            <span>Logo preview</span>
            <div className="settings-logo-preview">
              <img src={form.logoUrl} alt={form.companyName} />
            </div>
            <label className="settings-file-field">
              Replace logo
              <input type="file" accept=".ico,.png,.jpg,.jpeg,.svg,.webp" onChange={onLogoFileChange} />
            </label>
          </div>

          <div className="settings-form-card">
            <label>
              Company name
              <input name="companyName" value={form.companyName} onChange={onChange} />
            </label>

            <label>
              Address
              <textarea
                name="address"
                value={form.address}
                onChange={onChange}
                rows="4"
                placeholder="Enter the complete office address"
              />
            </label>
          </div>
        </div>
      </section>
    </section>
  );
}
