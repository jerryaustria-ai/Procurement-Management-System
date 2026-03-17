import PanelExpandButton from "./PanelExpandButton.jsx";

function getProcurementStatus(item) {
  return item.status === "completed"
    ? "Completed and ready for filing archive"
    : "Actively moving through approvals";
}

export default function RequestList({
  items,
  selectedId,
  onSelect,
  onOpenDetails,
  onExportCsv,
  onExportPdf,
  onExpand,
  showExpand = true
}) {
  return (
    <section className="panel request-list-panel panel-with-expand">
      {showExpand && onExpand ? (
        <PanelExpandButton onClick={onExpand} label="Expand request registry" />
      ) : null}
      <div className="panel-heading request-list-heading">
        <div>
          <p className="eyebrow">Requests</p>
          <h2>Request Registry</h2>
        </div>
        <div className="request-list-tools">
          <span className="panel-counter">{items.length} total</span>
          <div className="request-list-actions">
            <button className="ghost-button" type="button" onClick={onExportCsv}>
              Export CSV
            </button>
            <button className="ghost-button" type="button" onClick={onExportPdf}>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="request-list">
        {items.map((item) => (
          <article
            key={item.id}
            className={`request-list-item ${selectedId === item.id ? "selected" : ""}`}
          >
            <button className="request-card-select" type="button" onClick={() => onSelect(item.id)}>
              <div className="request-list-topline">
                <strong>{item.requestNumber}</strong>
              </div>
              <span>{item.title}</span>
              <small>
                {item.branch} · {item.department}
              </small>
            </button>
            <div className="request-list-footer">
              <small>{getProcurementStatus(item)}</small>
              <button className="request-open-link" type="button" onClick={() => onOpenDetails(item.id)}>
                Open
              </button>
            </div>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="empty-state">No requests available.</p>
        ) : null}
      </div>
    </section>
  );
}
