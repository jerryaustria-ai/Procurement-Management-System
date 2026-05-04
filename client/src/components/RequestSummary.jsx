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
    return "Completed";
  }

  if (item.status === "rejected") {
    return "Rejected";
  }

  return item.currentStage;
}

function getProcurementStatusLabel(item) {
  if (item.status === "completed" || item.filingCompleted) {
    return "Current stage: Completed";
  }

  if (item.status === "rejected") {
    return "Current stage: Rejected";
  }

  if (!item.currentStage) {
    return "Current stage: Not set";
  }

  return `Current stage: ${item.currentStage}`;
}

function getRequestTypeLabel(item) {
  const requestNumber = String(item?.requestNumber || "").trim().toUpperCase();

  if (requestNumber.startsWith("CA-")) {
    return "Cash Advance";
  }

  if (requestNumber.startsWith("RE-")) {
    return "Reimbursement";
  }

  return item?.category || "Purchase Request";
}

function getDisplayRequestNumber(item) {
  if (item?.category === "Request for Payment (RFP)") {
    return item.rfpNumber || item.requestNumber;
  }

  return item?.requestNumber;
}

function getSummaryPayee(item) {
  const requestedPayeeSupplier = String(item?.requestedPayeeSupplier || "").trim();
  const savedPayee = String(item?.rfpDraft?.payee || "").trim();
  const selectedSupplier = String(item?.supplier || "").trim();
  const normalizedRequestedPayeeSupplier = requestedPayeeSupplier.toLowerCase();
  const normalizedSavedPayee = savedPayee.toLowerCase();
  const normalizedSelectedSupplier = selectedSupplier.toLowerCase();
  const requester = String(item?.requester || item?.requesterName || "").trim();
  const normalizedRequester = requester.toLowerCase();

  if (savedPayee && normalizedSavedPayee !== normalizedRequestedPayeeSupplier) {
    return savedPayee;
  }

  if (requestedPayeeSupplier) {
    return requestedPayeeSupplier;
  }

  if (
    selectedSupplier &&
    selectedSupplier !== "Pending selection" &&
    (!savedPayee ||
      normalizedSavedPayee === normalizedSelectedSupplier ||
      normalizedSavedPayee === normalizedRequester)
  ) {
    return selectedSupplier;
  }

  return savedPayee || requester || "Not set";
}

export default function RequestSummary({
  item,
  apiOrigin = "",
  onExpand,
  showExpand = true,
  showHeader = true,
  isCollapsed = false,
  onToggleVisibility,
  showStagePill = true,
  onViewDocument
}) {
  const attachments = item.documents ?? [];
  const hidesPurchaseOrderFields =
    item.category === "Cash Advance" || item.category === "Reimbursement";

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
    <section className="panel summary-panel panel-with-expand">
      {showExpand && onExpand ? (
        <PanelExpandButton onClick={onExpand} label="Expand purchase request details" />
      ) : null}
      {showHeader ? (
        <div className="summary-header">
          <div>
            <p className="eyebrow">{getRequestTypeLabel(item)}</p>
            <h1>{getDisplayRequestNumber(item)}</h1>
            <p className="summary-title">{item.title}</p>
            <div className="summary-inline-details">
              <p>
                <strong>Payee:</strong> {getSummaryPayee(item)}
              </p>
              <p>
                <strong>Particulars:</strong> {item.description || "Not set"}
              </p>
              <p>
                <strong>Requester:</strong> {item.requester || item.requesterName || "Not set"}
              </p>
              <p>
                <strong>Amount:</strong> {formatAmount(item.amount, item.currency)}
              </p>
            </div>
          </div>
          <div className="summary-header-actions">
            {showStagePill ? <span className="status-pill">{getDisplayStageLabel(item)}</span> : null}
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
          <span>Stage Status</span>
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
          <strong>{item.department || "Not set"}</strong>
        </div>
        <div>
          <span>Property / Project</span>
          <strong>{item.propertyProject || "Not set"}</strong>
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
          <span>Mode of release</span>
          <strong>{item.modeOfRelease || "Not set"}</strong>
        </div>
        {item.modeOfRelease === "Bank Transfer" ? (
          <>
            <div>
              <span>Bank name</span>
              <strong>{item.bankName || "Not set"}</strong>
            </div>
            <div>
              <span>Account name</span>
              <strong>{item.accountName || "Not set"}</strong>
            </div>
            <div>
              <span>Account number</span>
              <strong>{item.accountNumber || "Not set"}</strong>
            </div>
          </>
        ) : null}
        {item.modeOfRelease === "Check" ? (
          <>
            <div>
              <span>Check number</span>
              <strong>{item.checkNumber || "Not set"}</strong>
            </div>
            <div>
              <span>Check date</span>
              <strong>{formatDate(item.checkDate)}</strong>
            </div>
            <div>
              <span>Bank name</span>
              <strong>{item.bankName || "Not set"}</strong>
            </div>
            <div>
              <span>Account name</span>
              <strong>{item.accountName || "Not set"}</strong>
            </div>
          </>
        ) : null}
        {item.category === "Reimbursement" ? (
          <div>
            <span>Expense date</span>
            <strong>{formatDate(item.expenseDate)}</strong>
          </div>
        ) : null}
        <div>
          <span>Date needed</span>
          <strong>{formatDate(item.dateNeeded)}</strong>
        </div>
        <div>
          <span>Requested at</span>
          <strong>{formatDate(item.requestedAt)}</strong>
        </div>
        <div>
          <span>Supplier / Payee</span>
          <strong>{item.supplier}</strong>
        </div>
        {!hidesPurchaseOrderFields ? (
          <>
            <div>
              <span>PO number</span>
              <strong>{item.poNumber || "Pending"}</strong>
            </div>
            <div>
              <span>Invoice number</span>
              <strong>{item.invoiceNumber || "Pending"}</strong>
            </div>
          </>
        ) : null}
        {!hidesPurchaseOrderFields ? (
          <div>
            <span>Payment reference</span>
            <strong>{item.paymentReference || "Pending"}</strong>
          </div>
        ) : null}
        {!hidesPurchaseOrderFields ? (
          <div>
            <span>Delivery date</span>
            <strong>{formatDate(item.deliveryDate)}</strong>
          </div>
        ) : null}
        {!hidesPurchaseOrderFields ? (
          <div>
            <span>Inspection</span>
            <strong>{formatInspectionStatus(item.inspectionStatus)}</strong>
          </div>
        ) : null}
        {!hidesPurchaseOrderFields ? (
          <div>
            <span>Delivery address</span>
            <strong>{item.deliveryAddress || "Not set"}</strong>
          </div>
        ) : null}
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
              <button
                key={document.id}
                className="inline-link"
                type="button"
                onClick={() => handleViewDocument(document)}
              >
                {document.label || document.originalName}
              </button>
            ))}
          </div>
        </div>
      ) : null}
        </>
      )}
    </section>
  );
}
