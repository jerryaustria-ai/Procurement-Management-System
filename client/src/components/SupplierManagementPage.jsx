function SupplierDirectoryContent({
  suppliers,
  selectedSupplierId,
  onSelect,
  onCreateNew,
  onEditSelected,
  onDeleteSelected,
  canManage,
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Records</p>
          <h2>All suppliers</h2>
        </div>
        <div className="supplier-heading-actions">
          <span className="panel-counter">{suppliers.length} suppliers</span>
          {canManage ? (
            <button
              className="modal-icon-action supplier-heading-add"
              type="button"
              aria-label="Add supplier"
              title="Add supplier"
              onClick={onCreateNew}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 5v14M5 12h14"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          ) : null}
        </div>
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
              <small>
                {supplier.contactPerson ||
                  supplier.email ||
                  supplier.phone ||
                  "No contact details yet"}
              </small>
              {supplier.tinNumber ? <small>TIN: {supplier.tinNumber}</small> : null}
            </button>
            {canManage ? (
              <div className="request-list-footer">
                <small>{supplier.email || "No supplier email recorded"}</small>
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
        {suppliers.length === 0 ? (
          <p className="empty-state">No suppliers available.</p>
        ) : null}
      </div>
    </section>
  );
}

export default function SupplierManagementPage({
  suppliers,
  selectedSupplierId,
  onSelect,
  onCreateNew,
  onEditSelected,
  onDeleteSelected,
  onClose,
  canManage,
  embedded = false,
}) {
  const content = (
    <SupplierDirectoryContent
      suppliers={suppliers}
      selectedSupplierId={selectedSupplierId}
      onSelect={onSelect}
      onCreateNew={onCreateNew}
      onEditSelected={onEditSelected}
      onDeleteSelected={onDeleteSelected}
      canManage={canManage}
    />
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="po-page">
      <div className="po-page-header">
        <div>
          <p className="eyebrow">Supplier Directory</p>
          <h1>Suppliers</h1>
          <p className="hero-copy">
            View all suppliers in one place and manage supplier records.
          </p>
        </div>
        <div className="po-page-actions">
          <button
            className="po-secondary-action request-workspace-back-button"
            type="button"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M10 6 4 12l6 6M4 12h16"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            Back to dashboard
          </button>
        </div>
      </div>

      {content}
    </section>
  );
}
