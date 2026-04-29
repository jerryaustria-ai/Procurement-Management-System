import { useEffect, useId, useMemo, useState } from "react";
import Modal from "./Modal.jsx";

const RFP_PAYMENT_STATUS_OPTIONS = [
  "Processing",
  "For Liquidation",
  "Liquidation Submitted",
  "Liquidation Reviewed",
  "Liquidated / Closed"
];

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

function formatAmount(amount, currency) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency
  }).format(amount || 0);
}

function formatFileSize(size) {
  const numericSize = Number(size);

  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    return "";
  }

  if (numericSize >= 1024 * 1024) {
    return `${(numericSize / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (numericSize >= 1024) {
    return `${Math.round(numericSize / 1024)} KB`;
  }

  return `${numericSize} bytes`;
}

function getDocumentName(document, fallback = "Uploaded file") {
  return (
    String(document?.label || "").trim() ||
    String(document?.originalName || "").trim() ||
    String(document?.filename || "").trim() ||
    fallback
  );
}

function getDocumentExtension(document) {
  const source = getDocumentName(document, "")
    .split(".")
    .pop()
    ?.trim()
    .toUpperCase();

  return source || "FILE";
}

function getDocumentKind(document) {
  const source = `${String(document?.mimeType || "").toLowerCase()} ${getDocumentName(
    document,
    ""
  ).toLowerCase()}`;

  if (/image\/|\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.svg/.test(source)) {
    return "image";
  }

  if (/pdf|\.pdf/.test(source)) {
    return "pdf";
  }

  if (/spreadsheet|excel|\.xlsx|\.xls|\.csv/.test(source)) {
    return "spreadsheet";
  }

  if (/word|document|\.docx|\.doc/.test(source)) {
    return "document";
  }

  if (/text|\.txt/.test(source)) {
    return "text";
  }

  return "file";
}

function getDocumentKindLabel(document) {
  switch (getDocumentKind(document)) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF Document";
    case "spreadsheet":
      return "Excel Worksheet";
    case "document":
      return "Word Document";
    case "text":
      return "Text File";
    default:
      return "File";
  }
}

function getDocumentActionLabel(document) {
  return getDocumentKind(document) === "image" ? "View" : "Open / Download";
}

function DocumentTypeIcon({ document }) {
  const extension = getDocumentExtension(document);
  const kind = getDocumentKind(document);

  return (
    <div className={`rfp-file-type-icon rfp-file-type-icon-${kind}`} aria-hidden="true">
      <div className="rfp-file-type-icon-sheet">
        <span>{extension}</span>
      </div>
    </div>
  );
}

function UploadedFileCard({ document, onOpen, onDelete, canDelete }) {
  const sizeLabel = formatFileSize(document?.size);
  const uploadedAtLabel = formatDate(document?.uploadedAt);
  const metaParts = [getDocumentKindLabel(document), sizeLabel].filter(Boolean);

  return (
    <article className="rfp-uploaded-file-card">
      <div className="rfp-uploaded-file-meta">
        <DocumentTypeIcon document={document} />
        <div className="rfp-uploaded-file-copy">
          <strong>{getDocumentName(document)}</strong>
          <span>{metaParts.join(" • ")}</span>
          <small>Uploaded: {uploadedAtLabel}</small>
        </div>
      </div>
      <div className="rfp-uploaded-file-actions">
        <button className="ghost-button rfp-file-open-button" type="button" onClick={onOpen}>
          {getDocumentActionLabel(document)}
        </button>
        {canDelete ? (
          <button className="danger-secondary-button" type="button" onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function RequestForPaymentPage({
  item,
  form,
  errors = {},
  suppliers = [],
  currentInvoiceDocument = null,
  currentLiquidationDocument = null,
  embeddedInWorkspace = false,
  isEditing = true,
  canEdit = true,
  onChange,
  onInvoiceFileChange,
  onLiquidationFileChange,
  onOpenDocument,
  onDeleteInvoiceDocument,
  onDeleteLiquidationDocument,
  onSelectSupplier,
  onCreateSupplier,
  canCreateSupplier = false,
  onEdit,
  onCancel,
  onPrint,
  onSave,
  onSubmitForApproval,
  onClose,
  isSubmitting
}) {
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const invoiceInputId = useId();
  const liquidationInputId = useId();
  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = supplierSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contactPerson, supplier.email, supplier.phone, supplier.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [supplierSearch, suppliers]);
  const showSubmitToApproval = item.currentStage === "Request for Payment" && canEdit;
  const normalizedPaymentStatus = String(form.paymentStatus || "").trim().toLowerCase();
  const showInvoiceFields = normalizedPaymentStatus === "processing";
  const showLiquidationFields = normalizedPaymentStatus === "for liquidation";

  useEffect(() => {
    const normalizedPayee = String(form.payee || "").trim().toLowerCase();
    if (!normalizedPayee) {
      return;
    }

    if (String(form.tinNumber || "").trim()) {
      return;
    }

    const matchedSupplier = suppliers.find(
      (supplier) => String(supplier.name || "").trim().toLowerCase() === normalizedPayee
    );

    if (!matchedSupplier) {
      return;
    }

    const matchedTin = String(matchedSupplier.tinNumber || "");
    if (!matchedTin) {
      return;
    }

    onChange({
      target: {
        name: "tinNumber",
        value: matchedTin
      }
    });
  }, [form.payee, form.tinNumber, onChange, suppliers]);

  function handleFieldChange(name, value) {
    onChange({
      target: {
        name,
        value
      }
    });
  }

  function handleSupplierPick(supplier) {
    onSelectSupplier?.(supplier);
    setIsSupplierModalOpen(false);
    setSupplierSearch("");
  }

  const visibleDocuments = [
    showInvoiceFields && currentInvoiceDocument
      ? {
          key: "invoice",
          heading: "Invoice file",
          document: currentInvoiceDocument,
          onDelete: () => onDeleteInvoiceDocument?.(currentInvoiceDocument)
        }
      : null,
    showLiquidationFields && currentLiquidationDocument
      ? {
          key: "liquidation",
          heading: "Liquidation file",
          document: currentLiquidationDocument,
          onDelete: () => onDeleteLiquidationDocument?.(currentLiquidationDocument)
        }
      : null
  ].filter(Boolean);

  return (
    <section className={`po-page${embeddedInWorkspace ? " po-page-embedded" : ""}`}>
      {!embeddedInWorkspace ? (
        <div className="po-page-header">
          <div>
            <p className="eyebrow">Request for Payment</p>
            <h1>{item.requestNumber} Payment Request</h1>
            <p className="hero-copy">
              Prepare the payment request details in a focused workspace, then return to the
              procurement workflow.
            </p>
          </div>
          <div className="po-page-header-actions">
            <button
              className="po-secondary-action request-workspace-back-button"
              type="button"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M10 6 4 12l6 6M4 12h16"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              Back to dashboard
            </button>
          </div>
        </div>
      ) : null}

      <div className="po-page-grid">
        {!embeddedInWorkspace ? (
          <section className="panel rfp-reference-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reference</p>
                <h2>{item.requestNumber}</h2>
              </div>
            </div>
            <div className="summary-grid">
              <div>
                <span>Request title</span>
                <strong>{item.title}</strong>
              </div>
              <div>
                <span>Requester</span>
                <strong>{item.requester}</strong>
              </div>
              <div>
                <span>Supplier</span>
                <strong>{item.supplier || "Pending selection"}</strong>
              </div>
              <div>
                <span>PO number</span>
                <strong>{item.poNumber || "Pending"}</strong>
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
                <span>Branch</span>
                <strong>{item.branch || "Not set"}</strong>
              </div>
              <div>
                <span>Department</span>
                <strong>{item.department || "Not set"}</strong>
              </div>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Payment Details</p>
              <h2>Prepare request for payment</h2>
            </div>
          </div>
          <div className="form-grid two-column">
            <label className={`full-width-field${errors.payee ? " field-invalid" : ""}`}>
              Payee / supplier
              <div className="supplier-select-row">
                <input
                  name="payee"
                  value={form.payee}
                  onChange={onChange}
                  placeholder="Enter payee name"
                  disabled={!isEditing}
                  className={errors.payee ? "field-input-invalid" : ""}
                />
                <button
                  className="ghost-button supplier-select-button"
                  type="button"
                  disabled={!isEditing}
                  onClick={() => {
                    setSupplierSearch("");
                    setIsSupplierModalOpen(true);
                  }}
                >
                  Select
                </button>
              </div>
            </label>

            <label>
              TIN No.
              <input
                name="tinNumber"
                value={form.tinNumber || ""}
                onChange={onChange}
                placeholder="Enter TIN number"
                disabled={!isEditing}
              />
            </label>

            <label className={errors.amountRequested ? "field-invalid" : ""}>
              Amount requested
              <input
                name="amountRequested"
                value={form.amountRequested}
                onChange={onChange}
                disabled={!isEditing}
                className={errors.amountRequested ? "field-input-invalid" : ""}
              />
            </label>

            <label>
              Due date
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                readOnly
                disabled
              />
            </label>

            <label className="full-width-field">
              Status
              <select
                name="paymentStatus"
                value={form.paymentStatus || ""}
                onChange={onChange}
                disabled={!isEditing}
              >
                <option value="">Select status</option>
                {RFP_PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            {showInvoiceFields ? (
              <>
                <label>
                  Invoice number
                  <input
                    name="invoiceNumber"
                    value={form.invoiceNumber}
                    onChange={onChange}
                    placeholder="INV-2026-014"
                    disabled={!isEditing}
                  />
                </label>

                <section className="full-width-field rfp-file-manager-section">
                  <div className="rfp-file-manager-card">
                    <div className="rfp-file-manager-heading">
                      <h3>Attachments / Uploaded Files</h3>
                      <p>
                        Upload files to add attachments. You can view and delete files anytime.
                      </p>
                    </div>
                    <label className="rfp-upload-dropzone" htmlFor={invoiceInputId}>
                      <input
                        id={invoiceInputId}
                        className="rfp-upload-input"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                        onChange={onInvoiceFileChange}
                        disabled={!isEditing}
                      />
                      <div className="rfp-upload-dropzone-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M7 18a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18.5 12H19a3 3 0 0 1 0 6H7Z"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                          <path
                            d="M12 8v8M8.75 11.25 12 8l3.25 3.25"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>
                      <strong>{currentInvoiceDocument ? "Replace invoice file" : "Upload invoice file"}</strong>
                      <span>Click to choose a file</span>
                      <p>Allowed: Image, PDF, Word, Excel, TXT</p>
                      <small>Max size: 10MB per file</small>
                    </label>
                    {form.invoiceFile ? (
                      <span className="field-help-text">Selected: {form.invoiceFile.name}</span>
                    ) : null}
                    {errors.invoiceFile ? <span className="error-text">{errors.invoiceFile}</span> : null}
                  </div>
                </section>
              </>
            ) : null}

            {showLiquidationFields ? (
              <section className="full-width-field rfp-file-manager-section">
                <div className="rfp-file-manager-card">
                  <div className="rfp-file-manager-heading">
                    <h3>Attachments / Uploaded Files</h3>
                    <p>Upload files to add attachments. You can view and delete files anytime.</p>
                  </div>
                  <label className="rfp-upload-dropzone" htmlFor={liquidationInputId}>
                    <input
                      id={liquidationInputId}
                      className="rfp-upload-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      onChange={onLiquidationFileChange}
                      disabled={!isEditing}
                    />
                    <div className="rfp-upload-dropzone-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M7 18a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18.5 12H19a3 3 0 0 1 0 6H7Z"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                        <path
                          d="M12 8v8M8.75 11.25 12 8l3.25 3.25"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </div>
                    <strong>
                      {currentLiquidationDocument
                        ? "Replace liquidation file"
                        : "Upload liquidation file"}
                    </strong>
                    <span>Click to choose a file</span>
                    <p>Allowed: Image, PDF, Word, Excel, TXT</p>
                    <small>Max size: 10MB per file</small>
                  </label>
                  {form.liquidationFile ? (
                    <span className="field-help-text">Selected: {form.liquidationFile.name}</span>
                  ) : null}
                </div>
              </section>
            ) : null}

            <label className="full-width-field">
              Description
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows="6"
                placeholder="Use the requested item description"
                disabled={!isEditing}
              />
            </label>
          </div>
          {showInvoiceFields || showLiquidationFields ? (
            <section className="rfp-uploaded-files-panel">
              <div className="rfp-uploaded-files-header">
                <div>
                  <h3>Uploaded Files ({visibleDocuments.length})</h3>
                </div>
              </div>
              {visibleDocuments.length ? (
                <div className="rfp-uploaded-files-list">
                  {visibleDocuments.map(({ key, heading, document, onDelete }) => (
                    <div key={key} className="rfp-uploaded-file-group">
                      <p className="rfp-uploaded-file-group-title">{heading}</p>
                      <UploadedFileCard
                        document={document}
                        onOpen={() => onOpenDocument?.(document)}
                        onDelete={onDelete}
                        canDelete={isEditing}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No uploaded files yet.</p>
              )}
            </section>
          ) : null}
          <div className="panel-form-actions rfp-action-row">
            {isEditing ? (
              <>
                <button
                  className="ghost-button rfp-action-button"
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="rfp-action-button"
                  type="button"
                  onClick={onSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                {showSubmitToApproval ? (
                  <button
                    className="rfp-action-button rfp-submit-action"
                    type="button"
                    onClick={onSubmitForApproval}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit to Approval"}
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <button className="ghost-button rfp-action-button" type="button" onClick={onPrint}>
                  Print
                </button>
                {canEdit ? (
                  <button className="rfp-action-button" type="button" onClick={onEdit}>
                    Edit
                  </button>
                ) : null}
                {showSubmitToApproval ? (
                  <button
                    className="rfp-action-button rfp-submit-action"
                    type="button"
                    onClick={onSubmitForApproval}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit to Approval"}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>

      {isSupplierModalOpen ? (
        <Modal
          eyebrow="Request for Payment"
          title="Select Supplier"
          onClose={() => setIsSupplierModalOpen(false)}
          actions={
            canCreateSupplier ? (
              <button
                className="modal-icon-action"
                type="button"
                onClick={onCreateSupplier}
                aria-label="Add supplier"
                title="Add supplier"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 5v14M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2.2"
                  />
                </svg>
              </button>
            ) : null
          }
        >
          <div className="supplier-picker-modal">
            <label>
              Search supplier
              <input
                value={supplierSearch}
                onChange={(event) => setSupplierSearch(event.target.value)}
                placeholder="Search by supplier, contact person, email, or phone"
                autoComplete="off"
              />
            </label>

            <table className="supplier-table-grid">
              <thead>
                <tr className="supplier-table-header">
                  <th>Supplier</th>
                  <th>Contact</th>
                  <th>Email / Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className={form.payee === supplier.name ? "supplier-row selected" : "supplier-row"}
                    onClick={() => handleSupplierPick(supplier)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSupplierPick(supplier);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td>{supplier.name}</td>
                    <td>{supplier.contactPerson || "Not set"}</td>
                    <td>{supplier.email || supplier.phone || "Not set"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredSuppliers.length ? <div className="suggestion-empty">No matching suppliers</div> : null}
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
