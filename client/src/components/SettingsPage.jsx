export default function SettingsPage({
  form,
  identities,
  identityForm,
  editingIdentityId,
  isMainSettingsEditing,
  onChange,
  onLogoFileChange,
  onStartMainSettingsEdit,
  onCancelMainSettingsEdit,
  onSave,
  onIdentityChange,
  onIdentityLogoFileChange,
  onEditIdentity,
  onSaveIdentity,
  onDeleteIdentity,
  onClose
}) {
  return (
    <section className="po-page">
      <div className="po-page-header">
        <div>
          <p className="eyebrow">System Settings</p>
          <h1>Settings</h1>
          <p className="hero-copy">
            Update the main company branding and maintain separate identities for each subsidiary or branch.
          </p>
        </div>
        <div className="po-page-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Back to dashboard
          </button>
        </div>
      </div>

      <section
        className={`panel settings-branding-panel ${isMainSettingsEditing ? "is-active" : "is-inactive"}`}
      >
        <div className={`settings-panel-actions ${isMainSettingsEditing ? "is-active" : ""}`}>
          {isMainSettingsEditing ? (
            <button className="ghost-button settings-panel-cancel" type="button" onClick={onCancelMainSettingsEdit}>
              Cancel
            </button>
          ) : null}
          <button
            className={`settings-panel-toggle ${isMainSettingsEditing ? "is-active" : ""}`}
            type="button"
            onClick={isMainSettingsEditing ? onSave : onStartMainSettingsEdit}
          >
            {isMainSettingsEditing ? "Save" : "Edit"}
          </button>
        </div>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Branding</p>
            <h2>Company identity</h2>
          </div>
        </div>

        <div className="settings-grid">
          <div className={`settings-logo-card ${isMainSettingsEditing ? "is-active" : "is-inactive"}`}>
            <span>Logo preview</span>
            <div className="settings-logo-preview">
              <img src={form.logoUrl} alt={form.companyName} />
            </div>
            <label className={`settings-file-field ${isMainSettingsEditing ? "" : "is-disabled"}`}>
              Replace logo
              <input
                type="file"
                accept=".ico,.png,.jpg,.jpeg,.svg,.webp"
                onChange={onLogoFileChange}
                disabled={!isMainSettingsEditing}
              />
            </label>
          </div>

          <div className={`settings-form-card ${isMainSettingsEditing ? "is-active" : "is-inactive"}`}>
            <label>
              Company name
              <input
                name="companyName"
                value={form.companyName}
                onChange={onChange}
                disabled={!isMainSettingsEditing}
              />
            </label>

            <label>
              Address
              <textarea
                name="address"
                value={form.address}
                onChange={onChange}
                rows="4"
                placeholder="Enter the complete office address"
                disabled={!isMainSettingsEditing}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Subsidiaries</p>
            <h2>Branch company identities</h2>
            <p className="hero-copy">
              Create a different address and logo for a branch or subsidiary.
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="settings-form-card">
            <div className="settings-preview-panel">
              <span>Logo preview</span>
              <div className="settings-logo-preview">
                <img src={identityForm.logoUrl} alt={identityForm.branchName || "Company identity"} />
              </div>
            </div>
            <label className="settings-file-field">
              Replace logo
              <input type="file" accept=".ico,.png,.jpg,.jpeg,.svg,.webp" onChange={onIdentityLogoFileChange} />
            </label>
            {identities.length ? (
              <div className="settings-identity-list">
                {identities.map((identity) => (
                  <article className="settings-identity-card" key={identity.id}>
                    <div className="settings-identity-top">
                      <div className="settings-identity-logo">
                        <img src={identity.logoUrl} alt={identity.branchName} />
                      </div>
                      <div>
                        <strong>{identity.branchName}</strong>
                      </div>
                    </div>
                    <small>{identity.address}</small>
                    <div className="request-card-actions">
                      <button className="ghost-button" type="button" onClick={() => onEditIdentity(identity.id)}>
                        Edit
                      </button>
                      <button className="ghost-button danger-link" type="button" onClick={() => onDeleteIdentity(identity.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">No branch or subsidiary identities yet.</p>
            )}
          </div>

          <div className="settings-form-card">
            <div className="settings-inline-heading">
              <h3>{editingIdentityId ? "Edit identity" : "New identity"}</h3>
            </div>

            <label>
              Branch or subsidiary
              <input
                name="branchName"
                value={identityForm.branchName}
                onChange={onIdentityChange}
                placeholder="Example: Stats or Januarius Holdings Cebu"
              />
            </label>

            <label>
              Address
              <textarea
                name="address"
                value={identityForm.address}
                onChange={onIdentityChange}
                rows="4"
                placeholder="Enter the complete branch or subsidiary address"
              />
            </label>

            <button type="button" onClick={onSaveIdentity}>
              {editingIdentityId ? "Save identity" : "Add identity"}
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
