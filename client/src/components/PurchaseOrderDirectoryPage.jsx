import { useMemo, useState } from "react";

function hasPurchaseOrderRecord(item) {
  return Boolean(String(item.poNumber || item.poDraft?.poNumber || "").trim());
}

function getStatusGroups(items) {
  const purchaseOrders = items.filter(hasPurchaseOrderRecord);
  const inactive = purchaseOrders.filter((item) => !String(item.poNumber || "").trim());
  const active = purchaseOrders.filter((item) => String(item.poNumber || "").trim() && item.status === "open");
  const completed = purchaseOrders.filter(
    (item) => String(item.poNumber || "").trim() && item.status === "completed"
  );

  return {
    all: purchaseOrders,
    inactive,
    active,
    completed
  };
}

export default function PurchaseOrderDirectoryPage({ items, onOpen, onClose }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const groups = useMemo(() => getStatusGroups(items), [items]);
  const visibleItems = groups[activeFilter] ?? groups.all;

  return (
    <section className="po-page">
      <div className="po-page-header">
        <div>
          <p className="eyebrow">Purchase Orders</p>
          <h1>Purchase Orders</h1>
          <p className="hero-copy">
            Review purchase order records by status and open any record in its own page.
          </p>
        </div>
        <div className="po-page-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Back to dashboard
          </button>
        </div>
      </div>

      <section className="stats-grid">
        <article className="panel stat-card">
          <span>PO</span>
          <strong>{groups.all.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>Inactive</span>
          <strong>{groups.inactive.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>Active (ongoing)</span>
          <strong>{groups.active.length}</strong>
        </article>
        <article className="panel stat-card">
          <span>Completed</span>
          <strong>{groups.completed.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Records</p>
            <h2>PO list</h2>
          </div>
          <span className="panel-counter">{visibleItems.length} purchase orders</span>
        </div>

        <div className="toolbar-actions left">
          <button
            className={activeFilter === "all" ? "" : "ghost-button"}
            type="button"
            onClick={() => setActiveFilter("all")}
          >
            PO
          </button>
          <button
            className={activeFilter === "inactive" ? "" : "ghost-button"}
            type="button"
            onClick={() => setActiveFilter("inactive")}
          >
            Inactive
          </button>
          <button
            className={activeFilter === "active" ? "" : "ghost-button"}
            type="button"
            onClick={() => setActiveFilter("active")}
          >
            Active (ongoing)
          </button>
          <button
            className={activeFilter === "completed" ? "" : "ghost-button"}
            type="button"
            onClick={() => setActiveFilter("completed")}
          >
            Completed
          </button>
        </div>

        <div className="supplier-directory-list">
          {visibleItems.map((item) => (
            <article key={item.id} className="request-list-item">
              <button className="supplier-card-button" type="button" onClick={() => onOpen(item.id)}>
                <div className="request-list-topline">
                  <strong>{item.poNumber || item.poDraft?.poNumber || "Draft PO"}</strong>
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
          {visibleItems.length === 0 ? (
            <p className="empty-state">No purchase orders available in this section.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
