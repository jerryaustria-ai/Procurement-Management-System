import { useEffect, useRef, useState } from "react";
import PanelExpandButton from "./PanelExpandButton.jsx";

function StageField({ children }) {
  return <div className="stage-field">{children}</div>;
}

function getAdvanceButtonLabel(currentStage, nextStage, isComplete) {
  if (isComplete) {
    return "Workflow complete";
  }

  if (currentStage === "Review") {
    return "Approve";
  }

  if (currentStage === "Approval") {
    return "Next to Supplier Selection";
  }

  if (currentStage === "Approve PO") {
    return "Approve PO";
  }

  return `Move to ${nextStage}`;
}

const STAGE_ROLE_LABELS = {
  "Purchase Request": "Requester, System Admin",
  Review: "Reviewer, System Admin",
  Approval: "Approver, System Admin",
  "Supplier Selection": "Procurement Officer, System Admin",
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
  "Supplier Selection": "Compare vendors and pick the preferred supplier.",
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

export default function ActionPanel({
  item,
  stages,
  user,
  form,
  supplierOptions,
  onChange,
  onCreateSupplier = () => {},
  onAdvance,
  onApproveStage,
  onBack,
  onOpenPurchaseOrderPage,
  isSubmitting,
  error,
  onExpand,
  showExpand = true
}) {
  const [isSupplierMenuOpen, setIsSupplierMenuOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const supplierSelectRef = useRef(null);
  const currentIndex = stages.indexOf(item.currentStage);
  const isFirstStage = currentIndex <= 0;
  const isComplete = item.currentStage === stages[stages.length - 1];
  const nextStage = stages[Math.min(currentIndex + 1, stages.length - 1)];
  const previousStage = stages[Math.max(currentIndex - 1, 0)];
  const showBackButton = !isFirstStage && previousStage !== "Purchase Request";
  const isApprovalStage = item.currentStage === "Approval";
  const displayStage = item.currentStage === "Purchase Request" && !isComplete ? nextStage : item.currentStage;
  const displayOwner =
    item.currentStage === "Purchase Request" && !isComplete
      ? STAGE_ROLE_LABELS[displayStage] ?? item.allowedRoleLabels.join(", ")
      : item.allowedRoleLabels.join(", ");
  const displayDescription =
    item.currentStage === "Purchase Request" && !isComplete
      ? STAGE_DESCRIPTIONS[displayStage] ?? item.currentStageDescription
      : item.currentStageDescription;
  const canAdvance = item.allowedRoles.includes(user.role);
  const normalizedSupplier = supplierSearch.trim().toLowerCase();
  const filteredSupplierOptions = supplierOptions.filter((supplier) =>
    normalizedSupplier ? supplier.toLowerCase().includes(normalizedSupplier) : true
  );
  const showSupplierMenu =
    isSupplierMenuOpen && (user.role === "admin" || filteredSupplierOptions.length || normalizedSupplier);

  useEffect(() => {
    setSupplierSearch(form.supplier || "");
  }, [form.supplier]);

  useEffect(() => {
    if (!isSupplierMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!supplierSelectRef.current?.contains(event.target)) {
        setIsSupplierMenuOpen(false);
        setSupplierSearch(form.supplier || "");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [form.supplier, isSupplierMenuOpen]);

  function handleSupplierPick(value) {
    onChange({
      target: {
        name: "supplier",
        value
      }
    });
    setSupplierSearch(value);
    setIsSupplierMenuOpen(false);
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
        <small>{displayDescription}</small>
      </div>

      <div className="form-grid">
        {["Supplier Selection", "Prepare PO", "Send PO"].includes(item.currentStage) ? (
          <StageField>
            <label>
              Select with search
              <div className="searchable-select" ref={supplierSelectRef}>
                <div className="searchable-select-trigger-wrap">
                  <button
                    className="searchable-select-trigger"
                    type="button"
                    onClick={() => {
                      setSupplierSearch(form.supplier || "");
                      setIsSupplierMenuOpen((current) => !current);
                    }}
                  >
                    <span>{form.supplier || "Select supplier"}</span>
                    <span className="searchable-select-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                </div>
              </div>
              {showSupplierMenu ? (
                <div className="suggestion-menu">
                  <div className="suggestion-search">
                    <input
                      value={supplierSearch}
                      onChange={(event) => setSupplierSearch(event.target.value)}
                      placeholder="Search"
                      autoComplete="off"
                    />
                  </div>
                  {user.role === "admin" ? (
                    <button
                      className="suggestion-link"
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setIsSupplierMenuOpen(false);
                        onCreateSupplier();
                      }}
                    >
                      Create new supplier
                    </button>
                  ) : null}
                  {filteredSupplierOptions.map((supplier) => (
                    <button
                      key={supplier}
                      className="suggestion-item"
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSupplierPick(supplier);
                      }}
                    >
                      {supplier}
                    </button>
                  ))}
                  {!filteredSupplierOptions.length ? (
                    <div className="suggestion-empty">No matching suppliers</div>
                  ) : null}
                </div>
              ) : null}
            </label>
          </StageField>
        ) : null}

        {["Prepare PO", "Approve PO", "Send PO"].includes(item.currentStage) ? (
          <StageField>
            <label>
              <span className="field-label-row">
                <span>PO number</span>
                {onOpenPurchaseOrderPage ? (
                  <button className="field-inline-link" type="button" onClick={onOpenPurchaseOrderPage}>
                    Create
                  </button>
                ) : null}
              </span>
              <input
                name="poNumber"
                value={form.poNumber}
                onChange={onChange}
                placeholder="PO-2026-001"
              />
            </label>
          </StageField>
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

      <label>
        Stage notes
        <textarea
          name="notes"
          value={form.notes}
          onChange={onChange}
          rows="4"
          placeholder="Add reviewer, approver, or finance notes"
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
        {isApprovalStage ? (
          item.approvalCompleted ? (
            <button
              className="field-inline-link action-link-button"
              disabled={isSubmitting || !canAdvance}
              onClick={onAdvance}
              type="button"
            >
              Next to Supplier Selection
            </button>
          ) : (
            <button
              disabled={isSubmitting || !canAdvance}
              onClick={onApproveStage}
              type="button"
            >
              Approve
            </button>
          )
        ) : (
          <button disabled={isSubmitting || isComplete || !canAdvance} onClick={onAdvance} type="button">
            {getAdvanceButtonLabel(item.currentStage, nextStage, isComplete)}
          </button>
        )}
      </div>

      {!canAdvance ? (
        <p className="error-text">Your role cannot advance the current stage.</p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
