export default function RequestList({ items, selectedId, onSelect }) {
  return (
    <section className="panel request-list-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Requests</p>
          <h2>Saved in MongoDB</h2>
        </div>
      </div>

      <div className="request-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`request-list-item ${selectedId === item.id ? "selected" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <strong>{item.requestNumber}</strong>
            <span>{item.title}</span>
            <small>
              {item.currentStage} · {item.priorityLabel}
            </small>
          </button>
        ))}
        {items.length === 0 ? (
          <p className="empty-state">No purchase requests yet. Create the first one below.</p>
        ) : null}
      </div>
    </section>
  );
}
