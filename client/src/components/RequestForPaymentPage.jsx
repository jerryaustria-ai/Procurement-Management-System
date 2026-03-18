function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatAmount(amount, currency) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency
  }).format(amount || 0);
}

export default function RequestForPaymentPage({
  item,
  form,
  onChange,
  onSave,
  onClose,
  isSubmitting
}) {
  return (
    <section className="po-page">
      <div className="po-page-header">
        <div>
          <p className="eyebrow">Request for Payment</p>
          <h1>{item.requestNumber} Payment Request</h1>
          <p className="hero-copy">
            Prepare the payment request details in a focused workspace, then return to the
            procurement workflow.
          </p>
        </div>
        <div className="po-page-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Back to workflow
          </button>
          <button type="button" onClick={onSave} disabled={isSubmitting}>
            Save request for payment
          </button>
        </div>
      </div>

      <div className="po-page-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Reference</p>
              <h2>{item.requestNumber}</h2>
            </div>
          </div>
          <div className="summary-grid">
            <div>
              <span>Request title</span>
              <strong>{item.title}</strong>
            </div>
            <div>
              <span>Requester</span>
              <strong>{item.requester}</strong>
            </div>
            <div>
              <span>Supplier</span>
              <strong>{item.supplier || "Pending selection"}</strong>
            </div>
            <div>
              <span>PO number</span>
              <strong>{item.poNumber || "Pending"}</strong>
            </div>
            <div>
              <span>Budget</span>
              <strong>{formatAmount(item.amount, item.currency)}</strong>
            </div>
            <div>
              <span>Date needed</span>
              <strong>{formatDate(item.dateNeeded)}</strong>
            </div>
            <div>
              <span>Branch</span>
              <strong>{item.branch || "Not set"}</strong>
            </div>
            <div>
              <span>Department</span>
              <strong>{item.department || "Not set"}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Payment Details</p>
              <h2>Prepare request for payment</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Payee / supplier
              <input
                name="payee"
                value={form.payee}
                onChange={onChange}
                placeholder="Enter payee name"
              />
            </label>

            <label>
              Invoice number
              <input
                name="invoiceNumber"
                value={form.invoiceNumber}
                onChange={onChange}
                placeholder="INV-2026-014"
              />
            </label>

            <label>
              Payment reference
              <input
                name="paymentReference"
                value={form.paymentReference}
                onChange={onChange}
                placeholder="RFP-2026-001"
              />
            </label>

            <label>
              Amount requested
              <input
                name="amountRequested"
                value={form.amountRequested}
                onChange={onChange}
                placeholder="0.00"
              />
            </label>

            <label>
              Due date
              <input
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={onChange}
              />
            </label>

            <label>
              Payment notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows="6"
                placeholder="Add payment instructions, supporting note, or approval summary"
              />
            </label>
          </div>
        </section>
      </div>
    </section>
  );
}
