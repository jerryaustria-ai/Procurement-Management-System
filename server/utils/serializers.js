import {
  getAllowedRoles,
  priorityLabels,
  roleLabels,
  stageDescriptions,
  workflowStages
} from "../config/workflow.js";

export function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: roleLabels[user.role] ?? user.role,
    department: user.department,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function serializePurchaseRequest(request) {
  return {
    id: request._id.toString(),
    requestNumber: request.requestNumber,
    title: request.title,
    description: request.description,
    category: request.category,
    department: request.department,
    requester: request.requesterName,
    requesterEmail: request.requesterEmail,
    amount: request.amount,
    currency: request.currency,
    priority: request.priority,
    priorityLabel: priorityLabels[request.priority],
    dateNeeded: request.dateNeeded,
    deliveryAddress: request.deliveryAddress,
    paymentTerms: request.paymentTerms,
    supplier: request.supplier,
    poNumber: request.poNumber,
    invoiceNumber: request.invoiceNumber,
    paymentReference: request.paymentReference,
    deliveryDate: request.deliveryDate,
    inspectionStatus: request.inspectionStatus,
    requestedAt: request.requestedAt,
    currentStage: request.currentStage,
    currentStageDescription: stageDescriptions[request.currentStage],
    status: request.status,
    notes: request.notes,
    progressIndex: workflowStages.indexOf(request.currentStage),
    allowedRoles: getAllowedRoles(request.currentStage),
    allowedRoleLabels: getAllowedRoles(request.currentStage).map((role) => roleLabels[role] ?? role),
    documents: (request.documents ?? []).map((document) => ({
      id: document._id.toString(),
      type: document.type,
      label: document.label,
      originalName: document.originalName,
      fileName: document.fileName,
      filePath: document.filePath,
      mimeType: document.mimeType,
      size: document.size,
      uploadedBy: document.uploadedBy,
      uploadedByRole: document.uploadedByRole,
      uploadedAt: document.uploadedAt
    })),
    history: request.history.map((entry) => ({
      ...entry.toObject(),
      actorRoleLabel: roleLabels[entry.actorRole] ?? entry.actorRole,
      updatedAt: entry.updatedAt
    }))
  };
}
