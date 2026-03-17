export default function RequestAdminPanel({
  item,
  stages,
  branchOptions,
  form,
  onChange,
  onSave,
  onDelete,
  isSubmitting,
  error
}) {
  if (!item) {
    return null;
  }

  return (
    <section className="panel action-panel">
      <div className="form-grid two-column">
        <label>
          Title
          <input name="title" value={form.title} onChange={onChange} />
        </label>
        <label>
          Department
          <input name="department" value={form.department} onChange={onChange} />
        </label>
        <label>
          Branch
          <select name="branch" value={form.branch} onChange={onChange}>
            {branchOptions.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input name="amount" value={form.amount} onChange={onChange} />
        </label>
        <label>
          Date needed
          <input
            name="dateNeeded"
            type="date"
            value={form.dateNeeded}
            onChange={onChange}
            onClick={(event) => event.target.showPicker?.()}
          />
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={onChange}>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Current stage
          <select name="currentStage" value={form.currentStage} onChange={onChange}>
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inspection
          <select name="inspectionStatus" value={form.inspectionStatus} onChange={onChange}>
            <option value="pending">Pending</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label>
          Supplier
          <input name="supplier" value={form.supplier} onChange={onChange} />
        </label>
        <label>
          PO number
          <input name="poNumber" value={form.poNumber} onChange={onChange} />
        </label>
        <label>
          Invoice number
          <input name="invoiceNumber" value={form.invoiceNumber} onChange={onChange} />
        </label>
        <label>
          Payment reference
          <input name="paymentReference" value={form.paymentReference} onChange={onChange} />
        </label>
      </div>

      <label>
        Description
        <textarea name="description" value={form.description} onChange={onChange} rows="3" />
      </label>

      <label>
        Notes
        <textarea name="notes" value={form.notes} onChange={onChange} rows="3" />
      </label>

      <div className="button-row">
        <button disabled={isSubmitting} type="button" onClick={onSave}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        <button className="danger-button" disabled={isSubmitting} type="button" onClick={onDelete}>
          Delete request
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
