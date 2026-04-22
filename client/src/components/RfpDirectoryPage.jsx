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

export default function RfpDirectoryPage({
  items,
  onOpen,
  onPreview,
  onPrint,
  onUploadInvoice,
  embedded = false,
}) {
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
                    record.rfpDraft?.amountRequested ||
                    record.rfpDraft?.dueDate ||
                    record.rfpDraft?.notes,
                );

                const handlePreview = () => {
                  if (typeof onPreview === "function") {
                    onPreview(record);
                  }
                };

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
                        {record.rfpDraft?.invoiceNumber ? (
                          <span className="rfp-invoice-value">
                            {record.rfpDraft.invoiceNumber}
                          </span>
                        ) : null}
                        {typeof onUploadInvoice === "function" ? (
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
