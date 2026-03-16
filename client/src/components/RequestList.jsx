export default function RequestList({
  items,
  selectedId,
  onSelect,
  stages,
  filters,
  onFilterChange,
  onResetFilters,
  onExportCsv,
  onExportPdf
}) {
  return (
    <section className="panel request-list-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Requests</p>
          <h2>Request Registry</h2>
        </div>
        <span className="panel-counter">{items.length} total</span>
      </div>

      <div className="toolbar-grid">
        <label>
          Search
          <input
            name="query"
            value={filters.query}
            onChange={onFilterChange}
            placeholder="PR number, title, department"
          />
        </label>
        <label>
          Stage
          <select name="stage" value={filters.stage} onChange={onFilterChange}>
            <option value="all">All stages</option>
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" value={filters.status} onChange={onFilterChange}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Priority
          <select name="priority" value={filters.priority} onChange={onFilterChange}>
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label>
          Requested from
          <input
            name="requestedFrom"
            type="date"
            value={filters.requestedFrom}
            onChange={onFilterChange}
          />
        </label>
        <label>
          Requested to
          <input
            name="requestedTo"
            type="date"
            value={filters.requestedTo}
            onChange={onFilterChange}
          />
        </label>
      </div>

      <div className="toolbar-actions">
        <button className="ghost-button" type="button" onClick={onExportCsv}>
          Export CSV
        </button>
        <button className="ghost-button" type="button" onClick={onExportPdf}>
          Export PDF
        </button>
        <button className="ghost-button" type="button" onClick={onResetFilters}>
          Reset filters
        </button>
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
          <p className="empty-state">No requests match the current filters.</p>
        ) : null}
      </div>
    </section>
  );
}
