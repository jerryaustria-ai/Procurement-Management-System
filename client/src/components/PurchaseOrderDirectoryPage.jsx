export default function PurchaseOrderDirectoryPage({ items, onOpen, onClose }) {
  return (
    <section className="po-page">
      <div className="po-page-header">
        <div>
          <p className="eyebrow">Purchase Orders</p>
          <h1>Active Purchase Orders</h1>
          <p className="hero-copy">
            Review the active purchase orders that have already been created and open any record in
            its own page.
          </p>
        </div>
        <div className="po-page-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Back to dashboard
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Records</p>
            <h2>Active PO list</h2>
          </div>
          <span className="panel-counter">{items.length} purchase orders</span>
        </div>

        <div className="supplier-directory-list">
          {items.map((item) => (
            <article key={item.id} className="request-list-item">
              <button className="supplier-card-button" type="button" onClick={() => onOpen(item.id)}>
                <div className="request-list-topline">
                  <strong>{item.poNumber}</strong>
                  <small>{item.currentStage}</small>
                </div>
                <span>{item.title}</span>
                <small>
                  {item.supplier || "Pending supplier"} · {item.requestNumber}
                </small>
              </button>
              <div className="request-list-footer">
                <small>{item.branch || "No branch set"}</small>
                <div className="request-list-actions-inline">
                  <button className="request-open-link" type="button" onClick={() => onOpen(item.id)}>
                    Open
                  </button>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 ? (
            <p className="empty-state">No active purchase orders available.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
