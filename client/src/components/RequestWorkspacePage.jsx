import { useEffect, useRef } from "react";
import ActionPanel from "./ActionPanel.jsx";
import DocumentPanel from "./DocumentPanel.jsx";
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
      <div className="po-page-header">
        <div>
          <p className="eyebrow">Request Workspace</p>
          <h1>{item.requestNumber}</h1>
          <p className="hero-copy">
            Review the request and continue the workflow from a focused page instead of a modal.
          </p>
        </div>
        <div className="po-page-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Back to dashboard
          </button>
          {canEditRequest ? (
            <button className="ghost-button" type="button" onClick={onEditRequest}>
              Edit request
            </button>
          ) : null}
        </div>
      </div>

      <div className="request-workspace-stack">
        <RequestSummary item={item} apiOrigin={apiOrigin} showExpand={false} />

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

        <div className="po-page-grid">
          <DocumentPanel
            item={item}
            uploadForm={uploadForm}
            onUploadFormChange={onUploadFormChange}
            onFileChange={onUploadFileChange}
            onUpload={onUpload}
            onDelete={onDeleteDocument}
            canManage={canManageDocuments}
            isSubmitting={isSubmitting}
            error={uploadError}
            apiOrigin={apiOrigin}
            showExpand={false}
          />
        </div>
      </div>
    </section>
  );
}
