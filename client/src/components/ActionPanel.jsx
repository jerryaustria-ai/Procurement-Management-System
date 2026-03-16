function StageField({ children }) {
  return <div className="stage-field">{children}</div>;
}

export default function ActionPanel({
  item,
  stages,
  user,
  form,
  onChange,
  onAdvance,
  isSubmitting,
  error
}) {
  const isComplete = item.currentStage === stages[stages.length - 1];
  const nextStage = stages[Math.min(stages.indexOf(item.currentStage) + 1, stages.length - 1)];
  const canAdvance = item.allowedRoles.includes(user.role);

  return (
    <section className="panel action-panel">
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
                placeholder="Enter supplier name"
              />
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

      <button disabled={isSubmitting || isComplete || !canAdvance} onClick={onAdvance} type="button">
        {isComplete ? "Workflow complete" : `Advance to ${nextStage}`}
      </button>

      {!canAdvance ? (
        <p className="error-text">Your role cannot advance the current stage.</p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
