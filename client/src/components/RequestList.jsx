import { useEffect, useRef, useState } from "react";

function getProcurementStatus(item) {
  if (item.status === "completed" || item.filingCompleted) {
    return "Current stage: Complete";
  }

  if (!item.currentStage) {
    return "Current stage: Not set";
  }

  return `Current stage: ${item.currentStage}`;
}

export default function RequestList({
  items,
  selectedId,
  activeFilter = "all",
  onFilterChange,
  onSelect,
  onOpenWorkflow,
  onOpenDetails,
  onEdit,
  canEditItem,
  onExportCsv,
  onExportPdf,
  onExpand,
  showExpand = true
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  return (
    <section className="panel request-list-panel panel-with-expand">
      <div className="panel-top-actions" ref={menuRef}>
        <div className="request-list-tools request-list-tools-top">
          <span className="panel-counter">{items.length} total</span>
          <label className="request-list-filter-select">
            <span className="sr-only">Filter requests</span>
            <select
              value={activeFilter}
              onChange={(event) => onFilterChange?.(event.target.value)}
              aria-label="Filter requests"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          {activeFilter !== "all" ? (
            <span className="panel-counter">Filtered: {activeFilter}</span>
          ) : null}
        </div>
        <div className="panel-kebab-wrap">
          <button
            className="panel-kebab-button"
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="More request actions"
            title="More actions"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" fill="currentColor" />
              <circle cx="12" cy="12" r="1.8" fill="currentColor" />
              <circle cx="19" cy="12" r="1.8" fill="currentColor" />
            </svg>
          </button>
          {isMenuOpen ? (
            <div className="panel-kebab-menu" role="menu" aria-label="Request registry actions">
              {showExpand && onExpand ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExpand();
                  }}
                >
                  Expand view
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportCsv?.();
                }}
              >
                Export CSV
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportPdf?.();
                }}
              >
                Export PDF
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="panel-heading request-list-heading">
        <div>
          <p className="eyebrow">Requests</p>
          <h2>Request Registry</h2>
        </div>
      </div>

      <div className="request-list">
        {paginatedItems.map((item) => (
          <article
            key={item.id}
            className={`request-list-item ${selectedId === item.id ? "selected" : ""} ${
              item.status === "completed" ? "completed" : ""
            }`}
          >
            <button className="request-card-select" type="button" onClick={() => onSelect(item.id)}>
              <div className="request-list-topline">
                <strong>{item.requestNumber}</strong>
              </div>
              <span>{item.title}</span>
              <small>
                {item.branch} · {item.department}
              </small>
              <small>Requester: {item.requester}</small>
            </button>
            <div className="request-list-footer">
              <div className="request-status-group">
                <small>{getProcurementStatus(item)}</small>
                <button
                  className="request-open-link request-workflow-link"
                  type="button"
                  onClick={() => onOpenWorkflow?.(item.id)}
                >
                  View workflow
                </button>
              </div>
              <div className="request-list-actions-inline">
                {canEditItem?.(item) ? (
                  <button className="request-open-link" type="button" onClick={() => onEdit(item.id)}>
                    Edit
                  </button>
                ) : null}
                <button className="request-open-link" type="button" onClick={() => onOpenDetails(item.id)}>
                  Open
                </button>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 ? (
          <p className="empty-state">No requests available.</p>
        ) : null}
      </div>

      {items.length && totalPages > 1 ? (
        <div className="request-list-pagination">
          <div className="request-list-pagination-meta">
            <label className="request-list-limit">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
            <span className="panel-counter">
              Page {safeCurrentPage} of {totalPages}
            </span>
          </div>
          <div className="request-list-pagination-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
            >
              Previous
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
