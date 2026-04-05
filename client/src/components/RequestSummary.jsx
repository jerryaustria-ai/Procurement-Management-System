import PanelExpandButton from "./PanelExpandButton.jsx";

function formatAmount(amount, currency) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency
  }).format(amount);
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatInspectionStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getDisplayStageLabel(item) {
  if (item.status === "completed" || item.filingCompleted) {
    return "Complete";
  }

  if (item.status === "rejected") {
    return "Rejected";
  }

  return item.currentStage;
}

function getProcurementStatusLabel(item) {
  if (item.status === "completed" || item.filingCompleted) {
    return "Current stage: Complete";
  }

  if (item.status === "rejected") {
    return "Current stage: Rejected";
  }

  if (!item.currentStage) {
    return "Current stage: Not set";
  }

  return `Current stage: ${item.currentStage}`;
}

function hasActiveRfp(item) {
  return (
    Boolean(item.requestForPaymentEnabled) &&
    !["completed", "rejected"].includes(item.status) &&
    !item.filingCompleted
  );
}

export default function RequestSummary({
  item,
  apiOrigin = "",
  onExpand,
  showExpand = true,
  showHeader = true,
  isCollapsed = false,
  onToggleVisibility
}) {
  const attachments = item.documents ?? [];

  function getDocumentHref(filePath) {
    return /^https?:\/\//i.test(filePath || "") ? filePath : `${apiOrigin}${filePath}`;
  }

  return (
    <section className="panel summary-panel panel-with-expand">
      {showExpand && onExpand ? (
        <PanelExpandButton onClick={onExpand} label="Expand purchase request details" />
      ) : null}
      {showHeader ? (
        <div className="summary-header">
          <div>
            <p className="eyebrow">Purchase Request</p>
            <h1>{item.requestNumber}</h1>
            <p className="summary-title">{item.title}</p>
          </div>
          <div className="summary-header-actions">
            <span className="status-pill">{getDisplayStageLabel(item)}</span>
            {hasActiveRfp(item) ? <span className="rfp-badge">RFP Enabled</span> : null}
            {onToggleVisibility ? (
              <button
                className="summary-toggle-icon"
                type="button"
                onClick={onToggleVisibility}
                aria-label={isCollapsed ? "Show request details" : "Hide request details"}
                title={isCollapsed ? "Show details" : "Hide details"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d={isCollapsed ? "m6 9 6 6 6-6" : "m6 15 6-6 6 6"}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isCollapsed ? null : (
        <>
      <div className="summary-banner">
        <div>
          <span>Procurement status</span>
          <strong>{getProcurementStatusLabel(item)}</strong>
        </div>
        <div>
          <span>Requester</span>
          <strong>{item.requester}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div>
          <span>Branch</span>
          <strong>{item.branch || "Not set"}</strong>
        </div>
        <div>
          <span>Department</span>
          <strong>{item.department}</strong>
        </div>
        <div>
          <span>Requester</span>
          <strong>{item.requester}</strong>
        </div>
        <div>
          <span>Budget</span>
          <strong>{formatAmount(item.amount, item.currency)}</strong>
        </div>
        <div>
          <span>Date needed</span>
          <strong>{formatDate(item.dateNeeded)}</strong>
        </div>
        <div>
          <span>Requested at</span>
          <strong>{formatDate(item.requestedAt)}</strong>
        </div>
        <div>
          <span>Supplier</span>
          <strong>{item.supplier}</strong>
        </div>
        <div>
          <span>PO number</span>
          <strong>{item.poNumber || "Pending"}</strong>
        </div>
        <div>
          <span>Invoice number</span>
          <strong>{item.invoiceNumber || "Pending"}</strong>
        </div>
        <div>
          <span>Payment reference</span>
          <strong>{item.paymentReference || "Pending"}</strong>
        </div>
        <div>
          <span>Delivery date</span>
          <strong>{formatDate(item.deliveryDate)}</strong>
        </div>
        <div>
          <span>Inspection</span>
          <strong>{formatInspectionStatus(item.inspectionStatus)}</strong>
        </div>
        <div>
          <span>Delivery address</span>
          <strong>{item.deliveryAddress || "Not set"}</strong>
        </div>
      </div>

      <div className="notes-box">
        <span>Description</span>
        <p>{item.description || "No item description provided yet."}</p>
      </div>

      <div className="notes-box">
        <span>Business justification / notes</span>
        <p>{item.notes || "No notes yet."}</p>
      </div>

      {attachments.length ? (
        <div className="notes-box">
          <span>Attachments</span>
          <div className="summary-attachment-links">
            {attachments.map((document) => (
              <a
                key={document.id}
                className="inline-link"
                href={getDocumentHref(document.filePath)}
                target="_blank"
                rel="noreferrer"
              >
                {document.label || document.originalName}
              </a>
            ))}
          </div>
        </div>
      ) : null}
        </>
      )}
    </section>
  );
}
