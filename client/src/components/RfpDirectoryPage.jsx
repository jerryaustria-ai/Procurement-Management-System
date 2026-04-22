import { useEffect, useState } from 'react'

function getDisplayPayee(record) {
  const requestedPayeeSupplier = String(
    record?.requestedPayeeSupplier || "",
  ).trim();
  const savedPayee = String(record?.rfpDraft?.payee || "").trim();
  const currentSupplier = String(
    record?.supplier === "Pending selection" ? "" : record?.supplier || "",
  ).trim();
  const hasOriginalPayeeSupplier = Boolean(requestedPayeeSupplier);
  const shouldReplaceLegacySupplierPayee =
    !hasOriginalPayeeSupplier &&
    savedPayee &&
    currentSupplier &&
    currentSupplier !== "Pending selection" &&
    savedPayee.toLowerCase() === currentSupplier.toLowerCase();

  if (requestedPayeeSupplier) {
    return requestedPayeeSupplier;
  }

  if (currentSupplier && (!savedPayee || shouldReplaceLegacySupplierPayee)) {
    return currentSupplier;
  }

  if (!savedPayee || shouldReplaceLegacySupplierPayee) {
    return String(record?.requester || record?.requesterName || "Not set").trim() || "Not set";
  }

  return savedPayee;
}

function getCurrentInvoiceDocument(record) {
  const invoiceDocuments = (record?.documents || []).filter(
    (document) => document.type === "invoice",
  );

  return invoiceDocuments[invoiceDocuments.length - 1] || null;
}

export default function RfpDirectoryPage({
  items,
  onOpen,
  onPreview,
  onPrint,
  onUploadInvoice,
  onSavePaymentStatus,
  embedded = false,
}) {
  const [pendingStatuses, setPendingStatuses] = useState({})
  const [savingRecordId, setSavingRecordId] = useState('')

  useEffect(() => {
    setPendingStatuses((current) => {
      const next = {}

      items.forEach((record) => {
        const recordId = String(record.id || '')
        const currentPaymentStatus = String(
          record?.rfpDraft?.paymentStatus || '',
        ).trim()

        next[recordId] =
          Object.prototype.hasOwnProperty.call(current, recordId)
            ? current[recordId]
            : currentPaymentStatus
      })

      return next
    })
  }, [items])

  const content = (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Request for Payment</p>
          <h2>RFP records</h2>
        </div>
        <span className="panel-counter">
          {items.length} {items.length === 1 ? "record" : "records"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="empty-state">No RFP-enabled requests available.</p>
      ) : (
        <div className="supplier-table audit-trail-table-wrap">
          <table className="supplier-table-grid audit-trail-table">
            <thead className="supplier-table-header">
              <tr>
                <th>Request</th>
                <th>Payee / Supplier</th>
                <th>Invoice</th>
                <th>Due date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((record) => {
                const hasSavedRfpDraft = Boolean(
                  record.rfpDraft?.payee ||
                    record.rfpDraft?.tinNumber ||
                    record.rfpDraft?.invoiceNumber ||
                    record.rfpDraft?.paymentStatus ||
                    record.rfpDraft?.amountRequested ||
                    record.rfpDraft?.dueDate ||
                    record.rfpDraft?.notes,
                );
                const currentInvoiceDocument = getCurrentInvoiceDocument(record);
                const hasInvoice =
                  Boolean(record.rfpDraft?.invoiceNumber) &&
                  Boolean(currentInvoiceDocument);
                const recordId = String(record.id || '')
                const currentPaymentStatus = String(
                  record?.rfpDraft?.paymentStatus || '',
                ).trim()
                const selectedPaymentStatus = Object.prototype.hasOwnProperty.call(
                  pendingStatuses,
                  recordId,
                )
                  ? pendingStatuses[recordId]
                  : currentPaymentStatus
                const hasPaymentStatusChange =
                  Boolean(selectedPaymentStatus) &&
                  selectedPaymentStatus !== currentPaymentStatus

                const handlePreview = () => {
                  if (typeof onPreview === "function") {
                    onPreview(record);
                  }
                };

                const handleSavePaymentStatus = async (event) => {
                  event.stopPropagation()

                  if (
                    typeof onSavePaymentStatus !== 'function' ||
                    !hasPaymentStatusChange
                  ) {
                    return
                  }

                  setSavingRecordId(recordId)

                  try {
                    await onSavePaymentStatus(record, selectedPaymentStatus)
                    setPendingStatuses((current) => ({
                      ...current,
                      [recordId]: selectedPaymentStatus,
                    }))
                  } finally {
                    setSavingRecordId('')
                  }
                }

                return (
                  <tr
                    key={record.id}
                    className="supplier-row audit-trail-row"
                    onClick={handlePreview}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handlePreview();
                      }
                    }}
                    tabIndex={0}
                  >
                    <td>
                      <strong>{record.requestNumber}</strong>
                      <div className="audit-trail-cell-subtext">{record.title}</div>
                    </td>
                    <td>{getDisplayPayee(record)}</td>
                    <td>
                      <div className="rfp-invoice-cell">
                        {hasInvoice && typeof onUploadInvoice === "function" ? (
                          <button
                            className="audit-trail-link rfp-invoice-link"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onUploadInvoice(record);
                            }}
                          >
                            {record.rfpDraft.invoiceNumber}
                          </button>
                        ) : record.rfpDraft?.invoiceNumber ? (
                          <span className="rfp-invoice-value">
                            {record.rfpDraft.invoiceNumber}
                          </span>
                        ) : null}
                        {!hasInvoice && typeof onUploadInvoice === "function" ? (
                          <button
                            className="audit-trail-link rfp-invoice-link"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onUploadInvoice(record);
                            }}
                          >
                            Upload the Invoice
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td>{record.rfpDraft?.dueDate || "Not set"}</td>
                    <td>
                      {typeof onSavePaymentStatus === 'function' ? (
                        <div className="rfp-status-action">
                          <select
                            className="rfp-status-select"
                            value={selectedPaymentStatus}
                            onClick={(event) => {
                              event.stopPropagation()
                            }}
                            onChange={(event) => {
                              event.stopPropagation()
                              setPendingStatuses((current) => ({
                                ...current,
                                [recordId]: event.target.value,
                              }))
                            }}
                          >
                            <option value="">Select status</option>
                            <option value="Processing">Processing</option>
                            <option value="Paid">Paid</option>
                            <option value="Hold">Hold</option>
                            <option value="Decline">Decline</option>
                          </select>
                          {hasPaymentStatusChange ? (
                            <button
                              className="ghost-button"
                              type="button"
                              onClick={handleSavePaymentStatus}
                              disabled={savingRecordId === recordId}
                            >
                              {savingRecordId === recordId ? 'Saving...' : 'Save'}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="table-action-row">
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpen(record);
                            }}
                          >
                            Open
                          </button>
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onPrint(record);
                            }}
                            disabled={!hasSavedRfpDraft}
                          >
                            Print
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  if (embedded) {
    return <div className="settings-embedded-page">{content}</div>;
  }

  return content;
}
