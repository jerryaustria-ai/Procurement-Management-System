import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onClose,
  isSubmitting
}) {
  return (
    <Modal eyebrow="Confirmation" title={title} onClose={onClose}>
      <section className="panel action-panel">
        <p className="confirm-copy">{message}</p>
        <div className="button-row">
          <button
            className={tone === "danger" ? "danger-button" : ""}
            disabled={isSubmitting}
            type="button"
            onClick={onConfirm}
          >
            {isSubmitting ? "Processing..." : confirmLabel}
          </button>
          <button className="ghost-button" disabled={isSubmitting} type="button" onClick={onClose}>
            {cancelLabel}
          </button>
        </div>
      </section>
    </Modal>
  );
}
