export default function SupplierManagementPage({
  suppliers,
  selectedSupplierId,
  onSelect,
  onCreateNew,
  onEditSelected,
  onDeleteSelected,
  onClose,
  canManage
}) {
  return (
    <section className="po-page">
      <div className="po-page-header">
        <div>
          <p className="eyebrow">Supplier Directory</p>
          <h1>Suppliers</h1>
          <p className="hero-copy">View all suppliers in one place and manage supplier records.</p>
        </div>
        <div className="po-page-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Back to dashboard
          </button>
          {canManage ? (
            <button type="button" onClick={onCreateNew}>
              New supplier
            </button>
          ) : null}
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Records</p>
            <h2>All suppliers</h2>
          </div>
          <span className="panel-counter">{suppliers.length} suppliers</span>
        </div>

        <div className="supplier-directory-list">
          {suppliers.map((supplier) => (
            <article
              key={supplier.id}
              className={`request-list-item ${selectedSupplierId === supplier.id ? "selected" : ""}`}
            >
              <button
                type="button"
                className="supplier-card-button"
                onClick={() => onSelect(supplier.id)}
              >
                <div className="request-list-topline">
                  <strong>{supplier.name}</strong>
                  <small>{supplier.category}</small>
                </div>
                <span>{supplier.supplierType}</span>
                <small>{supplier.contactPerson || supplier.email || supplier.phone || "No contact details yet"}</small>
                {supplier.tinNumber ? <small>TIN: {supplier.tinNumber}</small> : null}
              </button>
              {canManage ? (
                <div className="request-list-footer">
                  <small>{supplier.createdBy || "No creator recorded"}</small>
                  <div className="request-list-actions-inline">
                    <button
                      className="request-open-link"
                      type="button"
                      onClick={() => onEditSelected(supplier.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="request-open-link danger-link"
                      type="button"
                      onClick={() => onDeleteSelected(supplier.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {suppliers.length === 0 ? <p className="empty-state">No suppliers available.</p> : null}
        </div>
      </section>
    </section>
  );
}
