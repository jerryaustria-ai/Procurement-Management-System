import { useEffect, useRef, useState } from "react";

const RFP_PAYMENT_STATUS_OPTIONS = [
  "Approved",
  "Processed",
  "Processing",
  "For Liquidation",
  "Liquidation Submitted",
  "Liquidation Reviewed",
  "Liquidated / Closed"
];

function getNormalizedRfpStatus(item) {
  const rawStatus = item?.rfpDraft?.paymentStatus;

  if (typeof rawStatus !== "string") {
    return "";
  }

  return rawStatus.trim();
}

function getDisplayRfpStatus(item, fallback = "") {
  const normalizedValue = getNormalizedRfpStatus(item).toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  if (normalizedValue === "paid") {
    return "For Liquidation";
  }

  return (
    RFP_PAYMENT_STATUS_OPTIONS.find(
      (status) => status.toLowerCase() === normalizedValue
    ) || getNormalizedRfpStatus(item)
  );
}

function getProcurementStatus(item) {
  if (item.status === "completed" || item.filingCompleted) {
    return "Current stage: Completed";
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
    return "Completed";
  }

  if (item.status === "rejected") {
    return "Rejected";
  }

  const currentStage = item.currentStage || "Not set";

  if (currentStage === "Request for Payment") {
    const rfpStatus = getDisplayRfpStatus(item, "Processing");
    return `${currentStage} - ${rfpStatus}`;
  }

  return currentStage;
}

function isPartiallyCompletedRequest(item) {
  return (
    item?.currentStage === "Request for Payment" &&
    getNormalizedRfpStatus(item).toLowerCase() === "processed" &&
    item.status !== "completed" &&
    !item.filingCompleted
  );
}

function getDisplayRequestNumber(item) {
  if (item?.category === "Request for Payment (RFP)") {
    return item.rfpNumber || item.requestNumber;
  }

  return item?.requestNumber;
}

function getDisplayRequestType(item) {
  const category = String(item?.category || "").trim();
  const displayNumber = String(getDisplayRequestNumber(item) || "").toUpperCase();

  if (category === "Request for Payment (RFP)" || displayNumber.startsWith("RFP-")) {
    return "Request for Payment";
  }

  if (category) {
    return category;
  }

  if (displayNumber.startsWith("RE-")) {
    return "Reimbursement";
  }

  if (displayNumber.startsWith("CA-")) {
    return "Cash Advance";
  }

  return "Purchase Request";
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
  onOpenSummary,
  onOpenWorkflow,
  onOpenDetails,
  onEdit,
  onDelete,
  onOpenAttachments,
  onExportCsv,
  canEditItem,
  canDeleteItem,
  canOpenItem,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pageSize, setPageSize] = useState(50);
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
              New Request
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
                <div className="panel-kebab-menu-separator" aria-hidden="true" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportCsv?.();
                  }}
                >
                  Download CSV
                </button>
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
        {paginatedItems.map((item) => {
          const displayRequestNumber = getDisplayRequestNumber(item);
          const displayRequestType = getDisplayRequestType(item);
          const hasAttachments = Array.isArray(item.documents) && item.documents.length > 0;
          const isPartiallyCompleted = isPartiallyCompletedRequest(item);

          return (
          <article
            key={item.id}
            className={`request-list-item ${item.isUrgent ? "urgent" : ""} ${isPartiallyCompleted ? "partially-completed" : ""} ${selectedId === item.id ? "selected" : ""} ${
              item.status === "completed" ? "completed" : ""
            } ${item.status === "rejected" ? "rejected" : ""
            }`}
          >
            {item.isUrgent ? (
              <span className="request-list-urgent-watermark" aria-hidden="true">
                URGENT
              </span>
            ) : null}
            <button
              className="request-card-select"
              type="button"
              onClick={() => {
                onSelect(item.id);
                onOpenSummary?.(item.id);
              }}
            >
              <div className="request-list-topline">
                <strong className="request-list-number">
                  {hasAttachments ? (
                    <span
                      className="request-attachment-indicator"
                      aria-label="Has attachments"
                      title="Has attachments"
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenAttachments?.(item);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          onOpenAttachments?.(item);
                        }
                      }}
                    >
                      📎
                    </span>
                  ) : null}
                  {displayRequestNumber}
                </strong>
                <small className="request-list-meta-line">{displayRequestType}</small>
              </div>
              <span className="request-list-title">{item.title}</span>
              <small>
                {[item.branch, item.department, item.propertyProject].filter(Boolean).join(' · ')}
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
                    aria-label={`Delete ${displayRequestNumber}`}
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
                {canOpenItem?.(item) ? (
                  <button className="request-open-link" type="button" onClick={() => onOpenDetails(item.id)}>
                    Open
                  </button>
                ) : null}
              </div>
            </div>
          </article>
          );
        })}
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
