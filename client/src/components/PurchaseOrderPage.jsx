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

export default function PurchaseOrderPage({
  item,
  form,
  onChange,
  onLineItemChange,
  onAddLineItem,
  onRemoveLineItem,
  onPrint,
  onSave,
  onClose,
  isSubmitting
}) {
  const subTotal = form.lineItems.reduce((sum, lineItem) => sum + parseMoney(lineItem.total), 0);
  const salesTax = parseMoney(form.salesTax);
  const shippingHandling = parseMoney(form.shippingHandling);
  const other = parseMoney(form.other);
  const netTotal = subTotal + salesTax + shippingHandling + other;

  return (
    <section className="po-page">
      <div className="po-page-header">
        <div>
          <p className="eyebrow">Purchase Order</p>
          <h1>{item.poNumber || form.poNumber || `Create PO for ${item.requestNumber}`}</h1>
          <p className="hero-copy">
            Prepare the purchase order details in a focused workspace, then return to stage
            actions when you are ready.
          </p>
        </div>
        <div className="po-page-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Back to workflow
          </button>
          <button className="ghost-button" type="button" onClick={onPrint}>
            Print PO
          </button>
          <button type="button" onClick={onSave} disabled={isSubmitting}>
            Save purchase order
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
              <span>Branch</span>
              <strong>{item.branch || "Not set"}</strong>
            </div>
            <div>
              <span>Department</span>
              <strong>{item.department || "Not set"}</strong>
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
              <span>Delivery address</span>
              <strong>{item.deliveryAddress || "Not set"}</strong>
            </div>
            <div>
              <span>Current stage</span>
              <strong>{item.currentStage}</strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PO Details</p>
              <h2>Prepare purchase order</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              PO number
              <input
                name="poNumber"
                value={form.poNumber}
                onChange={onChange}
                placeholder="PO-2026-001"
              />
            </label>

            <label>
              Supplier
              <input
                name="supplier"
                value={form.supplier}
                onChange={onChange}
                placeholder="Enter supplier name"
              />
            </label>

            <label>
              Delivery address
              <input value={item.deliveryAddress || "Not set"} readOnly />
            </label>

            <label>
              PO notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                rows="6"
                placeholder="Add purchase order notes, delivery instructions, or special terms"
              />
            </label>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Line Items</p>
            <h2>Purchase order breakdown</h2>
          </div>
          <button className="ghost-button" type="button" onClick={onAddLineItem}>
            Add line
          </button>
        </div>

        <div className="po-line-items">
          <div className="po-line-items-header">
            <span>Qty</span>
            <span>Unit</span>
            <span>Description</span>
            <span>Unit price</span>
            <span>Total</span>
            <span />
          </div>

          {form.lineItems.map((lineItem, index) => (
            <div className="po-line-item-row" key={lineItem.id}>
              <input
                value={lineItem.qty}
                onChange={(event) => onLineItemChange(index, "qty", event.target.value)}
                placeholder="1"
              />
              <input
                value={lineItem.unit}
                onChange={(event) => onLineItemChange(index, "unit", event.target.value)}
                placeholder="pcs"
              />
              <input
                value={lineItem.description}
                onChange={(event) => onLineItemChange(index, "description", event.target.value)}
                placeholder="Describe the item"
              />
              <input
                value={lineItem.unitPrice}
                onChange={(event) => onLineItemChange(index, "unitPrice", event.target.value)}
                placeholder="0.00"
              />
              <input value={lineItem.total} readOnly placeholder="0.00" />
              <button
                className="ghost-button"
                type="button"
                onClick={() => onRemoveLineItem(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="po-totals-grid">
          <label>
            Sub Total
            <input value={formatAmount(subTotal, item.currency)} readOnly />
          </label>
          <label>
            Sales Tax
            <input
              name="salesTax"
              value={form.salesTax}
              onChange={onChange}
              placeholder="0.00"
            />
          </label>
          <label>
            Shipping &amp; handling
            <input
              name="shippingHandling"
              value={form.shippingHandling}
              onChange={onChange}
              placeholder="0.00"
            />
          </label>
          <label>
            Other
            <input
              name="other"
              value={form.other}
              onChange={onChange}
              placeholder="0.00"
            />
          </label>
          <label className="po-net-total">
            Net Total
            <input value={formatAmount(netTotal, item.currency)} readOnly />
          </label>
        </div>
      </section>
    </section>
  );
}
