export default function CreateRequestForm({
  form,
  requestNumberPreview,
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
  const isCashAdvance = form.category === "Cash Advance"

  return (
    <section className="panel action-panel">
      <div className="create-request-type-box">
        <label className={errors.category ? 'field-invalid' : ''}>
          <span className="create-request-type-label">Request type *</span>
          <select
            className={errors.category ? 'field-input-invalid' : ''}
            name="category"
            value={form.category}
            onChange={onChange}
            required
          >
            {["Purchase Request", "Cash Advance", "Reimbursement"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid two-column">
        {isCashAdvance ? (
          <label>
            Request Number
            <input
              value={requestNumberPreview}
              readOnly
            />
          </label>
        ) : null}

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
        ) : isCashAdvance ? (
          <label>
            Requester
            <input
              value={form.requesterName}
              readOnly
            />
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

        <label>
          Department
          <input
            name="department"
            value={form.department}
            onChange={onChange}
            placeholder="Department name"
          />
        </label>

        {form.category === "Cash Advance" || form.category === "Purchase Request" ? (
          <label>
            Property / Project
            <input
              name="propertyProject"
              value={form.propertyProject}
              onChange={onChange}
              placeholder="Property or project name"
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

        <label className={errors.dateNeeded ? 'field-invalid' : ''}>
          Date needed
          <input
            className={errors.dateNeeded ? 'field-input-invalid' : ''}
            name="dateNeeded"
            type="date"
            value={form.dateNeeded}
            onChange={onChange}
            onClick={(event) => event.target.showPicker?.()}
            required
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

        <label>
          Mode of Release
          <select
            name="modeOfRelease"
            value={form.modeOfRelease}
            onChange={onChange}
          >
            <option value="">Select mode of release</option>
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Check">Check</option>
          </select>
        </label>

        {form.modeOfRelease === "Bank Transfer" ? (
          <>
            <label>
              Bank Name
              <input
                name="bankName"
                value={form.bankName}
                onChange={onChange}
                placeholder="Enter bank name"
              />
            </label>

            <label>
              Account Name
              <input
                name="accountName"
                value={form.accountName}
                onChange={onChange}
                placeholder="Enter account name"
              />
            </label>

            <label className="full-width-field">
              Account Number
              <input
                name="accountNumber"
                value={form.accountNumber}
                onChange={onChange}
                placeholder="Enter account number"
              />
            </label>
          </>
        ) : null}

        <label className="create-request-upload-field">
          <span>Approved Quotation or Request</span>
          <input
            key={quotationFileName || 'empty-request-quotation'}
            id="request-quotation-upload"
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
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
          <small>Images, PDF, Word, Excel, CSV, or text files only.</small>
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
