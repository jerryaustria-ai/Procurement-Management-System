import { useEffect, useRef, useState } from "react";
import ActionPanel from "./ActionPanel.jsx";
import RequestSummary from "./RequestSummary.jsx";

export default function RequestWorkspacePage({
  item,
  stages,
  user,
  actionForm,
  purchaseOrderForm,
  uploadForm,
  suppliers,
  onActionChange,
  onPurchaseOrderChange,
  onPurchaseOrderLineItemChange,
  onAddPurchaseOrderLineItem,
  onRemovePurchaseOrderLineItem,
  onPrintPurchaseOrder,
  onUploadFormChange,
  onUploadFileChange,
  onReviewAttachmentFileChange,
  onUpload,
  onCreateSupplier,
  onAdvance,
  onBack,
  isSubmitting,
  actionError,
  onDeleteDocument,
  canManageDocuments,
  uploadError,
  apiOrigin,
  onClose,
  onEditRequest,
  canEditRequest
}) {
  const stageActionsRef = useRef(null);
  const [isSummaryHidden, setIsSummaryHidden] = useState(user.role === "requester" ? false : true);

  useEffect(() => {
    if (user.role === "requester") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      stageActionsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [item.id, user.role]);

  return (
    <section className="po-page">
      {user.role === "requester" ? (
        <div className="po-page-actions requester-workspace-back">
          <button className="po-secondary-action request-workspace-back-button" type="button" onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M10 6 4 12l6 6M4 12h16"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            Back to dashboard
          </button>
        </div>
      ) : null}

      {user.role !== "requester" ? (
        <div className="po-page-header">
          <div>
            <p className="eyebrow">Request Workspace</p>
            <h1>{item.requestNumber}</h1>
            <p className="hero-copy">
              Review the request and continue the workflow from a focused page instead of a modal.
            </p>
          </div>
          <div className="po-page-header-actions">
            <button
              className="po-secondary-action request-workspace-back-button"
              type="button"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M10 6 4 12l6 6M4 12h16"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              Back to dashboard
            </button>
          </div>
        </div>
      ) : null}

      <div className="request-workspace-stack">
        <RequestSummary
          item={item}
          apiOrigin={apiOrigin}
          showExpand={false}
          isCollapsed={user.role === "requester" ? false : isSummaryHidden}
          onToggleVisibility={
            user.role === "requester"
              ? undefined
              : () => setIsSummaryHidden((current) => !current)
          }
        />

        {user.role !== "requester" ? (
          <div ref={stageActionsRef} className="request-workspace-review">
            <ActionPanel
              item={item}
              stages={stages}
              user={user}
              form={actionForm}
              purchaseOrderForm={purchaseOrderForm}
              uploadForm={uploadForm}
              suppliers={suppliers}
              onChange={onActionChange}
              onPurchaseOrderChange={onPurchaseOrderChange}
              onPurchaseOrderLineItemChange={onPurchaseOrderLineItemChange}
              onAddPurchaseOrderLineItem={onAddPurchaseOrderLineItem}
              onRemovePurchaseOrderLineItem={onRemovePurchaseOrderLineItem}
              onPrintPurchaseOrder={onPrintPurchaseOrder}
              onReviewAttachmentFileChange={onReviewAttachmentFileChange}
              onUpload={onUpload}
              onCreateSupplier={onCreateSupplier}
              onAdvance={onAdvance}
              onBack={onBack}
              isSubmitting={isSubmitting}
              error={actionError}
              showExpand={false}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
