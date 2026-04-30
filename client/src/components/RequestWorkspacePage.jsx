import { useEffect, useRef, useState } from "react";
import ActionPanel from "./ActionPanel.jsx";
import RequestForPaymentPage from "./RequestForPaymentPage.jsx";
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
  onReviewPurchaseOrder,
  onUploadFormChange,
  onUploadFileChange,
  onReviewAttachmentFileChange,
  onClearReviewAttachment,
  onUpload,
  onCreateSupplier,
  onSupplierPick,
  onAdvance,
  onReject,
  onBack,
  requestForPaymentForm,
  requestForPaymentErrors,
  isRequestForPaymentEditing,
  canEditRequestForPayment,
  onRequestForPaymentChange,
  onRequestForPaymentInvoiceFilesSelected,
  onRequestForPaymentLiquidationFilesSelected,
  onRequestForPaymentRemovePendingInvoiceFile,
  onRequestForPaymentRemovePendingLiquidationFile,
  invoiceDocuments,
  liquidationDocuments,
  currentInvoiceDocument,
  currentLiquidationDocument,
  onRequestForPaymentOpenDocument,
  onRequestForPaymentDeleteInvoiceDocument,
  onRequestForPaymentDeleteLiquidationDocument,
  onRequestForPaymentSupplierSelect,
  onRequestForPaymentEdit,
  onRequestForPaymentCancel,
  onRequestForPaymentPrint,
  onRequestForPaymentSave,
  onRequestForPaymentSubmitForApproval,
  isSubmitting,
  actionError,
  onDeleteDocument,
  canManageDocuments,
  uploadError,
  apiOrigin,
  onOpenDocument,
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
          onViewDocument={onOpenDocument}
          isCollapsed={user.role === "requester" ? false : isSummaryHidden}
          onToggleVisibility={
            user.role === "requester"
              ? undefined
              : () => setIsSummaryHidden((current) => !current)
          }
        />

        {user.role !== "requester" ? (
          <div ref={stageActionsRef} className="request-workspace-review">
            {item.currentStage === "Request for Payment" ? (
              <RequestForPaymentPage
                item={item}
                form={requestForPaymentForm}
                errors={requestForPaymentErrors}
                suppliers={suppliers}
                invoiceDocuments={invoiceDocuments}
                liquidationDocuments={liquidationDocuments}
                currentInvoiceDocument={currentInvoiceDocument}
                currentLiquidationDocument={currentLiquidationDocument}
                embeddedInWorkspace
                isEditing={isRequestForPaymentEditing}
                canEdit={canEditRequestForPayment}
                onChange={onRequestForPaymentChange}
                onInvoiceFilesSelected={onRequestForPaymentInvoiceFilesSelected}
                onLiquidationFilesSelected={onRequestForPaymentLiquidationFilesSelected}
                onRemovePendingInvoiceFile={onRequestForPaymentRemovePendingInvoiceFile}
                onRemovePendingLiquidationFile={onRequestForPaymentRemovePendingLiquidationFile}
                onOpenDocument={onRequestForPaymentOpenDocument}
                onDeleteInvoiceDocument={onRequestForPaymentDeleteInvoiceDocument}
                onDeleteLiquidationDocument={onRequestForPaymentDeleteLiquidationDocument}
                onSelectSupplier={onRequestForPaymentSupplierSelect}
                onCreateSupplier={onCreateSupplier}
                canCreateSupplier={user.role === "admin"}
                canEditDueDate={user.role === "admin"}
                onEdit={onRequestForPaymentEdit}
                onCancel={onRequestForPaymentCancel}
                onPrint={onRequestForPaymentPrint}
                onSave={onRequestForPaymentSave}
                onSubmitForApproval={onRequestForPaymentSubmitForApproval}
                onClose={onClose}
                isSubmitting={isSubmitting}
              />
            ) : (
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
                onReviewPurchaseOrder={onReviewPurchaseOrder}
                onReviewAttachmentFileChange={onReviewAttachmentFileChange}
                onClearReviewAttachment={onClearReviewAttachment}
                onUpload={onUpload}
                onCreateSupplier={onCreateSupplier}
                onSupplierPick={onSupplierPick}
                onAdvance={onAdvance}
                onReject={onReject}
                onBack={onBack}
                isSubmitting={isSubmitting}
                error={actionError}
                showExpand={false}
              />
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
