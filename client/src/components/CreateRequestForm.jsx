export default function CreateRequestForm({
  form,
  onChange,
  onSubmit,
  isSubmitting,
  canCreate
}) {
  return (
    <section className="panel action-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">New Request</p>
          <h2>Create purchase request</h2>
        </div>
      </div>

      <div className="form-grid two-column">
        <label>
          Request title
          <input name="title" value={form.title} onChange={onChange} placeholder="Office chairs" />
        </label>

        <label>
          Category
          <input
            name="category"
            value={form.category}
            onChange={onChange}
            placeholder="IT Equipment"
          />
        </label>

        <label>
          Department
          <input
            name="department"
            value={form.department}
            onChange={onChange}
            placeholder="Operations"
          />
        </label>

        <label>
          Priority
          <select name="priority" value={form.priority} onChange={onChange}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>

        <label>
          Amount
          <input name="amount" value={form.amount} onChange={onChange} placeholder="50000" />
        </label>

        <label>
          Date needed
          <input name="dateNeeded" type="date" value={form.dateNeeded} onChange={onChange} />
        </label>

        <label>
          Delivery address
          <input
            name="deliveryAddress"
            value={form.deliveryAddress}
            onChange={onChange}
            placeholder="Main office or warehouse"
          />
        </label>

        <label>
          Payment terms
          <input
            name="paymentTerms"
            value={form.paymentTerms}
            onChange={onChange}
            placeholder="Net 30"
          />
        </label>
      </div>

      <label>
        Description
        <textarea
          name="description"
          value={form.description}
          onChange={onChange}
          rows="4"
          placeholder="Item specifications or service scope"
        />
      </label>

      <label>
        Business justification
        <textarea
          name="notes"
          value={form.notes}
          onChange={onChange}
          rows="4"
          placeholder="Why the purchase is needed"
        />
      </label>

      <button disabled={!canCreate || isSubmitting} onClick={onSubmit} type="button">
        {isSubmitting ? "Saving..." : "Create request"}
      </button>
    </section>
  );
}
