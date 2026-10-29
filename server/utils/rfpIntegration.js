import { serializePurchaseRequest } from "./serializers.js";

export const RFP_INTEGRATION_STATUSES = ["Approved", "Processed"];

function getRequestOrigin(req) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProtocol || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function toAbsoluteUrl(req, value) {
  const url = String(value || "").trim();
  if (!url || /^https?:\/\//i.test(url)) {
    return url;
  }

  return `${getRequestOrigin(req)}${url.startsWith("/") ? url : `/${url}`}`;
}

export function isApprovedOrProcessedRfp(request) {
  const status = String(request?.rfpDraft?.paymentStatus || "")
    .trim()
    .toLowerCase();

  return status === "approved" || status === "processed";
}

export function serializeRfpIntegrationRecord(request, req) {
  const serializedRequest = serializePurchaseRequest(request);
  const {
    documents = [],
    history: _history,
    allowedRoles: _allowedRoles,
    allowedRoleLabels: _allowedRoleLabels,
    ...formData
  } = serializedRequest;

  return {
    id: serializedRequest.id,
    requestNumber: serializedRequest.requestNumber,
    rfpNumber: serializedRequest.rfpNumber,
    paymentStatus: serializedRequest.rfpDraft?.paymentStatus || "",
    paymentStatusUpdatedAt:
      request.rfpDraft?.paymentStatusUpdatedAt || request.updatedAt,
    formData,
    attachments: documents.map((document) => {
      const downloadUrl = toAbsoluteUrl(req, document.filePath);
      const viewUrl = toAbsoluteUrl(
        req,
        document.googleDriveViewUrl || document.filePath
      );

      return {
        id: document.id,
        type: document.type,
        label: document.label,
        originalName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        storageProvider: document.storageProvider,
        uploadedBy: document.uploadedBy,
        uploadedByRole: document.uploadedByRole,
        uploadedAt: document.uploadedAt,
        url: viewUrl,
        viewUrl,
        downloadUrl
      };
    })
  };
}
