export default function SettingsPage({
  identities,
  canManageIdentities,
  isMainSettingsEditing,
  form,
  onChange,
  onLogoFileChange,
  onStartMainSettingsEdit,
  onCancelMainSettingsEdit,
  onSave,
  onCreateIdentity,
  onEditIdentity,
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
          {canManageIdentities ? (
            <button className="ghost-button" type="button" onClick={onCreateIdentity}>
              New identity
            </button>
          ) : null}
        </div>

        <div className="settings-form-card">
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
      </section>
    </section>
  );
}
