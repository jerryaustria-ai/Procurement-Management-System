import PanelExpandButton from "./PanelExpandButton.jsx";

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
  apiOrigin,
  onExpand,
  showExpand = true,
  onViewDocument
}) {
  function getDocumentHref(filePath) {
    return /^https?:\/\//i.test(filePath || "") ? filePath : `${apiOrigin}${filePath}`;
  }

  function handleViewDocument(document) {
    const viewerUrl = `${apiOrigin}/api/workflows/purchase-requests/${item.id}/documents/${document.id}/view`;
    const downloadUrl = `${apiOrigin}/api/workflows/purchase-requests/${item.id}/documents/${document.id}/download`;
    const viewerDocument = {
      ...document,
      viewerUrl,
      downloadUrl,
      directUrl: getDocumentHref(document.filePath)
    };

    if (onViewDocument) {
      onViewDocument(viewerDocument);
      return;
    }

    window.open(viewerDocument.viewerUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="panel action-panel panel-with-expand">
      {showExpand && onExpand ? (
        <PanelExpandButton onClick={onExpand} label="Expand documents panel" />
      ) : null}
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Attachments</p>
          <h2>Upload documents</h2>
        </div>
        <span className="panel-counter">{item.documents?.length ?? 0} files</span>
      </div>

      <p className="panel-support">
        Attach quotation, PO, invoice, delivery proof, inspection file, or other supporting
        documents for this request.
      </p>

      <div className="form-grid two-column">
        <label>
          Attachment type
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
          Attachment label
          <input
            name="label"
            value={uploadForm.label}
            onChange={onUploadFormChange}
            placeholder="Supplier PO or invoice copy"
          />
        </label>
      </div>

      <label>
        Attachment file
        <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={onFileChange} />
      </label>

      <button disabled={!canManage || isSubmitting || !uploadForm.file} type="button" onClick={onUpload}>
        {isSubmitting ? "Uploading..." : "Upload attachment"}
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
              <button
                className="inline-link"
                type="button"
                onClick={() => handleViewDocument(document)}
              >
                View
              </button>
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
