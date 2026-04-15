import { useEffect, useRef, useState } from "react";

function getProcurementStatus(item) {
  if (item.status === "completed" || item.filingCompleted) {
    return "Current stage: Complete";
  }

  if (item.status === "rejected") {
    return "Current stage: Rejected";
  }

  if (!item.currentStage) {
    return "Current stage: Not set";
  }

  return `Current stage: ${item.currentStage}`;
}

function getProcurementStageValue(item) {
  if (item.status === "completed" || item.filingCompleted) {
    return "Complete";
  }

  if (item.status === "rejected") {
    return "Rejected";
  }

  return item.currentStage || "Not set";
}

function hasActiveRfp(item) {
  return (
    Boolean(item.requestForPaymentEnabled) &&
    !["completed", "rejected"].includes(item.status) &&
    !item.filingCompleted
  );
}

function handleRfpBadgeKeyDown(event, item, onOpenRequestForPayment) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.stopPropagation();
    onOpenRequestForPayment?.(item);
  }
}

export default function RequestList({
  items,
  selectedId,
  activeFilter = "all",
  viewMode = "list",
  onViewModeChange,
  onFilterChange,
  searchQuery = "",
  onSearchChange,
  onCreateNew,
  canCreateNew = false,
  onSelect,
  onOpenWorkflow,
  onOpenDetails,
  onOpenRequestForPayment,
  onEdit,
  onDelete,
  canEditItem,
  canDeleteItem,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
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
      <div className="request-list-toolbar" ref={menuRef}>
        <div className="request-list-toolbar-left">
          <label className="request-list-search">
            <span className="sr-only">Search requests</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search requests"
              aria-label="Search requests"
            />
          </label>
          <label className="request-list-filter-select request-list-filter-select-inline">
            <span className="sr-only">Filter requests</span>
            <select
              value={activeFilter}
              onChange={(event) => onFilterChange?.(event.target.value)}
              aria-label="Filter requests"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>
        <div className="panel-top-actions">
          <div className="request-list-tools request-list-tools-top">
          <span className="panel-counter">{items.length} total</span>
          {canCreateNew ? (
            <button
              className="request-list-create-button"
              type="button"
              onClick={onCreateNew}
            >
              New purchase request
            </button>
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
                <div className="panel-kebab-menu-group">
                  <span className="panel-kebab-menu-label">Layout view</span>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === "list"}
                    className={viewMode === "list" ? "is-active" : ""}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onViewModeChange?.("list");
                    }}
                  >
                    List View
                  </button>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === "grid"}
                    className={viewMode === "grid" ? "is-active" : ""}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onViewModeChange?.("grid");
                    }}
                  >
                    Grid View
                  </button>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === "card"}
                    className={viewMode === "card" ? "is-active" : ""}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onViewModeChange?.("card");
                    }}
                  >
                    Card View
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="panel-heading request-list-heading">
        <div>
          <p className="eyebrow">Requests</p>
          <h2>Request Registry</h2>
        </div>
      </div>

      <div className={`request-list request-list--${viewMode}`}>
        {paginatedItems.map((item) => (
          <article
            key={item.id}
            className={`request-list-item ${selectedId === item.id ? "selected" : ""} ${
              item.status === "completed" ? "completed" : ""
            } ${item.status === "rejected" ? "rejected" : ""
            }`}
          >
            <button className="request-card-select" type="button" onClick={() => onSelect(item.id)}>
              <div className="request-list-topline">
                <strong>{item.requestNumber}</strong>
                {hasActiveRfp(item) ? (
                  <span
                    className="rfp-badge rfp-badge-link"
                    role="button"
                    tabIndex={0}
                    aria-label="Open Request for Payment"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenRequestForPayment?.(item);
                    }}
                    onKeyDown={(event) =>
                      handleRfpBadgeKeyDown(event, item, onOpenRequestForPayment)
                    }
                  >
                    RFP Enabled
                  </span>
                ) : null}
              </div>
              <span className="request-list-title">{item.title}</span>
              <small>
                {item.branch} · {item.department}
              </small>
              <small className="request-list-meta-line">
                <span>Requester:</span>{" "}
                <span className="request-list-requester-name">{item.requester}</span>
              </small>
            </button>
            <div className="request-list-footer">
              <div className="request-status-group">
                <small className="request-list-meta-line">
                  <span>Current stage:</span>{" "}
                  <button
                    className={`request-list-stage-link request-list-stage-value ${
                      getProcurementStageValue(item) === "Purchase Request" ? "is-purchase-request" : ""
                    }`}
                    type="button"
                    onClick={() => onOpenWorkflow?.(item.id)}
                  >
                    {getProcurementStageValue(item)}
                  </button>
                </small>
              </div>
              <div className="request-list-actions-inline">
                {canDeleteItem?.(item) ? (
                  <button
                    className="request-open-link danger-link"
                    type="button"
                    onClick={() => onDelete?.(item.id)}
                    aria-label={`Delete ${item.requestNumber}`}
                    title="Delete request"
                  >
                    Delete
                  </button>
                ) : null}
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

      {items.length ? (
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
                aria-label="Requests per page"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
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
