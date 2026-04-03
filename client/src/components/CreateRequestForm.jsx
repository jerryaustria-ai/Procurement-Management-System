export default function CreateRequestForm({
  form,
  branchOptions,
  isAdmin,
  requesterOptions,
  onChange,
  onQuotationFileChange,
  quotationFileName,
  onSubmit,
  isSubmitting,
  canCreate,
  error
}) {
  return (
    <section className="panel action-panel">
      <div className="form-grid two-column">
        {isAdmin ? (
          <label>
            Requester
            <select
              name="requesterEmail"
              value={form.requesterEmail}
              onChange={onChange}
            >
              <option value="">Select a system user</option>
              {requesterOptions.map((user) => (
                <option key={user.id} value={user.email}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          Request title
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="Office chairs"
            required
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
          <input
            name="amount"
            value={form.amount}
            onChange={onChange}
            placeholder="50000"
            inputMode="decimal"
          />
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

        <label className="full-width-field">
          Delivery address
          <input
            name="deliveryAddress"
            value={form.deliveryAddress}
            onChange={onChange}
            placeholder="Main office or warehouse"
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
        Approved Quotation or Request
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={onQuotationFileChange}
        />
        <small>PDF, JPG, PNG, or WEBP only.</small>
        {quotationFileName ? <small>{quotationFileName}</small> : null}
      </label>

      <button disabled={!canCreate || isSubmitting} onClick={onSubmit} type="button">
        {isSubmitting ? "Saving..." : "Create request"}
      </button>

      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
