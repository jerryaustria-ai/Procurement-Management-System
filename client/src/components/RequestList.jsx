export default function RequestList({ items, selectedId, onSelect }) {
  return (
    <section className="panel request-list-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Requests</p>
          <h2>Request Registry</h2>
        </div>
        <span className="panel-counter">{items.length} total</span>
      </div>

      <div className="request-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`request-list-item ${selectedId === item.id ? "selected" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <div className="request-list-topline">
              <strong>{item.requestNumber}</strong>
              <span className={`mini-pill priority-${item.priority}`}>{item.priorityLabel}</span>
            </div>
            <span>{item.title}</span>
            <small>{item.department}</small>
            <div className="request-list-footer">
              <small>{item.currentStage}</small>
              <small>{item.status === "completed" ? "Closed" : "Open"}</small>
            </div>
          </button>
        ))}
        {items.length === 0 ? (
          <p className="empty-state">No purchase requests yet. Create the first one below.</p>
        ) : null}
      </div>
    </section>
  );
}
