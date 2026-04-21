import { useState } from "react";
import Modal from "./Modal.jsx";
import PanelExpandButton from "./PanelExpandButton.jsx";

function StageField({ children }) {
  return <div className="stage-field">{children}</div>;
}

function parseMoney(value) {
  if (value === null || typeof value === "undefined") {
    return 0;
  }

  const normalized = String(value).replaceAll(",", "").trim();
  if (!normalized) {
    return 0;
  }

  return Number.parseFloat(normalized) || 0;
}

function formatAmount(amount, currency) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency
  }).format(amount || 0);
}

function getAdvanceButtonLabel(currentStage, nextStage, isComplete, workflowFinished) {
  if (workflowFinished) {
    return "Workflow complete";
  }

  if (isComplete) {
    return "Mark as Complete";
  }

  if (currentStage === "Review" || currentStage === "Approval") {
    return "Approve";
  }

  if (currentStage === "Request for Payment") {
    return "Submit to Approval";
  }

  if (currentStage === "Approve PO") {
    return "Approve PO";
  }

  return `Move to ${nextStage}`;
}

function getAdvanceLoadingLabel(currentStage, hasApprovalAttachment) {
  if ((currentStage === "Review" || currentStage === "Approval") && hasApprovalAttachment) {
    return "Uploading attachment...";
  }

  if (currentStage === "Review" || currentStage === "Approval") {
    return "Approving...";
  }

  if (currentStage === "Request for Payment") {
    return "Submitting...";
  }

  return "Processing...";
}

function isRejected(item) {
  return item.status === "rejected";
}

const STAGE_ROLE_LABELS = {
  "Purchase Request": "Requester, System Admin",
  Review: "Reviewer, System Admin",
  "Request for Payment": "Requester, System Admin",
  Approval: "Approver, System Admin",
  "Prepare PO": "Procurement Officer, System Admin",
  "Approve PO": "Approver, System Admin",
  "Send PO": "Procurement Officer, System Admin",
  Delivery: "Receiving Officer, System Admin",
  Inspection: "Inspector, System Admin",
  Invoice: "Finance Officer, System Admin",
  Matching: "Accountant, System Admin",
  Payment: "Treasury Officer, System Admin",
  Filing: "Records Officer, System Admin"
};

const STAGE_DESCRIPTIONS = {
  "Purchase Request": "Create and justify the business need.",
  Review: "Validate scope, budget, and completeness of the request.",
  "Request for Payment": "Finalize the payment request details before approval.",
  Approval: "Management approves the procurement request.",
  "Prepare PO": "Draft the purchase order details and reference numbers.",
  "Approve PO": "Authorize the prepared purchase order for release.",
  "Send PO": "Transmit the approved purchase order to the supplier.",
  Delivery: "Receive delivered goods or services from the supplier.",
  Inspection: "Inspect delivery for quantity and quality compliance.",
  Invoice: "Collect and log supplier invoice documents.",
  Matching: "Match request, PO, delivery, and invoice records.",
  Payment: "Release payment and record treasury reference.",
  Filing: "Archive the final procurement documents."
};

function getDisplayStageLabel(item, fallbackStage) {
  if (item.status === "completed" || item.filingCompleted) {
    return "Completed";
  }

  if (isRejected(item)) {
    return "Rejected";
  }

  return fallbackStage;
}

export default function ActionPanel({
  item,
  stages,
  user,
  form,
  purchaseOrderForm,
  uploadForm,
  suppliers = [],
  onChange,
  onPurchaseOrderChange,
  onPurchaseOrderLineItemChange,
  onAddPurchaseOrderLineItem,
  onRemovePurchaseOrderLineItem,
  onPrintPurchaseOrder,
  onReviewPurchaseOrder,
  onReviewAttachmentFileChange,
  onClearReviewAttachment,
  onCreateSupplier = () => {},
  onSupplierPick,
  onAdvance,
  onReject,
  onBack,
  isSubmitting,
  error,
  onExpand,
  showExpand = true
}) {
  const [supplierSearch, setSupplierSearch] = useState("");
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const currentIndex = stages.indexOf(item.currentStage);
  const isFirstStage = currentIndex <= 0;
  const isComplete = item.currentStage === stages[stages.length - 1];
  const isRejectedWorkflow = isRejected(item);
  const workflowFinished = isComplete && Boolean(item.filingCompleted);
  const nextStage = stages[Math.min(currentIndex + 1, stages.length - 1)];
  const previousStage = stages[Math.max(currentIndex - 1, 0)];
  const showBackButton =
    !isRejectedWorkflow &&
    !isFirstStage &&
    previousStage !== "Purchase Request" &&
    !(item.currentStage === "Approval" && user.role === "approver");
  const baseDisplayStage =
    item.currentStage === "Purchase Request" && !isComplete ? nextStage : item.currentStage;
  const displayStage = getDisplayStageLabel(item, baseDisplayStage);
  const displayOwner =
    item.currentStage === "Purchase Request" && !isComplete
      ? STAGE_ROLE_LABELS[displayStage] ?? item.allowedRoleLabels.join(", ")
      : item.allowedRoleLabels.join(", ");
  const displayDescription =
    item.currentStage === "Purchase Request" && !isComplete
      ? STAGE_DESCRIPTIONS[displayStage] ?? item.currentStageDescription
      : item.currentStageDescription;
  const canAdvance = item.allowedRoles.includes(user.role);
  const canReject =
    ["Review", "Approval"].includes(item.currentStage) && canAdvance && !isRejectedWorkflow;
  const showSupplierSearchField = item.currentStage === "Prepare PO";
  const showSupplierPickerField = item.currentStage === "Review";
  const showSupplierReadonlyField = ["Send PO"].includes(item.currentStage);
  const normalizedSupplier = supplierSearch.trim().toLowerCase();
  const supplierFieldValue = form.supplier === "Pending selection" ? "" : form.supplier;
  const filteredSuppliers = suppliers.filter((supplier) =>
    normalizedSupplier
      ? [supplier.name, supplier.contactPerson, supplier.email, supplier.phone, supplier.address]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSupplier))
      : true
  );
  const poSubTotal = (purchaseOrderForm?.lineItems ?? []).reduce(
    (sum, lineItem) => sum + parseMoney(lineItem.total),
    0
  );
  const poSalesTax = parseMoney(purchaseOrderForm?.salesTax);
  const poShippingHandling = parseMoney(purchaseOrderForm?.shippingHandling);
  const poOther = parseMoney(purchaseOrderForm?.other);
  const poNetTotal = poSubTotal + poSalesTax + poShippingHandling + poOther;
  const approvalAttachmentInputId = `approval-attachment-${item.id}`;
  const advanceButtonLabel = getAdvanceButtonLabel(
    item.currentStage,
    nextStage,
    isComplete,
    workflowFinished
  );
  const advanceLoadingLabel = getAdvanceLoadingLabel(
    item.currentStage,
    Boolean(uploadForm.file)
  );
  const showReviewPoButton =
    item.currentStage === "Approve PO" && user.role === "approver";
  async function handleSupplierPick(value) {
    if (typeof onSupplierPick === "function") {
      await onSupplierPick(value);
    } else {
      onChange({
        target: {
          name: "supplier",
          value
        }
      });
    }

    setSupplierSearch("");
    setIsSupplierModalOpen(false);
  }

  return (
    <section className="panel action-panel panel-with-expand">
      {showExpand && onExpand ? (
        <PanelExpandButton onClick={onExpand} label="Expand stage actions" />
      ) : null}
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Stage Actions</p>
          <h2>{displayStage}</h2>
        </div>
        <div className="stage-tooltip">
          <button
            className="stage-tooltip-button"
            type="button"
            aria-label="Show current owner details"
            title="Current owner details"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 10.2v5.2M12 7.8h.01"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
          <div className="stage-tooltip-card" role="tooltip">
            <span>Current owner</span>
            <strong>{displayOwner}</strong>
            <small>
              {isRejectedWorkflow
                ? "This request was declined and the workflow has been stopped."
                : displayDescription}
            </small>
          </div>
        </div>
      </div>

      <div className="form-grid">
        {["Prepare PO", "Approve PO", "Send PO"].includes(item.currentStage) ? (
          <StageField>
            <label>
              <span className="field-label-row">
                <span>PO number</span>
              </span>
              <input
                name="poNumber"
                value={purchaseOrderForm.poNumber}
                onChange={onPurchaseOrderChange}
                placeholder="PO-2026-001"
                readOnly
              />
            </label>
          </StageField>
        ) : null}

        {showSupplierSearchField ? (
          <StageField>
            <label>
              Supplier
              <div className="supplier-select-row">
                <input value={form.supplier} readOnly placeholder="No supplier selected" />
                <button
                  className="ghost-button supplier-select-button"
                  type="button"
                  onClick={() => {
                    setSupplierSearch("");
                    setIsSupplierModalOpen(true);
                  }}
                >
                  Select
                </button>
              </div>
            </label>
          </StageField>
        ) : null}

        {showSupplierReadonlyField ? (
          <StageField>
            <label>
              Supplier
              <input
                name="supplier"
                value={form.supplier}
                onChange={onChange}
                readOnly={item.currentStage === "Prepare PO"}
                placeholder="Enter supplier name"
              />
            </label>
          </StageField>
        ) : null}

        {item.currentStage === "Prepare PO" ? (
          <>
            <StageField>
              <label>
                PO notes
                <textarea
                  name="notes"
                  value={purchaseOrderForm.notes}
                  onChange={onPurchaseOrderChange}
                  rows="4"
                  placeholder="Add purchase order notes, delivery instructions, or special terms"
                />
              </label>
            </StageField>

            <div className="stage-field po-breakdown-section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Line Items</p>
                  <h3>Purchase Order Breakdown</h3>
                </div>
              </div>

              <div className="po-line-items">
                <div className="po-line-items-header">
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Description</span>
                  <span>Unit price</span>
                  <span>Total</span>
                  <span>Actions</span>
                </div>

                {purchaseOrderForm.lineItems.map((lineItem, index) => (
                  <div className="po-line-item-row" key={lineItem.id}>
                    <input
                      value={lineItem.qty}
                      onChange={(event) =>
                        onPurchaseOrderLineItemChange(index, "qty", event.target.value)
                      }
                      placeholder="1"
                    />
                    <input
                      value={lineItem.unit}
                      onChange={(event) =>
                        onPurchaseOrderLineItemChange(index, "unit", event.target.value)
                      }
                      placeholder="pcs"
                    />
                    <input
                      value={lineItem.description}
                      onChange={(event) =>
                        onPurchaseOrderLineItemChange(index, "description", event.target.value)
                      }
                      placeholder="Describe the item"
                    />
                    <input
                      value={lineItem.unitPrice}
                      onChange={(event) =>
                        onPurchaseOrderLineItemChange(index, "unitPrice", event.target.value)
                      }
                      placeholder="0.00"
                    />
                    <input value={lineItem.total} readOnly placeholder="0.00" />
                    <div className="po-line-item-actions">
                      <button
                        className="line-action-icon"
                        type="button"
                        onClick={() => onRemovePurchaseOrderLineItem(index)}
                        aria-label="Remove line"
                        title="Remove line"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M6 12h12"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="2.2"
                          />
                        </svg>
                      </button>
                      {index === purchaseOrderForm.lineItems.length - 1 ? (
                        <button
                          className="line-action-icon"
                          type="button"
                          onClick={onAddPurchaseOrderLineItem}
                          aria-label="Add line"
                          title="Add line"
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
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="po-totals-grid">
                <label>
                  Sub Total
                  <input value={formatAmount(poSubTotal, item.currency)} readOnly />
                </label>
                <label>
                  Sales Tax
                  <input
                    name="salesTax"
                    value={purchaseOrderForm.salesTax}
                    onChange={onPurchaseOrderChange}
                    placeholder="0.00"
                  />
                </label>
                <label>
                  Shipping &amp; handling
                  <input
                    name="shippingHandling"
                    value={purchaseOrderForm.shippingHandling}
                    onChange={onPurchaseOrderChange}
                    placeholder="0.00"
                  />
                </label>
                <label>
                  Other
                  <input
                    name="other"
                    value={purchaseOrderForm.other}
                    onChange={onPurchaseOrderChange}
                    placeholder="0.00"
                  />
                </label>
                <label className="po-net-total">
                  Net Total
                  <input value={formatAmount(poNetTotal, item.currency)} readOnly />
                </label>
              </div>

            </div>
          </>
        ) : null}

        {item.currentStage === "Delivery" ? (
          <StageField>
            <label>
              Delivery date
              <input
                name="deliveryDate"
                type="date"
                value={form.deliveryDate}
                onChange={onChange}
              />
            </label>
          </StageField>
        ) : null}

        {item.currentStage === "Inspection" ? (
          <StageField>
            <label>
              Inspection result
              <select
                name="inspectionStatus"
                value={form.inspectionStatus}
                onChange={onChange}
              >
                <option value="pending">Pending</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </StageField>
        ) : null}

        {["Invoice", "Matching"].includes(item.currentStage) ? (
          <StageField>
            <label>
              Invoice number
              <input
                name="invoiceNumber"
                value={form.invoiceNumber}
                onChange={onChange}
                placeholder="INV-2026-014"
              />
            </label>
          </StageField>
        ) : null}

        {item.currentStage === "Payment" ? (
          <StageField>
            <label>
              Payment reference
              <input
                name="paymentReference"
                value={form.paymentReference}
                onChange={onChange}
                placeholder="CV-2026-0038"
              />
            </label>
          </StageField>
        ) : null}
      </div>

      {["Review", "Approval"].includes(item.currentStage) ? (
        <div className="stage-notes-layout">
          <div className="approval-upload-section">
            <span className="approval-upload-label">Approval attachment</span>
            <label
              className={`approval-upload-dropzone ${isRejectedWorkflow ? "is-disabled" : ""}`}
              htmlFor={approvalAttachmentInputId}
            >
              <input
                key={uploadForm.file?.name ?? "empty-approval-file"}
                id={approvalAttachmentInputId}
                className="approval-upload-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={onReviewAttachmentFileChange}
                disabled={isRejectedWorkflow}
              />
              <span className="approval-upload-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M12 16V7m0 0-3.5 3.5M12 7l3.5 3.5M5 16.5v1a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-1"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              <span className="approval-upload-title">Upload File</span>
            </label>

            {uploadForm.file ? (
              <div className="approval-upload-file-pill">
                <span className="approval-upload-file-name">{uploadForm.file.name}</span>
                <button
                  className="approval-upload-remove"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onClearReviewAttachment();
                  }}
                  aria-label="Remove selected approval attachment"
                  title="Remove file"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M8 8l8 8M16 8l-8 8"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.2"
                    />
                  </svg>
                </button>
              </div>
            ) : null}

            {!uploadForm.file ? (
              <p className="panel-support">
                Upload the attachment that proves this purchase request was approved by the boss.
              </p>
            ) : (
              <p className="panel-support">
                The selected file will be uploaded automatically when you click Approve.
              </p>
            )}
          </div>

          <div className="stage-notes-panel">
            {item.currentStage === "Review" ? (
              <label className="stage-inline-field">
                Payee / Supplier
                <div className="supplier-select-row">
                  <input
                    name="supplier"
                    value={supplierFieldValue}
                    onChange={onChange}
                    placeholder="Enter payee or supplier name"
                    disabled={isRejectedWorkflow}
                  />
                  <button
                    className="ghost-button supplier-select-button supplier-select-icon-button"
                    type="button"
                    onClick={() => {
                      setSupplierSearch("");
                      setIsSupplierModalOpen(true);
                    }}
                    aria-label="Select supplier"
                    title="Select supplier"
                    disabled={isRejectedWorkflow}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="6" cy="12" r="1.8" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                      <circle cx="18" cy="12" r="1.8" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </label>
            ) : null}

            <label>
              Stage notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows="4"
                placeholder="Add reviewer, approver, or finance notes"
                disabled={isRejectedWorkflow}
              />
            </label>
          </div>
        </div>
      ) : (
        <label>
          Stage notes
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows="4"
            placeholder="Add reviewer, approver, or finance notes"
            disabled={isRejectedWorkflow}
          />
        </label>
      )}

      <div className="button-row">
        {showReviewPoButton ? (
          <button
            className="ghost-button"
            disabled={isSubmitting || !canAdvance}
            onClick={onReviewPurchaseOrder}
            type="button"
          >
            Review PO
          </button>
        ) : null}
        {showBackButton && !showReviewPoButton ? (
          <button
            className="ghost-button"
            disabled={isSubmitting || !canAdvance}
            onClick={onBack}
            type="button"
          >
            {`Back to ${previousStage}`}
          </button>
        ) : null}
        {canReject ? (
          <button
            className="danger-button"
            disabled={isSubmitting}
            onClick={onReject}
            type="button"
          >
            Decline
          </button>
        ) : null}
        <button
          disabled={isSubmitting || workflowFinished || !canAdvance || isRejectedWorkflow}
          onClick={onAdvance}
          type="button"
        >
          {isSubmitting ? advanceLoadingLabel : advanceButtonLabel}
        </button>
        {item.currentStage === "Review" ? (
          <label className="stage-checkbox-row action-inline-checkbox">
            <input
              type="checkbox"
              name="notifyApprover"
              checked={Boolean(form.notifyApprover)}
              onChange={onChange}
              disabled={isRejectedWorkflow || isSubmitting}
            />
            <span>Notify approver via email</span>
          </label>
        ) : null}
        {item.currentStage === "Prepare PO" ? (
          <button
            className="print-po-icon"
            type="button"
            onClick={onPrintPurchaseOrder}
            aria-label="Print purchase order"
            title="Print PO"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 9V5h10v4M7 17h10v2H7zm-1-7h12a2 2 0 0 1 2 2v3h-3v-2H7v2H4v-3a2 2 0 0 1 2-2Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.9"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {!canAdvance ? (
        <p className="error-text">Your role cannot advance the current stage.</p>
      ) : null}
      {isRejectedWorkflow ? (
        <p className="error-text">This request has been rejected and can no longer continue.</p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}

      {(showSupplierSearchField || showSupplierPickerField) && isSupplierModalOpen ? (
        <Modal
          eyebrow={item.currentStage}
          title="Select Supplier"
          onClose={() => setIsSupplierModalOpen(false)}
          actions={
            user.role === "admin" ? (
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
                    className={form.supplier === supplier.name ? "supplier-row selected" : "supplier-row"}
                    onClick={() => handleSupplierPick(supplier.name)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSupplierPick(supplier.name);
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
