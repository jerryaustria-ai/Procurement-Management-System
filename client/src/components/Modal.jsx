import { useEffect, useRef } from "react";

export default function Modal({
  title,
  eyebrow,
  onClose,
  actions,
  children,
  isTopLayer = false
}) {
  const shellRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !shellRef.current) {
        return;
      }

      const focusableElements = shellRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!shellRef.current) {
      return;
    }

    const focusableElements = shellRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    if (firstElement instanceof HTMLElement) {
      firstElement.focus();
    }
  }, []);

  return (
    <div
      className={`modal-backdrop${isTopLayer ? " modal-backdrop-top-layer" : ""}`}
      role="presentation"
    >
      <div
        ref={shellRef}
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        aria-label={title || eyebrow || "Dialog"}
      >
        <div className="modal-header">
          {eyebrow || title ? (
            <div>
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              {title ? <h2>{title}</h2> : null}
            </div>
          ) : <div />}
          <div className="modal-actions">
            {actions}
            <button className="modal-close" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
