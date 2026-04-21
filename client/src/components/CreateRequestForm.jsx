export default function CreateRequestForm({
  form,
  branchOptions,
  isAdmin,
  requesterOptions,
  onChange,
  onQuotationFileChange,
  onClearQuotationFile,
  quotationFile,
  quotationFileName,
  onSubmit,
  onCancel,
  errors = {},
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

        <label className={errors.title ? 'field-invalid' : ''}>
          Request title
          <input
            className={errors.title ? 'field-input-invalid' : ''}
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="Office chairs"
            required
          />
        </label>

        {isAdmin ? (
          <label>
            Department
            <input
              name="department"
              value={form.department}
              onChange={onChange}
              placeholder="Operations"
            />
          </label>
        ) : null}

        <label>
          Company
          <select name="branch" value={form.branch} onChange={onChange}>
            {branchOptions.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </label>

        <label className={errors.amount ? 'field-invalid' : ''}>
          Amount
          <input
            className={errors.amount ? 'field-input-invalid' : ''}
            name="amount"
            value={form.amount}
            onChange={onChange}
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

        {isAdmin ? (
          <label className="full-width-field">
            Delivery address
            <input
              name="deliveryAddress"
              value={form.deliveryAddress}
              onChange={onChange}
              placeholder="Main office or warehouse"
            />
          </label>
        ) : null}

      </div>

      <label className={errors.description ? 'field-invalid' : ''}>
        Description
        <textarea
          className={errors.description ? 'field-input-invalid' : ''}
          name="description"
          value={form.description}
          onChange={onChange}
          rows="4"
          placeholder="Item specifications or service scope"
          required
        />
      </label>

      <div className="create-request-divider" aria-hidden="true" />

      <div className="form-grid two-column">
        <label>
          Payee / Supplier
          <input
            name="supplier"
            value={form.supplier}
            onChange={onChange}
            placeholder="Enter payee or supplier name"
          />
        </label>

        <label className="create-request-upload-field">
          <span>Approved Quotation or Request</span>
          <input
            key={quotationFileName || 'empty-request-quotation'}
            id="request-quotation-upload"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={onQuotationFileChange}
          />
          {quotationFileName ? (
            <div className="create-request-upload-inline-row">
              <small>{quotationFileName}</small>
              <button
                className="ghost-button"
                type="button"
                onClick={() => onClearQuotationFile?.()}
              >
                Clear
              </button>
            </div>
          ) : null}
          <small>PDF, JPG, PNG, or WEBP only.</small>
        </label>
      </div>

      <div className="button-row create-request-actions">
        <button className="ghost-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button disabled={!canCreate || isSubmitting} onClick={onSubmit} type="button">
          {isSubmitting ? "Saving..." : "Create request"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
