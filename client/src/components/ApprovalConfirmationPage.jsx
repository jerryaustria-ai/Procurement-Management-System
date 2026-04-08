export default function ApprovalConfirmationPage({
  requestNumber,
  onHome,
}) {
  return (
    <section className="po-page approval-confirmation-page">
      <div className="approval-confirmation-card">
        <h1>Thank you!</h1>
        <p className="hero-copy">
          The request {requestNumber} has now been approved. You may now proceed to the RFP
          section of this workflow, or the Procurement Officer can proceed with creating the
          Purchase Order.
        </p>
        <div className="approval-confirmation-actions">
          <button className="po-primary-action" type="button" onClick={onHome}>
            Home
          </button>
        </div>
      </div>
    </section>
  )
}
