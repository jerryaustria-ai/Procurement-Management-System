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

  if (currentStage === "Approve PO") {
    return "Approve PO";
  }

  return `Move to ${nextStage}`;
}

function isRejected(item) {
  return item.status === "rejected";
}

const STAGE_ROLE_LABELS = {
  "Purchase Request": "Requester, System Admin",
  Review: "Reviewer, System Admin",
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
    return "Complete";
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
  onReviewAttachmentFileChange,
  onUpload,
  onCreateSupplier = () => {},
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
    !isRejectedWorkflow && !isFirstStage && previousStage !== "Purchase Request";
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
  const showSupplierReadonlyField = ["Send PO"].includes(item.currentStage);
  const normalizedSupplier = supplierSearch.trim().toLowerCase();
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

  function handleSupplierPick(value) {
    onChange({
      target: {
        name: "supplier",
        value
      }
    });
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
      </div>

      <div className="approval-meta">
        <span>Current owner</span>
        <strong>{displayOwner}</strong>
        <small>
          {isRejectedWorkflow
            ? "This request was declined and the workflow has been stopped."
            : displayDescription}
        </small>
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

      {item.currentStage === "Review" ? (
        <>
          <label>
            Approval attachment
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={onReviewAttachmentFileChange}
              disabled={isRejectedWorkflow}
            />
          </label>

          {uploadForm.file ? (
            <p className="panel-support">
              Selected file: <strong>{uploadForm.file.name}</strong>
            </p>
          ) : (
            <p className="panel-support">
              Upload the attachment that proves this purchase request was approved by the boss.
            </p>
          )}

          <button
            className="ghost-button"
            disabled={isSubmitting || !uploadForm.file || isRejectedWorkflow}
            type="button"
            onClick={onUpload}
          >
            Upload approval attachment
          </button>
        </>
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

      <div className="button-row">
        {showBackButton ? (
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
          {getAdvanceButtonLabel(item.currentStage, nextStage, isComplete, workflowFinished)}
        </button>
        {item.currentStage === "Approval" ? (
          <label className="stage-inline-checkbox">
            <input
              type="checkbox"
              name="skipToRfp"
              checked={Boolean(form.skipToRfp)}
              onChange={onChange}
            />
            <span className="stage-toggle-track" aria-hidden="true">
              <span className="stage-toggle-thumb" />
            </span>
            <span>Enable RFP</span>
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

      {showSupplierSearchField && isSupplierModalOpen ? (
        <Modal
          eyebrow="Prepare PO"
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
