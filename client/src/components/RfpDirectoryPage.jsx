export default function RfpDirectoryPage({
  items,
  onOpen,
  onPrint,
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

                return (
                  <tr key={record.id} className="supplier-row audit-trail-row">
                    <td>
                      <strong>{record.requestNumber}</strong>
                      <div className="audit-trail-cell-subtext">{record.title}</div>
                    </td>
                    <td>{record.rfpDraft?.payee || "Not set"}</td>
                    <td>{record.rfpDraft?.invoiceNumber || "Not set"}</td>
                    <td>{record.rfpDraft?.dueDate || "Not set"}</td>
                    <td>
                      <div className="table-action-row">
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => onOpen(record)}
                        >
                          Open
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => onPrint(record)}
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
