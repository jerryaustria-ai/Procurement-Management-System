function formatDate(value) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentPanel({
  item,
  uploadForm,
  onUploadFormChange,
  onFileChange,
  onUpload,
  onDelete,
  canManage,
  isSubmitting,
  error,
  apiOrigin
}) {
  return (
    <section className="panel action-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Documents</p>
          <h2>PO, invoice, and delivery files</h2>
        </div>
        <span className="panel-counter">{item.documents?.length ?? 0} files</span>
      </div>

      <p className="panel-support">
        Keep the request packet complete with supplier paperwork, delivery proofs, and finance
        attachments.
      </p>

      <div className="form-grid two-column">
        <label>
          Document type
          <select name="type" value={uploadForm.type} onChange={onUploadFormChange}>
            <option value="quotation">Quotation</option>
            <option value="po">PO</option>
            <option value="invoice">Invoice</option>
            <option value="delivery">Delivery</option>
            <option value="inspection">Inspection</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Label
          <input
            name="label"
            value={uploadForm.label}
            onChange={onUploadFormChange}
            placeholder="Supplier PO or invoice copy"
          />
        </label>
      </div>

      <label>
        File
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" onChange={onFileChange} />
      </label>

      <button disabled={!canManage || isSubmitting || !uploadForm.file} type="button" onClick={onUpload}>
        {isSubmitting ? "Uploading..." : "Upload document"}
      </button>

      <div className="document-list">
        {(item.documents ?? []).map((document) => (
          <article className="document-card" key={document.id}>
            <div>
              <strong>{document.label}</strong>
              <span>
                {document.type.toUpperCase()} · {formatSize(document.size)}
              </span>
              <small>
                {document.uploadedBy} · {formatDate(document.uploadedAt)}
              </small>
            </div>
            <div className="button-row">
              <a
                className="inline-link"
                href={`${apiOrigin}${document.filePath}`}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
              {canManage ? (
                <button
                  className="danger-button"
                  disabled={isSubmitting}
                  type="button"
                  onClick={() => onDelete(document.id)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {item.documents?.length === 0 ? (
          <p className="empty-state">No uploaded documents yet.</p>
        ) : null}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
