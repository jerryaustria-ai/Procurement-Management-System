import PanelExpandButton from "./PanelExpandButton.jsx";

function StageField({ children }) {
  return <div className="stage-field">{children}</div>;
}

export default function ActionPanel({
  item,
  stages,
  user,
  form,
  supplierOptions,
  onChange,
  onAdvance,
  onBack,
  isSubmitting,
  error,
  onExpand,
  showExpand = true
}) {
  const currentIndex = stages.indexOf(item.currentStage);
  const isFirstStage = currentIndex <= 0;
  const isComplete = item.currentStage === stages[stages.length - 1];
  const nextStage = stages[Math.min(currentIndex + 1, stages.length - 1)];
  const previousStage = stages[Math.max(currentIndex - 1, 0)];
  const canAdvance = item.allowedRoles.includes(user.role);

  return (
    <section className="panel action-panel panel-with-expand">
      {showExpand && onExpand ? (
        <PanelExpandButton onClick={onExpand} label="Expand stage actions" />
      ) : null}
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Stage Actions</p>
          <h2>{item.currentStage}</h2>
        </div>
      </div>

      <div className="approval-meta">
        <span>Current owner</span>
        <strong>{item.allowedRoleLabels.join(", ")}</strong>
        <small>{item.currentStageDescription}</small>
      </div>

      <div className="form-grid">
        {["Supplier Selection", "Prepare PO", "Send PO"].includes(item.currentStage) ? (
          <StageField>
            <label>
              Supplier
              <input
                name="supplier"
                value={form.supplier}
                onChange={onChange}
                list={`supplier-options-${item.id}`}
                placeholder="Enter supplier name"
              />
              <datalist id={`supplier-options-${item.id}`}>
                {user.role === "admin" ? <option value="" label="Create new supplier" /> : null}
                {supplierOptions.map((supplier) => (
                  <option key={supplier} value={supplier} />
                ))}
              </datalist>
            </label>
          </StageField>
        ) : null}

        {["Prepare PO", "Approve PO", "Send PO"].includes(item.currentStage) ? (
          <StageField>
            <label>
              PO number
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
        {!isFirstStage ? (
          <button
            className="ghost-button"
            disabled={isSubmitting || !canAdvance}
            onClick={onBack}
            type="button"
          >
            {`Back to ${previousStage}`}
          </button>
        ) : null}
        <button disabled={isSubmitting || isComplete || !canAdvance} onClick={onAdvance} type="button">
          {isComplete ? "Workflow complete" : `Approve Move to ${nextStage}`}
        </button>
      </div>

      {!canAdvance ? (
        <p className="error-text">Your role cannot advance the current stage.</p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
