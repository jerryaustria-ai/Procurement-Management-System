import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";

function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function buildAuditRequests(items) {
  return items
    .map((item) => {
      const history = [...(item.history ?? [])]
        .map((entry, index) => ({
          id: `${item.id}-${index}-${entry.updatedAt}`,
          requestId: item.id,
          requestNumber: item.requestNumber,
          title: item.title,
          requester: item.requester,
          stage: entry.stage,
          status: entry.status,
          actor: entry.actor,
          actorRoleLabel: entry.actorRoleLabel,
          comment: entry.comment,
          updatedAt: entry.updatedAt
        }))
        .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

      const latestEntry = history[0] ?? null;

      return {
        id: item.id,
        requestNumber: item.requestNumber,
        title: item.title,
        requester: item.requester,
        currentStage: item.currentStage,
        status: item.status,
        entryCount: history.length,
        latestUpdatedAt: latestEntry?.updatedAt ?? item.requestedAt,
        latestActor: latestEntry?.actor ?? item.requester,
        latestComment: latestEntry?.comment ?? "No comment provided.",
        history
      };
    })
    .sort(
      (left, right) => new Date(right.latestUpdatedAt) - new Date(left.latestUpdatedAt)
    );
}

export default function AuditTrailPage({ items, onClose, embedded = false }) {
  const auditRequests = useMemo(() => buildAuditRequests(items), [items]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [auditRequests.length]);

  const totalPages = Math.max(1, Math.ceil(auditRequests.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRequests = auditRequests.slice(startIndex, startIndex + pageSize);

  const selectedRequest =
    auditRequests.find((request) => request.id === selectedRequestId) ?? null;

  const content = (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Records</p>
          <h2>Purchase request audit trail</h2>
        </div>
        <span className="panel-counter">{auditRequests.length} requests</span>
      </div>

      {auditRequests.length === 0 ? (
        <p className="empty-state">No audit trail entries available yet.</p>
      ) : (
        <div className="supplier-table audit-trail-table-wrap">
          <table className="supplier-table-grid audit-trail-table">
            <thead className="supplier-table-header">
              <tr>
                <th>Purchase Request</th>
                <th>Requester</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Entries</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((request) => (
                <tr key={request.id} className="supplier-row audit-trail-row">
                  <td>
                    <button
                      type="button"
                      className="audit-trail-link"
                      onClick={() => setSelectedRequestId(request.id)}
                    >
                      {request.requestNumber}
                    </button>
                    <div className="audit-trail-cell-subtext">{request.title}</div>
                  </td>
                  <td>{request.requester}</td>
                  <td>{request.currentStage}</td>
                  <td>{request.status}</td>
                  <td>
                    {formatDateTime(request.latestUpdatedAt)}
                    <div className="audit-trail-cell-subtext">
                      {request.latestActor}
                    </div>
                  </td>
                  <td>{request.entryCount}</td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button audit-trail-action"
                      onClick={() => setSelectedRequestId(request.id)}
                    >
                      View history
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {auditRequests.length ? (
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
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={safeCurrentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );

  return (
    <>
      {embedded ? (
        <div className="settings-embedded-page">{content}</div>
      ) : (
        <section className="po-page">
          <div className="po-page-header">
            <div>
              <p className="eyebrow">Audit Trail</p>
              <h1>Audit Trail</h1>
              <p className="hero-copy">
                Review audit history by purchase request, then open each record to see its
                complete timeline.
              </p>
            </div>
            <div className="po-page-actions">
              <button className="ghost-button" type="button" onClick={onClose}>
                Back to dashboard
              </button>
            </div>
          </div>
          {content}
        </section>
      )}

      {selectedRequest ? (
        <Modal
          eyebrow="Audit Trail"
          title={`${selectedRequest.requestNumber} history`}
          onClose={() => setSelectedRequestId("")}
        >
          <div className="modal-form audit-trail-modal-content">
            <div className="audit-trail-modal-meta">
              <div>
                <strong>{selectedRequest.title}</strong>
                <div className="audit-trail-cell-subtext">
                  Requester: {selectedRequest.requester}
                </div>
              </div>
              <span className="panel-counter">
                {selectedRequest.history.length} entries
              </span>
            </div>

            {selectedRequest.history.length === 0 ? (
              <p className="empty-state">No history entries available for this request.</p>
            ) : (
              <div className="supplier-table audit-trail-table-wrap">
                <table className="supplier-table-grid audit-trail-table">
                  <thead className="supplier-table-header">
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Stage</th>
                      <th>Status</th>
                      <th>Actor</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.history.map((entry) => (
                      <tr key={entry.id} className="supplier-row audit-trail-row">
                        <td>{formatDateTime(entry.updatedAt)}</td>
                        <td>{entry.stage}</td>
                        <td>{entry.status}</td>
                        <td>
                          {entry.actor}
                          <div className="audit-trail-cell-subtext">
                            {entry.actorRoleLabel}
                          </div>
                        </td>
                        <td>{entry.comment || "No comment provided."}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
